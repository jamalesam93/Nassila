import { createHash } from 'node:crypto'
import type { CslItem } from '../types'
import type { CitationFinding } from './types'
import type { ManuscriptAuditServices } from './audit-runner'

/**
 * Versioned audit trail for the Ouroboros manuscript loop (numbat-derived
 * event model): every registry/source/LLM call is an `event`, every citation
 * finding is a `finding` referencing its events, and user actions/exports are
 * `decision`s. Records are NDJSON on disk (userData/audit-trails) and can be
 * bundled for Sharh submission provenance. Redaction rule: LLM payloads are
 * truncated to 2400 chars with a sha256 of the full payload — complete
 * transcripts are never stored by default.
 */

export const AUDIT_TRAIL_SCHEMA_VERSION = '0.1.0'

export type AuditTrailSourceType =
  | 'registry'
  | 'metadata'
  | 'europe_pmc'
  | 'unpaywall'
  | 'oa_fetch'
  | 'llm'
  | 'source_artifact'

export interface AuditTrailEvent {
  recordType: 'event'
  schemaVersion: string
  runId: string
  sessionId: string
  sourceType: AuditTrailSourceType
  eventId: string
  timestamp: string
  identity: string
  status: 'ok' | 'error' | 'blocked'
  payload?: string
  payloadSha256?: string
  message?: string
}

export interface AuditTrailFinding {
  recordType: 'finding'
  schemaVersion: string
  runId: string
  sessionId: string
  timestamp: string
  bibKey: string
  eventIds: string[]
  referenceIntegrityRisk: CitationFinding['referenceIntegrityRisk']
  l1Status: string
  l2Status: string
  passageStatus: string
  l3Coverage: CitationFinding['l3Coverage']
}

export interface AuditTrailDecision {
  recordType: 'decision'
  schemaVersion: string
  runId: string
  sessionId: string
  timestamp: string
  kind: 'user_action' | 'audit_completed' | 'export'
  bibKey?: string
  detail?: string
}

export type AuditTrailRecord = AuditTrailEvent | AuditTrailFinding | AuditTrailDecision

const MAX_TRAIL_RECORDS = 10_000

/** Bounded in-memory trail recorder; serialize to NDJSON for disk. */
export class AuditTrailRecorder {
  private readonly records: AuditTrailRecord[] = []

  constructor(public readonly sessionId: string) {}

  record(record: AuditTrailRecord): boolean {
    if (this.records.length >= MAX_TRAIL_RECORDS) return false
    this.records.push(record)
    return true
  }

  get length(): number {
    return this.records.length
  }

  toNdjson(): string {
    return this.records.map((record) => JSON.stringify(record)).join('\n') + '\n'
  }
}

/** Deterministic event id for a source type + identity, so findings can reference events. */
export function eventIdFor(sourceType: AuditTrailSourceType, identity: string): string {
  return `evt-${sourceType}-${sha256Hex(identity).slice(0, 16)}`
}

/** Stable call identity for a CslItem: DOI, then PMCID, then title, then id. */
export function identityForItem(item: CslItem | undefined): string {
  if (!item) return ''
  return item.DOI?.trim() || item.PMCID?.trim() || item.title?.trim() || item.id
}

export interface LlmCallConfig {
  presetId: string
  baseUrl: string
  model: string
}

/** Stable call identity for LLM grounding invocations. */
export function llmConfigIdentity(config: LlmCallConfig): string {
  return `${config.model}|${config.presetId}|${config.baseUrl}`
}

/** Truncated (2400 chars) + sha256 of the full payload. Never the full transcript. */
export function redactLlmPayload(messages: { role: string; content: string }[]): {
  payload: string
  sha256: string
} {
  const full = JSON.stringify(messages)
  const sha256 = sha256Hex(full)
  const flattened = messages.map((message) => `${message.role}:${message.content}`).join('\n')
  const payload = flattened.length > 2400 ? `${flattened.slice(0, 2400)}…` : flattened
  return { payload, sha256 }
}

export interface TrailFindingInput {
  runId: string
  sessionId: string
  timestamp: string
  finding: CitationFinding
  item?: CslItem
  llmEnabled: boolean
  llm: LlmCallConfig
  online: boolean
  attachedSourcePath?: string
}

