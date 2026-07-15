import { create } from 'zustand'
import { NASSILA_MODEL_ARTIFACTS } from '../../shared/nassila-agent-tasks'
import type { AuditReport, CitationFinding, UserAction } from '../../engine/manuscript/types'
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
  userActionsByBibKey: Record<string, UserAction>
  llmEnabled: boolean
  llmPresetId: string
  llmBaseUrl: string
  llmModel: string
  unpaywallEmail: string
  llmPrefsHydrated: boolean
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
  setStep: (step: AuditStep) => void
  setError: (error: string | null) => void
  setUserAction: (bibKey: string, action: UserAction) => void
  setLlmEnabled: (enabled: boolean) => void
  setLlmPresetId: (id: string) => void
  setLlmBaseUrl: (url: string) => void
  setLlmModel: (model: string) => void
  setUnpaywallEmail: (email: string) => void
  setLlmPrefsHydrated: (hydrated: boolean) => void
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
  userActionsByBibKey: {},
  llmEnabled: true,
  llmPresetId: 'lmstudio',
  llmBaseUrl: LM_STUDIO_DEFAULT_URL,
  llmModel: NASSILA_MODEL_ARTIFACTS.sanadE4b,
  unpaywallEmail: '',
  llmPrefsHydrated: false,
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
  setStep: (step) => set({ step }),
  setError: (error) => set({ error }),

  setUserAction: (bibKey, action) => {
    set({ userActionsByBibKey: { ...get().userActionsByBibKey, [bibKey]: action } })
  },

  setLlmEnabled: (llmEnabled) => set({ llmEnabled }),
  setLlmPresetId: (llmPresetId) => set({ llmPresetId }),
  setLlmBaseUrl: (llmBaseUrl) => set({ llmBaseUrl }),
  setLlmModel: (llmModel) => set({ llmModel }),
  setUnpaywallEmail: (unpaywallEmail) => set({ unpaywallEmail }),
  setLlmPrefsHydrated: (llmPrefsHydrated) => set({ llmPrefsHydrated }),
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
      userActionsByBibKey: {},
      manuscriptSourceFormat: null
    })
}))

