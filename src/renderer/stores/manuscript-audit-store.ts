import { create } from 'zustand'
import { NASSILA_MODEL_ARTIFACTS } from '../../shared/nassila-agent-tasks'
import type { AuditReport, CitationFinding, UserAction } from '../../engine/manuscript/types'
import type {
  ManuscriptAuditItemStage,
  ManuscriptAuditProgressEvent
} from '../../shared/manuscript-audit-contract'
import { LM_STUDIO_DEFAULT_URL } from '../utils/llm-config-utils'

export type AuditStep = 'idle' | 'parsing' | 'l1' | 'l2' | 'oa_fetch' | 'l3' | 'llm' | 'done' | 'error'

export type AuditReferenceSource = 'manuscript' | 'bibliography'

interface ManuscriptAuditState {
  rawManuscriptText: string
  report: AuditReport | null
  step: AuditStep
  error: string | null
  /** Incremental audit progress while runAudit is in flight. */
  auditProgress: { processed: number; total: number } | null
  /** Manuscript file import (PDF OCR can take minutes). */
  importProgress: {
    phase: 'reading' | 'checking' | 'ocr'
    processed: number
    total: number
    elapsedMs: number
  } | null
  activeRunId: string | null
  activeBibKeyFilter: string | null
  auditItemStages: Record<string, ManuscriptAuditItemStage>
  auditFindingSlots: Array<CitationFinding | undefined>
  userActionsByBibKey: Record<string, UserAction>
  llmEnabled: boolean
  llmPresetId: string
  llmBaseUrl: string
  llmModel: string
  unpaywallEmail: string
  llmPrefsHydrated: boolean
  enhancedOcr: boolean
  manuscriptSourceFormat: 'docx' | 'pdf' | 'text' | null
  /** When `bibliography`, audit uses Raqim store rows instead of re-parsing embedded refs. */
  auditReferenceSource: AuditReferenceSource

  selectedTemplateId: string
  templateStrict: boolean
  templates: { id: string; name: string; headings: Record<string, string[]> }[]

  setRawManuscriptText: (text: string) => void
  setReport: (report: AuditReport | null) => void
  beginIncrementalAudit: (params: { total: number; shell: Omit<AuditReport, 'findings' | 'generatedAt'> }) => void
  appendFinding: (finding: CitationFinding) => void
  clearAuditProgress: () => void
  consumeAuditProgress: (progress: ManuscriptAuditProgressEvent) => void
  setStep: (step: AuditStep) => void
  setError: (error: string | null) => void
  setImportProgress: (
    progress: ManuscriptAuditState['importProgress']
  ) => void
  setUserAction: (bibKey: string, action: UserAction) => void
  setLlmEnabled: (enabled: boolean) => void
  setLlmPresetId: (id: string) => void
  setLlmBaseUrl: (url: string) => void
  setLlmModel: (model: string) => void
  setUnpaywallEmail: (email: string) => void
  setLlmPrefsHydrated: (hydrated: boolean) => void
  setEnhancedOcr: (enabled: boolean) => void
  setManuscriptSourceFormat: (format: 'docx' | 'pdf' | 'text' | null) => void
  setAuditReferenceSource: (source: AuditReferenceSource) => void
  setSelectedTemplateId: (id: string) => void
  setTemplateStrict: (strict: boolean) => void
  setTemplates: (templates: { id: string; name: string; headings: Record<string, string[]> }[]) => void
  clear: () => void
}

