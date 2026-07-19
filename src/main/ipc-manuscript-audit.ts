import { app, ipcMain } from 'electron'
import { alignMetadata, resolveRegistry } from '../engine/manuscript/verify'
import {
  ManuscriptAuditInputError,
  runManuscriptAudit,
  type ManuscriptAuditServices
} from '../engine/manuscript/audit-runner'
import {
  MANUSCRIPT_AUDIT_CANCEL_CHANNEL,
  MANUSCRIPT_AUDIT_PROGRESS_CHANNEL,
  MANUSCRIPT_AUDIT_START_CHANNEL,
  isValidAuditRunId,
  sanitizeManuscriptAuditStartRequest,
  type ManuscriptAuditProgressEvent
} from '../shared/manuscript-audit-contract'
import { executeLlmChat, isLlmEncryptionAvailable } from './ipc-llm'
import { requestEuropePmcJats, requestOaUrl, requestUnpaywall } from './ipc-oa'
import {
  loadSourceArtifact,
  sourceArtifactCacheDirectory
} from '../engine/manuscript/source-artifact-cache'

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
    const send = (progress: ManuscriptAuditProgressEvent): void => {
      if (controllers.isCurrent(request.runId, ownerId, controller)) {
        event.sender.send(MANUSCRIPT_AUDIT_PROGRESS_CHANNEL, progress)
      }
    }

    const services: ManuscriptAuditServices = {
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

    try {
      const report = await runManuscriptAudit(request, services, {
        signal: controller.signal,
        onProgress: send
      })
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
}
