import { create } from 'zustand'
import type { SourceArtifact } from '../../shared/source-artifact'

interface OuroborosLoopState {
  selectedBibKey: string | null
  /** Content-addressed local source PDFs and extraction provenance per bibliography key. */
  sourceArtifactsByBibKey: Record<string, SourceArtifact>
  setSelectedBibKey: (bibKey: string | null) => void
  attachSourcePdf: (bibKey: string, artifact: SourceArtifact) => void
  clearAttachedSourcePdf: (bibKey: string) => void
}

export const useOuroborosLoopStore = create<OuroborosLoopState>((set) => ({
  selectedBibKey: null,
  sourceArtifactsByBibKey: {},
  setSelectedBibKey: (selectedBibKey) => set({ selectedBibKey }),
  attachSourcePdf: (bibKey, artifact) =>
    set((s) => ({
      sourceArtifactsByBibKey: { ...s.sourceArtifactsByBibKey, [bibKey]: artifact }
    })),
  clearAttachedSourcePdf: (bibKey) =>
    set((s) => {
      const next = { ...s.sourceArtifactsByBibKey }
      delete next[bibKey]
      return { sourceArtifactsByBibKey: next }
    })
}))
