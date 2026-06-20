import { create } from 'zustand'
import type {
  CslItem,
  ValidationIssue,
  VerificationMismatch,
  DuplicateGroup,
  StyleCandidate,
  UserPreset,
  NetworkStatus,
  PredatoryFlag
} from '../../engine/types'
import type { PredatoryListMeta } from '../../shared/predatory'
import { UndoManager } from '../../engine/undo'
import type { ActionType } from '../../engine/types'
import { validateCitations } from '../../engine/validator'
import { findDuplicates, mergeItems } from '../../engine/dedup'
import { sortCitations } from '../../engine/sorter'
import { formatBibliography } from '../../engine/formatter'
import { getStyleXml } from '../../engine/formatter/styles'
import { DUPLICATE_COLOR_COUNT } from '../utils/duplicate-colors'
import type { RegistryLayerSnapshot } from '../../engine/verifier/verify-and-apply'
import { checkPredatory, predatoryFlagsToByCitation } from '../../engine/predatory'
import { subscribePredatoryList } from '../../engine/predatory/list-store'

export type CitationStatus = 'pending' | 'has-issues' | 'fixed' | 'partially-fixed'
/** How the active CSL style was chosen: by journal database or explicit style list. */
export type StyleTargetMode = 'journal' | 'style'
export type { RegistryLayerSnapshot }

export interface DuplicateCitationMarker {
  groupId: string
  colorIndex: number
  similarityScore: number
  siblingIds: string[]
}

let bibliographyRequestId = 0

interface CitationState {
  citations: CslItem[]
  selectedStyleId: string | null
  selectedJournal: string | null
  styleTargetMode: StyleTargetMode | null
  issues: ValidationIssue[]
  verificationMismatches: VerificationMismatch[]
  /** L1/L2 registry check results from last unified verify (per citation id). */
  registryLayerByCitationId: Record<string, RegistryLayerSnapshot>
  duplicates: DuplicateGroup[]
  duplicateGroupByCitation: Record<string, DuplicateCitationMarker>
  predatoryFlags: PredatoryFlag[]
  predatoryByCitation: Record<string, PredatoryFlag>
  dismissedPredatoryIds: Set<string>
  predatoryListMeta: PredatoryListMeta | null
  predatoryUpdateAvailable: boolean
  detectedStyle: StyleCandidate | null
  formattedBibliography: string
  networkStatus: NetworkStatus
  recentStyles: string[]
  presets: UserPreset[]
  citationStatuses: Record<string, CitationStatus>
  preAutocorrectIssueIds: Set<string>

  // Undo
  undoManager: UndoManager
  canUndo: boolean
  canRedo: boolean

  // Actions
  setCitations: (items: CslItem[], actionType?: ActionType, label?: string) => void
  setCitationStatuses: (statuses: Record<string, CitationStatus>) => void
  addCitations: (items: CslItem[]) => void
  removeCitation: (id: string) => void
  deleteCitation: (id: string, index?: number) => void
  updateCitation: (id: string, updates: Partial<CslItem>) => void
  clearCitations: () => void
  setSelectedStyle: (styleId: string | null) => void
  setSelectedJournal: (journal: string | null) => void
  setStyleTargetMode: (mode: StyleTargetMode | null) => void
  setIssues: (issues: ValidationIssue[]) => void
  setVerificationMismatches: (mismatches: VerificationMismatch[]) => void
  setRegistryLayers: (layers: Record<string, RegistryLayerSnapshot>) => void
  setDuplicates: (duplicates: DuplicateGroup[]) => void
  setDetectedStyle: (style: StyleCandidate | null) => void
  setFormattedBibliography: (bib: string) => void
  setNetworkStatus: (status: NetworkStatus) => void
  addRecentStyle: (styleId: string) => void
  setPresets: (presets: UserPreset[]) => void
  addPreset: (preset: UserPreset) => void
  removePreset: (id: string) => void
  setPredatoryListMeta: (meta: PredatoryListMeta | null) => void
  setPredatoryUpdateAvailable: (v: boolean) => void
  dismissPredatoryCitation: (citationId: string) => void
  /** Re-run duplicate + predatory detection (menu "Detect duplicates"). */
  refreshDuplicatesAndPredatory: () => void
  /** Merge duplicate group into one row; delete siblings. */
  keepDuplicateCitation: (keepId: string, keepIndex?: number) => void
  undo: () => void
  redo: () => void
}

