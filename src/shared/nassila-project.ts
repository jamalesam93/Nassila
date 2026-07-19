import type { CslItem } from '../engine/types'
import type { AuditReport, UserAction } from '../engine/manuscript/types'
import type { SourceArtifact } from './source-artifact'
import { isSourceArtifact } from './source-artifact'

/** Nassila local project file format (`.nassila`). */
export const NASSILA_PROJECT_FORMAT = 'nassila-project' as const
export const NASSILA_PROJECT_VERSION = 1 as const

/** Keep in sync with engine GROUNDING_PROMPT_CONTRACT_VERSION (avoid shared→engine import). */
export const PROJECT_PROMPT_CONTRACT_VERSION = 'sanad-grounding-v1' as const

export type ManuscriptSourceFormat = 'docx' | 'pdf' | 'text'

export interface NassilaProjectV1 {
  format: typeof NASSILA_PROJECT_FORMAT
  version: typeof NASSILA_PROJECT_VERSION
  savedAt: string
  manuscript: {
    text: string
    sourceFormat: ManuscriptSourceFormat | null
  }
  bibliography: {
    citations: CslItem[]
  }
  sources: {
    artifactsByBibKey: Record<string, SourceArtifact>
  }
  audit: {
    report: AuditReport | null
    userActionsByBibKey: Record<string, UserAction>
    referenceSource: 'manuscript' | 'bibliography'
    selectedTemplateId: string
    templateStrict: boolean
    llmEnabled: boolean
    llmPresetId: string
    llmBaseUrl: string
    llmModel: string
    promptContractVersion: string
  }
  unresolvedConflicts: string[]
  exportHistory: Array<{ kind: string; at: string; path?: string }>
}

export function createEmptyNassilaProject(): NassilaProjectV1 {
  return {
    format: NASSILA_PROJECT_FORMAT,
    version: NASSILA_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    manuscript: { text: '', sourceFormat: null },
    bibliography: { citations: [] },
    sources: { artifactsByBibKey: {} },
    audit: {
      report: null,
      userActionsByBibKey: {},
      referenceSource: 'manuscript',
      selectedTemplateId: 'imrad',
      templateStrict: false,
      llmEnabled: true,
      llmPresetId: 'lmstudio',
      llmBaseUrl: '',
      llmModel: '',
      promptContractVersion: PROJECT_PROMPT_CONTRACT_VERSION
    },
    unresolvedConflicts: [],
    exportHistory: []
  }
}

export function serializeNassilaProject(project: NassilaProjectV1): string {
  return `${JSON.stringify(project, null, 2)}\n`
}

export function parseNassilaProject(raw: string): NassilaProjectV1 {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Invalid .nassila file: not JSON')
  }
  if (!isNassilaProjectV1(data)) {
    throw new Error('Invalid .nassila file: unsupported format or version')
  }
  return data
}

export function isNassilaProjectV1(value: unknown): value is NassilaProjectV1 {
  if (!isRecord(value)) return false
  if (value.format !== NASSILA_PROJECT_FORMAT) return false
  if (value.version !== NASSILA_PROJECT_VERSION) return false
  if (typeof value.savedAt !== 'string') return false
  if (!isRecord(value.manuscript) || typeof value.manuscript.text !== 'string') return false
  const fmt = value.manuscript.sourceFormat
  if (fmt !== null && fmt !== 'docx' && fmt !== 'pdf' && fmt !== 'text') return false
  if (!isRecord(value.bibliography) || !Array.isArray(value.bibliography.citations)) return false
  if (!isRecord(value.sources) || !isRecord(value.sources.artifactsByBibKey)) return false
  for (const artifact of Object.values(value.sources.artifactsByBibKey)) {
    if (!isSourceArtifact(artifact)) return false
  }
  if (!isRecord(value.audit)) return false
  if (!Array.isArray(value.unresolvedConflicts)) return false
  if (!Array.isArray(value.exportHistory)) return false
  return true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

/** Canonical website docs base (locale path appended by callers). */
export const NASSILA_WEBSITE_DOCS_BASE = 'https://nassila-web.vercel.app'
export const NASSILA_GITHUB_ISSUES = 'https://github.com/jamalesam93/Nassila/issues'
