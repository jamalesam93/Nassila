import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { alignMetadata, resolveRegistry } from '../engine/manuscript/verify'
import {
  ManuscriptAuditInputError,
  runManuscriptAudit,
  type ManuscriptAuditServices
} from '../engine/manuscript/audit-runner'
import {
  AuditTrailRecorder,
  bundleSharhProvenance,
  withAuditTrail
} from '../engine/manuscript/audit-trail'
import { mergePriorRuns } from '../engine/manuscript/prior-runs'
import type { AuditReport, AuditRunProvenance } from '../engine/manuscript/types'
import {
  MANUSCRIPT_AUDIT_CANCEL_CHANNEL,
  MANUSCRIPT_AUDIT_PROGRESS_CHANNEL,
  MANUSCRIPT_AUDIT_START_CHANNEL,
  MANUSCRIPT_AUDIT_TRAIL_EXPORT_CHANNEL,
  MANUSCRIPT_AUDIT_TRAIL_READ_CHANNEL,
  isValidAuditRunId,
  sanitizeAuditTrailExportRequest,
  sanitizeManuscriptAuditStartRequest,
  type ManuscriptAuditProgressEvent
} from '../shared/manuscript-audit-contract'
import { executeLlmChat, isLlmEncryptionAvailable } from './ipc-llm'
import { requestEuropePmcJats, requestOaUrl, requestUnpaywall } from './ipc-oa'
import {
  loadSourceArtifact,
  sourceArtifactCacheDirectory
} from '../engine/manuscript/source-artifact-cache'

function auditTrailDirectory(): string {
  return join(app.getPath('userData'), 'audit-trails')
}

const MAX_PERSISTED_PROVENANCE = 50

function provenanceDirectory(): string {
  return join(app.getPath('userData'), 'manuscript-audit-provenance')
}

/** Newest-first persisted prior runs (bounded), for cross-session L2 context. */
function readPersistedProvenance(): AuditRunProvenance[] {
  const dir = provenanceDirectory()
  if (!existsSync(dir)) return []
  const runs: (AuditRunProvenance & { file: string; mtime: number })[] = []
  for (const name of readdirSync(dir)) {
    if (!name.startsWith('provenance-') || !name.endsWith('.json')) continue
    const file = join(dir, name)
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>
      const { generatedAt, appVersion, promptContractVersion, bibKeyFilter } = parsed
      if (
        typeof generatedAt !== 'string' ||
        typeof appVersion !== 'string' ||
        typeof promptContractVersion !== 'string'
      ) continue
      runs.push({
        generatedAt,
        appVersion,
        promptContractVersion,
        ...(typeof bibKeyFilter === 'string' ? { bibKeyFilter } : {}),
        file,
        mtime: statSync(file).mtimeMs
      })
    } catch {
      // skip malformed provenance files
    }
  }
  runs.sort((a, b) => b.mtime - a.mtime)
  return runs
    .slice(0, MAX_PERSISTED_PROVENANCE)
    .map((run) => ({
      generatedAt: run.generatedAt,
      appVersion: run.appVersion,
      promptContractVersion: run.promptContractVersion,
      ...(run.bibKeyFilter !== undefined ? { bibKeyFilter: run.bibKeyFilter } : {})
    }))
}

function persistProvenance(
  runId: string,
  report: AuditReport,
  bibKeyFilter?: string
): void {
  try {
    const dir = provenanceDirectory()
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, `provenance-${runId}.json`),
      JSON.stringify(
        {
          runId,
          generatedAt: report.generatedAt,
          appVersion: report.appVersion,
          promptContractVersion: report.promptContractVersion,
          ...(bibKeyFilter !== undefined ? { bibKeyFilter } : {})
        },
        null,
        2
      ),
      'utf-8'
    )
    const names = readdirSync(dir)
      .filter((name) => name.startsWith('provenance-') && name.endsWith('.json'))
      .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
    for (const stale of names.slice(MAX_PERSISTED_PROVENANCE)) {
      rmSync(join(dir, stale.name), { force: true })
    }
  } catch (error) {
    console.warn('Failed to persist audit provenance', error)
  }
}

function readAuditTrailFile(runId: string): string | null {
  const filePath = join(auditTrailDirectory(), `trail-${runId}.ndjson`)
  if (!existsSync(filePath)) return null
  return readFileSync(filePath, 'utf-8')
}

interface ActiveRun {
  ownerId: number
  controller: AbortController
}

export class AuditRunControllers {
  private readonly runs = new Map<string, ActiveRun>()
  private readonly activeByOwner = new Map<number, string>()

  start(runId: string, ownerId: number): AbortController {
    const previousRunId = this.activeByOwner.get(ownerId)
    if (previousRunId) this.cancel(previousRunId, ownerId)
    const existing = this.runs.get(runId)
    if (existing) existing.controller.abort()

    const controller = new AbortController()
    this.runs.set(runId, { ownerId, controller })
    this.activeByOwner.set(ownerId, runId)
    return controller
  }

  cancel(runId: string, ownerId?: number): boolean {
    const active = this.runs.get(runId)
    if (!active || (ownerId !== undefined && active.ownerId !== ownerId)) return false
    active.controller.abort()
    this.runs.delete(runId)
    if (this.activeByOwner.get(active.ownerId) === runId) {
      this.activeByOwner.delete(active.ownerId)
    }
    return true
  }