function collectCitationIds(items: CslItem[]): Set<string> {
  return new Set(items.map((item) => item.id))
}

/** Avoid duplicate CSL ids when merging imports or resolving the same DOI twice. */
function uniquifyCitationIds(items: CslItem[], taken: Set<string>): CslItem[] {
  return items.map((item, index) => {
    const base = item.id?.trim() || `citation-${taken.size + index}`
    let id = base
    let suffix = 2
    while (taken.has(id)) {
      id = `${base}-${suffix}`
      suffix += 1
    }
    taken.add(id)
    return id === item.id ? item : { ...item, id }
  })
}

function buildValidationStatuses(
  items: CslItem[],
  issues: ValidationIssue[]
): Record<string, CitationStatus> {
  const statuses: Record<string, CitationStatus> = {}
  for (const item of items) {
    statuses[item.id] = issues.some((issue) => issue.citationId === item.id)
      ? 'has-issues'
      : 'pending'
  }

  return statuses
}

function buildDuplicateGroupByCitation(duplicates: DuplicateGroup[]): Record<string, DuplicateCitationMarker> {
  const markers: Record<string, DuplicateCitationMarker> = {}

  duplicates.forEach((group, index) => {
    const itemIds = group.items.map((item) => item.id)
    for (const item of group.items) {
      markers[item.id] = {
        groupId: group.id,
        colorIndex: index % DUPLICATE_COLOR_COUNT,
        similarityScore: group.similarityScore,
        siblingIds: itemIds.filter((id) => id !== item.id)
      }
    }
  })

  return markers
}

function refreshDerivedCitationState(
  items: CslItem[],
  styleId: string | null,
  setState: (partial: Partial<CitationState>) => void,
  dismissedPredatoryIds: Set<string>
): void {
  const issues = validateCitations(items, styleId ?? undefined)
  const duplicates = findDuplicates(items)
  const citationStatuses = buildValidationStatuses(items, issues)
  const rawPredatory = checkPredatory(items)
  const predatoryFlags = rawPredatory.filter((f) => !dismissedPredatoryIds.has(f.citationId))

  setState({
    issues,
    duplicates,
    duplicateGroupByCitation: buildDuplicateGroupByCitation(duplicates),
    citationStatuses,
    verificationMismatches: [],
    registryLayerByCitationId: {},
    predatoryFlags,
    predatoryByCitation: predatoryFlagsToByCitation(predatoryFlags)
  })

  const xml = styleId ? getStyleXml(styleId) : null
  if (!xml || items.length === 0) {
    bibliographyRequestId += 1
    setState({ formattedBibliography: '' })
    return
  }

  const requestId = ++bibliographyRequestId
  const sorted = sortCitations(items)
  void formatBibliography(sorted, xml)
    .then((html) => {
      if (requestId === bibliographyRequestId) {
        setState({ formattedBibliography: html })
      }
    })
    .catch(() => {
      if (requestId === bibliographyRequestId) {
        setState({ formattedBibliography: '' })
      }
    })
}

