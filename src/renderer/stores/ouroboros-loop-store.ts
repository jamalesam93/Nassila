import { create } from 'zustand'

interface OuroborosLoopState {
  selectedBibKey: string | null
  /** User-attached source PDF paths per bibliography key (Masdar Tier 3; not yet used in audit). */
  attachedPdfByBibKey: Record<string, string>
  setSelectedBibKey: (bibKey: string | null) => void
  attachSourcePdf: (bibKey: string, filePath: string) => void
  clearAttachedSourcePdf: (bibKey: string) => void
}

export const useOuroborosLoopStore = create<OuroborosLoopState>((set) => ({
  selectedBibKey: null,
  attachedPdfByBibKey: {},
  setSelectedBibKey: (selectedBibKey) => set({ selectedBibKey }),
  attachSourcePdf: (bibKey, filePath) =>
    set((s) => ({
      attachedPdfByBibKey: { ...s.attachedPdfByBibKey, [bibKey]: filePath }
    })),
  clearAttachedSourcePdf: (bibKey) =>
    set((s) => {
      const next = { ...s.attachedPdfByBibKey }
      delete next[bibKey]
      return { attachedPdfByBibKey: next }
    })
}))