/** Build a finding record whose eventIds reference the deterministic events for this entry. */
export function buildTrailFinding(input: TrailFindingInput): AuditTrailFinding {
  const eventIds: string[] = []
  const identity = identityForItem(input.item)
  if (identity && input.online) {
    eventIds.push(eventIdFor('registry', identity))
    eventIds.push(eventIdFor('metadata', identity))
    if (input.item?.PMCID) eventIds.push(eventIdFor('europe_pmc', input.item.PMCID))
    if (input.item?.DOI) eventIds.push(eventIdFor('unpaywall', input.item.DOI))
  }
  if (input.attachedSourcePath) {
    eventIds.push(eventIdFor('source_artifact', input.attachedSourcePath))
  }
  if (input.llmEnabled) {
    eventIds.push(eventIdFor('llm', llmConfigIdentity(input.llm)))
  }

  const finding = input.finding
  return {
    recordType: 'finding',
    schemaVersion: AUDIT_TRAIL_SCHEMA_VERSION,
    runId: input.runId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    bibKey: finding.bibKey,
    eventIds: [...new Set(eventIds)],
    referenceIntegrityRisk: finding.referenceIntegrityRisk,
    l1Status: finding.layers.registry.status,
    l2Status: finding.layers.metadata.status,
    passageStatus: finding.layers.passage.status,
    l3Coverage: finding.l3Coverage
  }
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function makeEvent(
  recorder: AuditTrailRecorder,
  runId: string,
  sourceType: AuditTrailSourceType,
  identity: string,
  status: AuditTrailEvent['status'],
  extra?: { payload?: string; payloadSha256?: string; message?: string }
): void {
  recorder.record({
    recordType: 'event',
    schemaVersion: AUDIT_TRAIL_SCHEMA_VERSION,
    runId,
    sessionId: recorder.sessionId,
    sourceType,
    eventId: eventIdFor(sourceType, identity),
    timestamp: new Date().toISOString(),
    identity,
    status,
    ...extra
  })
}

/**
 * Wrap the injected audit services so every registry/source/LLM call emits an
 * `event` record. Errors are recorded and rethrown; blocked OA fetches are
 * recorded as `blocked`.
 */
export function withAuditTrail(
  services: ManuscriptAuditServices,
  recorder: AuditTrailRecorder,
  runId: string
): ManuscriptAuditServices {
  const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

  return {
    ...services,
    resolveRegistry: async (item) => {
      const identity = identityForItem(item)
      try {
        const result = await services.resolveRegistry(item)
        makeEvent(recorder, runId, 'registry', identity, 'ok', {
          payload: `source=${result.source}; l1=${result.l1.status}`
        })
        return result
      } catch (error) {
        makeEvent(recorder, runId, 'registry', identity, 'error', { message: errorMessage(error) })
        throw error
      }
    },
    alignMetadata: async (userItem, canonical, source) => {
      const identity = identityForItem(userItem)
      try {
        const result = await services.alignMetadata(userItem, canonical, source)
        makeEvent(recorder, runId, 'metadata', identity, 'ok', { payload: `l2=${result.l2.status}` })
        return result
      } catch (error) {
        makeEvent(recorder, runId, 'metadata', identity, 'error', { message: errorMessage(error) })
        throw error
      }
    },
    europePmcJats: async (pmcid, signal) => {
      try {
        const result = await services.europePmcJats(pmcid, signal)
        makeEvent(recorder, runId, 'europe_pmc', pmcid, 'ok', { payload: result.url })
        return result
      } catch (error) {
        makeEvent(recorder, runId, 'europe_pmc', pmcid, 'error', { message: errorMessage(error) })
        throw error
      }
    },
    unpaywall: async (doi, email, signal) => {
      try {
        const result = await services.unpaywall(doi, email, signal)
        makeEvent(recorder, runId, 'unpaywall', doi, 'ok')
        return result
      } catch (error) {
        makeEvent(recorder, runId, 'unpaywall', doi, 'error', { message: errorMessage(error) })
        throw error
      }
    },
    fetchOaUrl: async (url, signal) => {
      try {
        const result = await services.fetchOaUrl(url, signal)
        makeEvent(recorder, runId, 'oa_fetch', url, result.blocked ? 'blocked' : 'ok', {
          payload: `kind=${result.kind}${result.status ? `; status=${result.status}` : ''}`
        })
        return result
      } catch (error) {
        makeEvent(recorder, runId, 'oa_fetch', url, 'error', { message: errorMessage(error) })
        throw error
      }
    },
    llmChat: async (config, messages, signal) => {
      const identity = llmConfigIdentity(config)
      const { payload, sha256 } = redactLlmPayload(messages)
      try {
        const content = await services.llmChat(config, messages, signal)
        makeEvent(recorder, runId, 'llm', identity, 'ok', { payload, payloadSha256: sha256 })
        return content
      } catch (error) {
        makeEvent(recorder, runId, 'llm', identity, 'error', { payload, payloadSha256: sha256, message: errorMessage(error) })
        throw error
      }
    },
    loadSourceArtifact: async (artifact, signal) => {
      try {
        const result = await services.loadSourceArtifact(artifact, signal)
        makeEvent(recorder, runId, 'source_artifact', artifact.path, 'ok', {
          payload: `status=${result.status}; sha256=${result.artifact.sourceHash ?? ''}`
        })
        return result
      } catch (error) {
        makeEvent(recorder, runId, 'source_artifact', artifact.path, 'error', { message: errorMessage(error) })
        throw error
      }
    }
  }
}

/** SHA-256 manifest lines (`hash  filename`) for a set of content files, sorted by name. */
export function buildProvenanceManifest(files: Record<string, string>): string {
  const names = Object.keys(files).sort()
  return names.map((name) => `${sha256Hex(files[name])}  ${name}`).join('\n') + '\n'
}

/** Sharh submission provenance bundle: timeline + report + SHA-256 manifest. */
export function bundleSharhProvenance(trailNdjson: string, reportJson: string): Record<string, string> {
  const files: Record<string, string> = {
    'audit-timeline.ndjson': trailNdjson,
    'audit-report.json': reportJson
  }
  return { ...files, 'manifest.sha256': buildProvenanceManifest(files) }
}
