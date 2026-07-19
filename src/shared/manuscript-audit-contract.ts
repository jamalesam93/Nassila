import type { CslItem, NetworkStatus } from '../engine/types'
import type {
  AuditReport,
  AuditRunProvenance,
  CitationFinding,
  UserAction
} from '../engine/manuscript/types'
import { isSourceArtifact, type SourceArtifact } from './source-artifact'

export const MANUSCRIPT_AUDIT_START_CHANNEL = 'manuscriptAudit:start'
export const MANUSCRIPT_AUDIT_CANCEL_CHANNEL = 'manuscriptAudit:cancel'
export const MANUSCRIPT_AUDIT_PROGRESS_CHANNEL = 'manuscriptAudit:progress'

export type ManuscriptAuditItemStage = 'queued' | 'registry' | 'metadata' | 'source' | 'grounding' | 'done' | 'failed'

export interface ManuscriptAuditStartRequest {
  runId: string
  rawText: string
  manuscriptSourceFormat: 'docx' | 'pdf' | 'paste'
  referenceSource: 'manuscript' | 'bibliography'
  libraryCitations: CslItem[]
  userActionsByBibKey: Record<string, UserAction>
  networkStatus: NetworkStatus
  template: {
    selectedId: string
    strict: boolean
    templates: { id: string; name: string; headings: Record<string, string[]> }[]
  }
  llm: {
    enabled: boolean
    presetId: string
    baseUrl: string
    model: string
  }
  unpaywallEmail: string
  sourceArtifactsByBibKey?: Record<string, SourceArtifact>
  bibKeyFilter?: string
  priorRuns?: AuditRunProvenance[]
}

export type ManuscriptAuditProgressEvent =
  | {
      runId: string
      kind: 'started'
      total: number
      shell: Omit<AuditReport, 'findings' | 'generatedAt'>
      bibKeyFilter?: string
    }
  | { runId: string; kind: 'item-stage'; index: number; bibKey: string; stage: ManuscriptAuditItemStage }
  | { runId: string; kind: 'finding'; index: number; finding: CitationFinding; processed: number; total: number }
  | { runId: string; kind: 'completed'; report: AuditReport; bibKeyFilter?: string }
  | { runId: string; kind: 'cancelled' }
  | { runId: string; kind: 'failed'; message: string; partialReport?: AuditReport }

const MAX_MANUSCRIPT_CHARS = 20_000_000
const MAX_LIBRARY_ITEMS = 2_000

export function isValidAuditRunId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value)
}

export function sanitizeManuscriptAuditStartRequest(raw: unknown): ManuscriptAuditStartRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<ManuscriptAuditStartRequest>
  if (!isValidAuditRunId(value.runId)) return null
  if (typeof value.rawText !== 'string' || value.rawText.length > MAX_MANUSCRIPT_CHARS) return null
  if (
    value.manuscriptSourceFormat !== 'docx' &&
    value.manuscriptSourceFormat !== 'pdf' &&
    value.manuscriptSourceFormat !== 'paste'
  ) return null
  if (value.referenceSource !== 'manuscript' && value.referenceSource !== 'bibliography') return null
  if (!Array.isArray(value.libraryCitations) || value.libraryCitations.length > MAX_LIBRARY_ITEMS) return null
  if (!value.libraryCitations.every(isCslItem)) return null
  if (value.networkStatus !== 'online' && value.networkStatus !== 'offline') return null
  if (!isRecord(value.userActionsByBibKey) || !Object.values(value.userActionsByBibKey).every(isUserAction)) return null
  if (!isTemplateConfig(value.template) || !isLlmConfig(value.llm)) return null
  if (typeof value.unpaywallEmail !== 'string' || value.unpaywallEmail.length > 320) return null
  if (
    value.sourceArtifactsByBibKey !== undefined &&
    (!isRecord(value.sourceArtifactsByBibKey) ||
      !Object.values(value.sourceArtifactsByBibKey).every(isSourceArtifact))
  ) return null
  if (
    value.bibKeyFilter !== undefined &&
    (typeof value.bibKeyFilter !== 'string' || value.bibKeyFilter.length === 0 || value.bibKeyFilter.length > 500)
  ) return null
  if (
    value.priorRuns !== undefined &&
    (!Array.isArray(value.priorRuns) ||
      value.priorRuns.length > 100 ||
      !value.priorRuns.every(isAuditRunProvenance))
  ) return null
  return value as ManuscriptAuditStartRequest
}

function isCslItem(value: unknown): value is CslItem {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0
}

function isUserAction(value: unknown): value is UserAction {
  if (!isRecord(value) || typeof value.kind !== 'string') return false
  if (value.kind === 'none' || value.kind === 'ignored_for_session') return true
  if (value.kind === 'acknowledged') return value.note === undefined || typeof value.note === 'string'
  return value.kind === 'accepted_override' && typeof value.note === 'string'
}

function isTemplateConfig(value: unknown): value is ManuscriptAuditStartRequest['template'] {
  if (!isRecord(value) || typeof value.selectedId !== 'string' || typeof value.strict !== 'boolean') return false
  if (!Array.isArray(value.templates) || value.templates.length > 100) return false
  return value.templates.every(
    (template) =>
      isRecord(template) &&
      typeof template.id === 'string' &&
      typeof template.name === 'string' &&
      isRecord(template.headings) &&
      Object.values(template.headings).every(
        (headings) => Array.isArray(headings) && headings.every((heading) => typeof heading === 'string')
      )
  )
}

function isLlmConfig(value: unknown): value is ManuscriptAuditStartRequest['llm'] {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    typeof value.presetId === 'string' &&
    typeof value.baseUrl === 'string' &&
    value.baseUrl.length <= 2_048 &&
    typeof value.model === 'string' &&
    value.model.length <= 500
  )
}

function isAuditRunProvenance(value: unknown): value is AuditRunProvenance {
  return (
    isRecord(value) &&
    typeof value.generatedAt === 'string' &&
    typeof value.appVersion === 'string' &&
    typeof value.promptContractVersion === 'string' &&
    (value.bibKeyFilter === undefined || typeof value.bibKeyFilter === 'string')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