export const useManuscriptAuditStore = create<ManuscriptAuditState>((set, get) => ({
  rawManuscriptText: '',
  report: null,
  step: 'idle',
  error: null,
  auditProgress: null,
  importProgress: null,
  activeRunId: null,
  activeBibKeyFilter: null,
  auditItemStages: {},
  auditFindingSlots: [],
  userActionsByBibKey: {},
  llmEnabled: true,
  llmPresetId: 'lmstudio',
  llmBaseUrl: LM_STUDIO_DEFAULT_URL,
  llmModel: NASSILA_MODEL_ARTIFACTS.sanadE4b,
  unpaywallEmail: '',
  llmPrefsHydrated: false,
  enhancedOcr: false,
  manuscriptSourceFormat: null,
  auditReferenceSource: 'manuscript',

  selectedTemplateId: 'imrad',
  templateStrict: false,
  templates: [],

  setRawManuscriptText: (rawManuscriptText) => set({ rawManuscriptText }),
  setReport: (report) => set({ report, auditProgress: null }),
  beginIncrementalAudit: ({ total, shell }) =>
    set({
      auditProgress: { processed: 0, total },
      report: {
        ...shell,
        findings: [],
        generatedAt: new Date().toISOString()
      }
    }),
  appendFinding: (finding) => {
    const state = get()
    if (!state.report) return
    const findings = [...state.report.findings, finding]
    const processed = (state.auditProgress?.processed ?? 0) + 1
    set({
      report: { ...state.report, findings },
      auditProgress: state.auditProgress ? { ...state.auditProgress, processed } : null
    })
  },
  clearAuditProgress: () => set({ auditProgress: null }),
  consumeAuditProgress: (progress) => {
    const state = get()
    if (progress.kind !== 'started' && state.activeRunId !== progress.runId) return

    if (progress.kind === 'started') {
      const filtered = Boolean(progress.bibKeyFilter && state.report)
      set({
        activeRunId: progress.runId,
        activeBibKeyFilter: progress.bibKeyFilter ?? null,
        auditProgress: { processed: 0, total: progress.total },
        auditItemStages: {},
        auditFindingSlots: filtered ? state.report!.findings : [],
        report: filtered
          ? state.report
          : {
              ...progress.shell,
              findings: [],
              generatedAt: new Date().toISOString()
            },
        step: progress.total > 0 ? 'l1' : 'done'
      })
      return
    }
    if (progress.kind === 'item-stage') {
      const stepByStage: Partial<Record<ManuscriptAuditItemStage, AuditStep>> = {
        registry: 'l1',
        metadata: 'l2',
        source: 'oa_fetch',
        grounding: 'l3'
      }
      set({
        auditItemStages: { ...state.auditItemStages, [progress.bibKey]: progress.stage },
        step: stepByStage[progress.stage] ?? state.step
      })
      return
    }
    if (progress.kind === 'finding') {
      const slots = [...state.auditFindingSlots]
      const filteredIndex = state.activeBibKeyFilter
        ? slots.findIndex((finding) => finding?.bibKey === progress.finding.bibKey)
        : -1
      slots[filteredIndex >= 0 ? filteredIndex : progress.index] = progress.finding
      const findings = slots.filter((finding): finding is CitationFinding => Boolean(finding))
      set({
        auditFindingSlots: slots,
        report: state.report ? { ...state.report, findings } : state.report,
        auditProgress: { processed: progress.processed, total: progress.total }
      })
      return
    }
    if (progress.kind === 'completed') {
      const findings = progress.bibKeyFilter && state.report
        ? state.report.findings.map((finding) =>
            progress.report.findings.find((candidate) => candidate.bibKey === finding.bibKey) ?? finding
          )
        : progress.report.findings
      set({
        report: { ...progress.report, findings },
        step: 'done',
        auditProgress: null,
        auditFindingSlots: findings,
        activeRunId: null,
        activeBibKeyFilter: null
      })
      return
    }
    if (progress.kind === 'cancelled') {
      set({
        step: 'idle',
        auditProgress: null,
        auditItemStages: {},
        auditFindingSlots: [],
        activeRunId: null,
        activeBibKeyFilter: null
      })
      return
    }
    set({
      error: progress.message,
      step: 'error',
      auditProgress: null,
      activeRunId: null,
      activeBibKeyFilter: null
    })
  },
  setStep: (step) => set({ step }),
  setError: (error) => set({ error }),
  setImportProgress: (importProgress) => set({ importProgress }),

  setUserAction: (bibKey, action) => {
    set({ userActionsByBibKey: { ...get().userActionsByBibKey, [bibKey]: action } })
  },

  setLlmEnabled: (llmEnabled) => set({ llmEnabled }),
  setLlmPresetId: (llmPresetId) => set({ llmPresetId }),
  setLlmBaseUrl: (llmBaseUrl) => set({ llmBaseUrl }),
  setLlmModel: (llmModel) => set({ llmModel }),
  setUnpaywallEmail: (unpaywallEmail) => set({ unpaywallEmail }),
  setLlmPrefsHydrated: (llmPrefsHydrated) => set({ llmPrefsHydrated }),
  setEnhancedOcr: (enhancedOcr) => set({ enhancedOcr }),
  setManuscriptSourceFormat: (manuscriptSourceFormat) => set({ manuscriptSourceFormat }),
  setAuditReferenceSource: (auditReferenceSource) => set({ auditReferenceSource }),
  setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }),
  setTemplateStrict: (templateStrict) => set({ templateStrict }),
  setTemplates: (templates) => set({ templates }),

  clear: () =>
    set({
      rawManuscriptText: '',
      report: null,
      step: 'idle',
      error: null,
      auditProgress: null,
      importProgress: null,
      activeRunId: null,
      activeBibKeyFilter: null,
      auditItemStages: {},
      auditFindingSlots: [],
      userActionsByBibKey: {},
      manuscriptSourceFormat: null
    })
}))