export const useCitationStore = create<CitationState>((set, get) => {
  const undoManager = new UndoManager()
  const setState = (partial: Partial<CitationState>) => set(partial)

  return {
    citations: [],
    selectedStyleId: null,
    selectedJournal: null,
    styleTargetMode: null,
    issues: [],
    verificationMismatches: [],
    registryLayerByCitationId: {},
    duplicates: [],
    duplicateGroupByCitation: {},
    predatoryFlags: [],
    predatoryByCitation: {},
    dismissedPredatoryIds: new Set(),
    predatoryListMeta: null,
    predatoryUpdateAvailable: false,
    detectedStyle: null,
    formattedBibliography: '',
    networkStatus: 'online',
    recentStyles: [],
    presets: [],
    citationStatuses: {},
    preAutocorrectIssueIds: new Set(),
    undoManager,
    canUndo: false,
    canRedo: false,

    setCitations: (items, actionType = 'batch-operation', label = 'Update citations') => {
      const before = get().citations
      const normalized = uniquifyCitationIds(items, new Set())
      undoManager.record(actionType, label, before, normalized)
      set({
        citations: normalized,
        dismissedPredatoryIds: new Set(),
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo()
      })
    },

    addCitations: (items) => {
      const before = get().citations
      const incoming = uniquifyCitationIds(items, collectCitationIds(before))
      const after = [...before, ...incoming]
      undoManager.record('add-citations', `Add ${items.length} citation(s)`, before, after)
      set({
        citations: after,
        dismissedPredatoryIds: new Set(),
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo()
      })
    },

    removeCitation: (id) => {
      const before = get().citations
      const after = before.filter((c) => c.id !== id)
      undoManager.record('remove-citations', 'Remove citation', before, after)
      set({
        citations: after,
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo()
      })
      refreshDerivedCitationState(after, get().selectedStyleId, setState, get().dismissedPredatoryIds)
    },

    deleteCitation: (id, index) => {
      const before = get().citations
      let removeIndex: number
      if (
        index !== undefined &&
        index >= 0 &&
        index < before.length &&
        before[index]?.id === id
      ) {
        removeIndex = index
      } else {
        removeIndex = before.findIndex((c) => c.id === id)
      }
      if (removeIndex < 0) return
      const after = [...before.slice(0, removeIndex), ...before.slice(removeIndex + 1)]
      undoManager.record('remove-citations', 'Delete duplicate citation', before, after)
      set({
        citations: after,
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo()
      })
      refreshDerivedCitationState(after, get().selectedStyleId, setState, get().dismissedPredatoryIds)
    },

    updateCitation: (id, updates) => {
      const before = get().citations
      const after = before.map((c) => (c.id === id ? { ...c, ...updates } : c))
      undoManager.record('update-citation', 'Edit citation', before, after)
      set({
        citations: after,
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo()
      })
      refreshDerivedCitationState(after, get().selectedStyleId, setState, get().dismissedPredatoryIds)
    },

    clearCitations: () => {
      const before = get().citations
      undoManager.record('remove-citations', 'Clear all citations', before, [])
      set({
        citations: [],
        issues: [],
        verificationMismatches: [],
        registryLayerByCitationId: {},
        duplicates: [],
        duplicateGroupByCitation: {},
        predatoryFlags: [],
        predatoryByCitation: {},
        dismissedPredatoryIds: new Set(),
        formattedBibliography: '',
        selectedStyleId: null,
        selectedJournal: null,
        styleTargetMode: null,
        detectedStyle: null,
        citationStatuses: {},
        preAutocorrectIssueIds: new Set(),
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo()
      })
    },

    setCitationStatuses: (statuses) => set({ citationStatuses: statuses }),

    setSelectedStyle: (styleId) => set({ selectedStyleId: styleId }),
    setSelectedJournal: (journal) => set({ selectedJournal: journal }),
    setStyleTargetMode: (mode) => set({ styleTargetMode: mode }),
    setIssues: (issues) => set({ issues }),
    setVerificationMismatches: (mismatches) => set({ verificationMismatches: mismatches }),
    setRegistryLayers: (registryLayerByCitationId) => set({ registryLayerByCitationId }),
    setDuplicates: (duplicates) => set({
      duplicates,
      duplicateGroupByCitation: buildDuplicateGroupByCitation(duplicates)
    }),
    setDetectedStyle: (style) => set({ detectedStyle: style }),
    setFormattedBibliography: (bib) => set({ formattedBibliography: bib }),
    setNetworkStatus: (status) => set({ networkStatus: status }),

    addRecentStyle: (styleId) => {
      const recent = get().recentStyles.filter((s) => s !== styleId)
      recent.unshift(styleId)
      set({ recentStyles: recent.slice(0, 10) })
    },

    setPresets: (presets) => set({ presets }),
    addPreset: (preset) => set({ presets: [...get().presets, preset] }),
    removePreset: (id) => set({ presets: get().presets.filter((p) => p.id !== id) }),

    setPredatoryListMeta: (meta) => set({ predatoryListMeta: meta }),
    setPredatoryUpdateAvailable: (v) => set({ predatoryUpdateAvailable: v }),
    dismissPredatoryCitation: (citationId) => {
      const dismissed = new Set(get().dismissedPredatoryIds)
      dismissed.add(citationId)
      set({ dismissedPredatoryIds: dismissed })
      refreshDerivedCitationState(
        get().citations,
        get().selectedStyleId,
        setState,
        dismissed
      )
    },

    refreshDuplicatesAndPredatory: () => {
      const items = get().citations
      const dismissed = get().dismissedPredatoryIds
      const duplicates = findDuplicates(items)
      const rawPredatory = checkPredatory(items)
      const predatoryFlags = rawPredatory.filter((f) => !dismissed.has(f.citationId))
      set({
        duplicates,
        duplicateGroupByCitation: buildDuplicateGroupByCitation(duplicates),
        predatoryFlags,
        predatoryByCitation: predatoryFlagsToByCitation(predatoryFlags)
      })
    },

    keepDuplicateCitation: (keepId, keepIndex) => {
      const marker = get().duplicateGroupByCitation[keepId]
      if (!marker) return

      const group = get().duplicates.find((d) => d.id === marker.groupId)
      if (!group || group.items.length < 2) return

      const before = get().citations
      let keeperIdx: number
      if (
        keepIndex !== undefined &&
        keepIndex >= 0 &&
        keepIndex < before.length &&
        before[keepIndex]?.id === keepId &&
        get().duplicateGroupByCitation[before[keepIndex]!.id]?.groupId === marker.groupId
      ) {
        keeperIdx = keepIndex
      } else {
        keeperIdx = before.findIndex(
          (c) =>
            c.id === keepId && get().duplicateGroupByCitation[c.id]?.groupId === marker.groupId
        )
      }
      if (keeperIdx < 0) return

      const rowsInGroup: number[] = []
      before.forEach((c, idx) => {
        if (get().duplicateGroupByCitation[c.id]?.groupId === marker.groupId) {
          rowsInGroup.push(idx)
        }
      })

      const groupCitations = rowsInGroup.map((idx) => before[idx]!)
      const keeper = before[keeperIdx]!
      const ordered = [
        keeper,
        ...groupCitations.filter((_, i) => rowsInGroup[i] !== keeperIdx)
      ]
      const merged: CslItem = { ...mergeItems(ordered), id: keepId }

      const removeIndices = new Set(rowsInGroup.filter((idx) => idx !== keeperIdx))
      const after = before
        .map((c, idx) => (idx === keeperIdx ? merged : c))
        .filter((_, idx) => !removeIndices.has(idx))

      undoManager.record('merge-duplicates', 'Keep duplicate entry', before, after)
      set({
        citations: after,
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo()
      })
      refreshDerivedCitationState(after, get().selectedStyleId, setState, get().dismissedPredatoryIds)
    },

    undo: () => {
      const action = undoManager.undo()
      if (action) {
        const citations = structuredClone(action.before)
        set({
          citations: structuredClone(action.before),
          canUndo: undoManager.canUndo(),
          canRedo: undoManager.canRedo()
        })
        refreshDerivedCitationState(citations, get().selectedStyleId, setState, get().dismissedPredatoryIds)
      }
    },

    redo: () => {
      const action = undoManager.redo()
      if (action) {
        const citations = structuredClone(action.after)
        set({
          citations: structuredClone(action.after),
          canUndo: undoManager.canUndo(),
          canRedo: undoManager.canRedo()
        })
        refreshDerivedCitationState(citations, get().selectedStyleId, setState, get().dismissedPredatoryIds)
      }
    }
  }
})

subscribePredatoryList(() => {
  const s = useCitationStore.getState()
  refreshDerivedCitationState(s.citations, s.selectedStyleId, (partial) => {
    useCitationStore.setState(partial)
  }, s.dismissedPredatoryIds)
})