  isCurrent(runId: string, ownerId: number, controller: AbortController): boolean {
    const active = this.runs.get(runId)
    return Boolean(
      active &&
      active.ownerId === ownerId &&
      active.controller === controller &&
      this.activeByOwner.get(ownerId) === runId &&
      !controller.signal.aborted
    )
  }

  finish(runId: string, ownerId: number, controller: AbortController): void {
    if (!this.isCurrent(runId, ownerId, controller)) return
    this.runs.delete(runId)
    this.activeByOwner.delete(ownerId)
  }
}

export function registerManuscriptAuditIpcHandlers(
  controllers = new AuditRunControllers()
): void {
  ipcMain.handle(MANUSCRIPT_AUDIT_START_CHANNEL, async (event, rawRequest: unknown) => {
    const request = sanitizeManuscriptAuditStartRequest(rawRequest)
    if (!request) throw new Error('Invalid manuscript audit request')

    const ownerId = event.sender.id
    const controller = controllers.start(request.runId, ownerId)
    const recorder = new AuditTrailRecorder(request.runId)
    const send = (progress: ManuscriptAuditProgressEvent): void => {
      if (controllers.isCurrent(request.runId, ownerId, controller)) {
        event.sender.send(MANUSCRIPT_AUDIT_PROGRESS_CHANNEL, progress)
      }
    }

    const baseServices: ManuscriptAuditServices = {
      appVersion: app.getVersion(),
      resolveRegistry,
      alignMetadata,
      europePmcJats: (pmcid, signal) => requestEuropePmcJats(pmcid, signal),
      unpaywall: (doi, email, signal) => requestUnpaywall(doi, email, signal),
      fetchOaUrl: (url, signal) => requestOaUrl(url, signal),
      encryptionAvailable: isLlmEncryptionAvailable,
      llmChat: (config, messages, signal) => executeLlmChat(config, messages, signal),
      loadSourceArtifact: (artifact) =>
        loadSourceArtifact(artifact, sourceArtifactCacheDirectory(app.getPath('userData')))
    }
    const services = withAuditTrail(baseServices, recorder, request.runId)

    try {
      const persisted = readPersistedProvenance()
      const mergedPriorRuns = mergePriorRuns(request.priorRuns, persisted)
      const runRequest =
        mergedPriorRuns.length > 0 ? { ...request, priorRuns: mergedPriorRuns } : request

      const report = await runManuscriptAudit(runRequest, services, {
        signal: controller.signal,
        onProgress: send,
        recorder
      })
      persistProvenance(runRequest.runId, report, runRequest.bibKeyFilter)
      try {
        mkdirSync(auditTrailDirectory(), { recursive: true })
        writeFileSync(join(auditTrailDirectory(), `trail-${request.runId}.ndjson`), recorder.toNdjson(), 'utf-8')
      } catch (error) {
        console.warn('Failed to persist audit trail', error)
      }
      send({
        runId: request.runId,
        kind: 'completed',
        report,
        bibKeyFilter: request.bibKeyFilter
      })
      return report
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        if (controllers.isCurrent(request.runId, ownerId, controller)) {
          send({ runId: request.runId, kind: 'cancelled' })
        }
        return null
      }
      const message = error instanceof ManuscriptAuditInputError
        ? error.code
        : error instanceof Error
          ? error.message
          : String(error)
      send({ runId: request.runId, kind: 'failed', message })
      throw error
    } finally {
      controllers.finish(request.runId, ownerId, controller)
    }
  })

  ipcMain.handle(MANUSCRIPT_AUDIT_CANCEL_CHANNEL, (event, rawRunId: unknown) => {
    if (!isValidAuditRunId(rawRunId)) return false
    const cancelled = controllers.cancel(rawRunId, event.sender.id)
    if (cancelled) {
      event.sender.send(MANUSCRIPT_AUDIT_PROGRESS_CHANNEL, {
        runId: rawRunId,
        kind: 'cancelled'
      } satisfies ManuscriptAuditProgressEvent)
    }
    return cancelled
  })

  ipcMain.handle(MANUSCRIPT_AUDIT_TRAIL_READ_CHANNEL, (_event, rawRunId: unknown) => {
    if (!isValidAuditRunId(rawRunId)) return null
    return readAuditTrailFile(rawRunId)
  })

  ipcMain.handle(MANUSCRIPT_AUDIT_TRAIL_EXPORT_CHANNEL, async (event, raw: unknown) => {
    const exportRequest = sanitizeAuditTrailExportRequest(raw)
    if (!exportRequest) throw new Error('Invalid audit trail export request')
    const trailNdjson = readAuditTrailFile(exportRequest.runId)
    if (trailNdjson === null) return null

    const files = bundleSharhProvenance(trailNdjson, JSON.stringify(exportRequest.report, null, 2))
    const options: OpenDialogOptions = {
      title: 'Export provenance bundle',
      properties: ['openDirectory', 'createDirectory']
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    const targetDir = result.filePaths[0]
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(targetDir, name), content, 'utf-8')
    }
    return targetDir
  })
}
