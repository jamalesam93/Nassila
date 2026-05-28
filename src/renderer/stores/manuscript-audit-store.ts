import { create } from 'zustand'
import type { AuditReport, UserAction } from '../../engine/manuscript/types'

export type AuditStep = 'idle' | 'parsing' | 'l1' | 'l2' | 'oa_fetch' | 'l3' | 'llm' | 'done' | 'error'

interface ManuscriptAuditState {
  rawManuscriptText: string
  report: AuditReport | null
  step: AuditStep
  error: string | null
  userActionsByBibKey: Record<string, UserAction>
  llmEnabled: boolean
  llmPresetId: string
  llmBaseUrl: string
  llmModel: string
  unpaywallEmail: string
  manuscriptSourceFormat: 'docx' | 'pdf' | 'text' | null

  selectedTemplateId: string
  templateStrict: boolean
  templates: { id: string; name: string; headings: Record<string, string[]> }[]

  setRawManuscriptText: (text: string) => void
  setReport: (report: AuditReport | null) => void
  setStep: (step: AuditStep) => void
  setError: (error: string | null) => void
  setUserAction: (bibKey: string, action: UserAction) => void
  setLlmEnabled: (enabled: boolean) => void
  setLlmPresetId: (id: string) => void
  setLlmBaseUrl: (url: string) => void
  setLlmModel: (model: string) => void
  setUnpaywallEmail: (email: string) => void
  setManuscriptSourceFormat: (format: 'docx' | 'pdf' | 'text' | null) => void
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
  userActionsByBibKey: {},
  llmEnabled: false,
  llmPresetId: 'openai',
  llmBaseUrl: 'https://api.openai.com',
  llmModel: 'gpt-4.1-mini',
  unpaywallEmail: '',
  manuscriptSourceFormat: null,

  selectedTemplateId: 'imrad',
  templateStrict: false,
  templates: [],

  setRawManuscriptText: (rawManuscriptText) => set({ rawManuscriptText }),
  setReport: (report) => set({ report }),
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
  setManuscriptSourceFormat: (manuscriptSourceFormat) => set({ manuscriptSourceFormat }),
  setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }),
  setTemplateStrict: (templateStrict) => set({ templateStrict }),
  setTemplates: (templates) => set({ templates }),

  clear: () =>
    set({
      rawManuscriptText: '',
      report: null,
      step: 'idle',
      error: null,
      userActionsByBibKey: {},
      manuscriptSourceFormat: null
    })
}))

