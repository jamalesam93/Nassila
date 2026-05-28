import { useCallback, useRef } from 'react'
import { useCitationStore, type CitationStatus } from '../stores/citation-store'
import { parseInput } from '../../engine/parser/index'
import { resolveIdentifier, batchResolve } from '../../engine/resolver/index'
import { validateCitations } from '../../engine/validator/index'
import { autocorrect } from '../../engine/autocorrect/index'
import { findDuplicates } from '../../engine/dedup/index'
import { detectStyle } from '../../engine/detector/index'
import { formatBibliography } from '../../engine/formatter/index'
import { getStyleXml, listBundledStyles } from '../../engine/formatter/styles'
import { sortCitations } from '../../engine/sorter/index'
import {
  verifyUnifiedRegistryWithPatches
} from '../../engine/verifier/verify-and-apply'
import { checkPredatory, predatoryFlagsToByCitation } from '../../engine/predatory'
import type { CorrectionLog } from '../../engine/autocorrect/index'
import type { CslItem, ExportFormat, InputFormat, ValidationIssue } from '../../engine/types'
import { MAX_VERIFICATION_ITEMS } from '../../shared/verification-limits'

const AVAILABLE_STYLES = listBundledStyles()

function inputFormatFromFileExtension(ext: string | undefined): InputFormat | undefined {
  if (!ext) return undefined
  if (ext === 'bib') return 'bibtex'
  if (ext === 'ris') return 'ris'
  if (ext === 'json') return 'csl-json'
  return undefined
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

export function useCitationEngine() {
  const bibliographyRequestIdRef = useRef(0)
  const verificationRequestIdRef = useRef(0)

  const refreshBibliography = useCallback(async (items: CslItem[], styleId: string | null) => {
    const store = useCitationStore.getState()
    const xml = styleId ? getStyleXml(styleId) : null
    if (!xml || items.length === 0) {
      bibliographyRequestIdRef.current += 1
      store.setFormattedBibliography('')
      return
    }

    const requestId = ++bibliographyRequestIdRef.current
    try {
      const sorted = sortCitations(items)
      const html = await formatBibliography(sorted, xml)
      if (requestId === bibliographyRequestIdRef.current) {
        useCitationStore.getState().setFormattedBibliography(html)
      }
    } catch {
      if (requestId === bibliographyRequestIdRef.current) {
        useCitationStore.getState().setFormattedBibliography('')
      }
    }
  }, [])

  const synchronizeDerivedWithoutVerify = useCallback((
    items: CslItem[],
    styleId: string | null,
    options?: {
      issues?: ValidationIssue[]
      statuses?: Record<string, CitationStatus>
    }
  ): ValidationIssue[] => {
    const issues = options?.issues ?? validateCitations(items, styleId ?? undefined)
    const store = useCitationStore.getState()
    const dismissed = store.dismissedPredatoryIds
    const rawPredatory = checkPredatory(items)
    const predatoryFlags = rawPredatory.filter((f) => !dismissed.has(f.citationId))
    store.setIssues(issues)
    store.setDuplicates(findDuplicates(items))
    store.setCitationStatuses(options?.statuses ?? buildValidationStatuses(items, issues))
    useCitationStore.setState({
      predatoryFlags,
      predatoryByCitation: predatoryFlagsToByCitation(predatoryFlags)
    })
    void refreshBibliography(items, styleId)
    return issues
  }, [refreshBibliography])

  const refreshVerification = useCallback(async (items: CslItem[]) => {
    const store = useCitationStore.getState()
    const requestId = ++verificationRequestIdRef.current

    if (store.networkStatus !== 'online' || items.length === 0) {
      store.setVerificationMismatches([])
      store.setRegistryLayers({})
      return
    }

    try {
      const { nextCitations, remainingMismatches, layersByCitationId } =
        await verifyUnifiedRegistryWithPatches(items, MAX_VERIFICATION_ITEMS)
      if (requestId !== verificationRequestIdRef.current) return

      const changedInner = nextCitations.some((c, i) => c !== items[i])

      if (changedInner) {
        useCitationStore.getState().setCitations(
          nextCitations,
          'accept-verification',
          'Apply registry fields from verification'
        )
        synchronizeDerivedWithoutVerify(
          nextCitations,
          useCitationStore.getState().selectedStyleId
        )
      }

      const latest = useCitationStore.getState().citations
      const validIds = new Set(latest.map((c) => c.id))
      const prevLayers = useCitationStore.getState().registryLayerByCitationId
      const nextLayers: Record<string, (typeof prevLayers)[string]> = {}
      for (const [id, snap] of Object.entries(prevLayers)) {
        if (validIds.has(id)) nextLayers[id] = snap
      }
      for (const [id, snap] of Object.entries(layersByCitationId)) {
        if (validIds.has(id)) nextLayers[id] = snap
      }
      useCitationStore.getState().setRegistryLayers(nextLayers)

      useCitationStore.getState().setVerificationMismatches(
        remainingMismatches.filter((m) => latest.some((c) => c.id === m.citationId))
      )
    } catch {
      if (requestId === verificationRequestIdRef.current) {
        useCitationStore.getState().setVerificationMismatches([])
        useCitationStore.getState().setRegistryLayers({})
      }
    }
  }, [synchronizeDerivedWithoutVerify])

  const applyDerivedState = useCallback((
    items: CslItem[],
    styleId: string | null,
    options?: {
      issues?: ValidationIssue[]
      statuses?: Record<string, CitationStatus>
    }
  ): ValidationIssue[] => {
    const issues = synchronizeDerivedWithoutVerify(items, styleId, options)
    void refreshVerification(items)
    return issues
  }, [refreshVerification, synchronizeDerivedWithoutVerify])

  const processRawInput = useCallback(async (raw: string, format?: InputFormat) => {
    const result = await parseInput(raw, format)
    if (result.items.length > 0) {
      const store = useCitationStore.getState()
      store.addCitations(result.items)

      const lines = raw.split('\n').filter((l) => l.trim())
      if (lines.length > 0) {
        const candidates = await detectStyle(lines[0])
        if (candidates.length > 0) {
          useCitationStore.getState().setDetectedStyle(candidates[0])
        }
      }

      const latestStore = useCitationStore.getState()
      applyDerivedState(latestStore.citations, latestStore.selectedStyleId)
    }
    return result
  }, [applyDerivedState])

  const ingestItems = useCallback((items: CslItem[]): void => {
    if (items.length === 0) return

    const store = useCitationStore.getState()
    store.addCitations(items)
    const latestStore = useCitationStore.getState()
    applyDerivedState(latestStore.citations, latestStore.selectedStyleId)
  }, [applyDerivedState])

  const processFile = useCallback(async (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase()

    if (ext === 'docx' || ext === 'pdf') {
      const buffer = await window.api?.readFileBinary(filePath)
      if (!buffer) return { items: [], errors: ['Could not read file'], format: ext }

      const { parseDocx, parsePdf } = await import('../../engine/parser/document')
      const result = ext === 'docx' ? await parseDocx(buffer) : await parsePdf(buffer)

      if (result.items.length > 0) {
        ingestItems(result.items)
      }
      return result
    }

    const content = await window.api?.readFile(filePath)
    if (!content) return { items: [], errors: ['Could not read file'], format: 'plain-text' as const }
    const formatHint = inputFormatFromFileExtension(ext)
    return processRawInput(content, formatHint)
  }, [ingestItems, processRawInput])

  const resolveId = useCallback(async (input: string) => {
    const item = await resolveIdentifier(input)
    if (item) {
      const store = useCitationStore.getState()
      const nextItems = [...store.citations, item]
      store.addCitations([item])
      applyDerivedState(nextItems, useCitationStore.getState().selectedStyleId)
    }
    return item
  }, [applyDerivedState])

  const batchResolveIds = useCallback(async (inputs: string[]) => {
    const results = await batchResolve(inputs)
    const items = results.filter((r): r is CslItem => r !== null)
    if (items.length > 0) {
      const store = useCitationStore.getState()
      const nextItems = [...store.citations, ...items]
      store.addCitations(items)
      applyDerivedState(nextItems, useCitationStore.getState().selectedStyleId)
    }
    return items
  }, [applyDerivedState])

  const changeStyle = useCallback(async (styleId: string) => {
    const store = useCitationStore.getState()
    store.setSelectedStyle(styleId)
    store.addRecentStyle(styleId)
    applyDerivedState(store.citations, styleId)
  }, [applyDerivedState])

  const clearStyleTarget = useCallback(() => {
    const store = useCitationStore.getState()
    store.setStyleTargetMode(null)
    store.setSelectedJournal(null)
    store.setSelectedStyle(null)
    applyDerivedState(store.citations, null)
  }, [applyDerivedState])

  const runAutocorrect = useCallback(async (useOnline = true) => {
    const store = useCitationStore.getState()
    const preIssues = validateCitations(store.citations, store.selectedStyleId ?? undefined)
    const preIssuesByCitation = new Map<string, number>()
    for (const issue of preIssues) {
      preIssuesByCitation.set(issue.citationId, (preIssuesByCitation.get(issue.citationId) ?? 0) + 1)
    }

    const { corrected, log } = autocorrect(store.citations, preIssues, store.selectedStyleId ?? undefined)
    let allCorrected = corrected
    const allLog = [...log]

    if (useCitationStore.getState().citations.length === 0) {
      return allLog
    }

    if (useOnline && store.networkStatus === 'online') {
      const { enhanceCitationsOnline } = await import('../../engine/autocorrect/enhance')
      const { enhanced, log: onlineLog } = await enhanceCitationsOnline(allCorrected, undefined, {
        shouldAbort: () => useCitationStore.getState().citations.length === 0
      })
      allCorrected = enhanced
      allLog.push(...onlineLog)
    }

    if (useCitationStore.getState().citations.length === 0) {
      return allLog
    }

    const latestStore = useCitationStore.getState()
    latestStore.setCitations(allCorrected, 'autocorrect', `Autocorrect ${allLog.length} fix(es)`)
    const postIssues = validateCitations(allCorrected, latestStore.selectedStyleId ?? undefined)

    const postIssuesByCitation = new Map<string, number>()
    for (const issue of postIssues) {
      postIssuesByCitation.set(issue.citationId, (postIssuesByCitation.get(issue.citationId) ?? 0) + 1)
    }

    const statuses: Record<string, 'fixed' | 'partially-fixed' | 'has-issues' | 'pending'> = {}
    for (const item of allCorrected) {
      const had = preIssuesByCitation.get(item.id) ?? 0
      const has = postIssuesByCitation.get(item.id) ?? 0
      if (had === 0 && has === 0) statuses[item.id] = 'fixed'
      else if (had > 0 && has === 0) statuses[item.id] = 'fixed'
      else if (had > 0 && has < had) statuses[item.id] = 'partially-fixed'
      else if (has > 0) statuses[item.id] = 'has-issues'
      else statuses[item.id] = 'pending'
    }
    applyDerivedState(allCorrected, latestStore.selectedStyleId, {
      issues: postIssues,
      statuses
    })

    return allLog
  }, [applyDerivedState])

  const findMissingDoi = useCallback(async (citationId: string): Promise<CorrectionLog[]> => {
    const store = useCitationStore.getState()
    if (store.networkStatus !== 'online') return []

    const target = store.citations.find((item) => item.id === citationId)
    if (!target || target.DOI) return []

    const { enhanceCitationsOnline } = await import('../../engine/autocorrect/enhance')
    const { enhanced, log } = await enhanceCitationsOnline([target])
    const enhancedTarget = enhanced[0]

    if (!enhancedTarget || log.length === 0) return log

    const latestStore = useCitationStore.getState()
    const nextItems = latestStore.citations.map((item) => (
      item.id === citationId ? enhancedTarget : item
    ))

    latestStore.setCitations(nextItems, 'autocorrect', 'Find missing DOI')
    const postIssues = validateCitations(nextItems, latestStore.selectedStyleId ?? undefined)
    applyDerivedState(nextItems, latestStore.selectedStyleId, {
      issues: postIssues,
      statuses: buildValidationStatuses(nextItems, postIssues)
    })

    return log
  }, [applyDerivedState])

  const importFiles = useCallback(async (filePaths: string[]): Promise<void> => {
    for (const filePath of filePaths) {
      await processFile(filePath)
    }
  }, [processFile])

  const exportCitations = useCallback(async (format: ExportFormat): Promise<string> => {
    const store = useCitationStore.getState()
    const items = store.citations
    switch (format) {
      case 'csl-json':
        return JSON.stringify(items, null, 2)
      case 'plain-text':
        return store.formattedBibliography.replace(/<[^>]+>/g, '')
      case 'clipboard':
        return store.formattedBibliography.replace(/<[^>]+>/g, '')
      default:
        return JSON.stringify(items, null, 2)
    }
  }, [])

  const exportWithDialog = useCallback(async (): Promise<void> => {
    const store = useCitationStore.getState()
    if (store.citations.length === 0) return

    const path = await window.api?.saveFileDialog()
    if (!path) return

    const ext = path.split('.').pop()?.toLowerCase()
    const format: ExportFormat = ext === 'txt' ? 'plain-text' : 'csl-json'
    const content = await exportCitations(format)
    await window.api?.writeFile(path, content)
  }, [exportCitations])

  return {
    processRawInput,
    processFile,
    ingestItems,
    importFiles,
    resolveId,
    batchResolveIds,
    changeStyle,
    clearStyleTarget,
    runAutocorrect,
    findMissingDoi,
    refreshVerification,
    exportCitations,
    exportWithDialog,
    availableStyles: AVAILABLE_STYLES
  }
}
