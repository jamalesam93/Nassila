import type { CslItem, VerificationMismatch } from '../types'
import type { LayerVerdict } from '../manuscript/types'
import type { RegistrySource } from '../manuscript/verify'
import { registryCheckOneItem } from '../manuscript/verify'
import { applyVerificationMismatches } from './apply-mismatches'
import { doiConflictCitationIds } from './mismatch-kind'

/** Aligns with validator `year-range` rule so DOI/PMID rows most likely to need registry repair are verified first. */
export function isUnusualIssuedYear(
  item: CslItem,
  referenceCalendarYear = new Date().getFullYear()
): boolean {
  const year = item.issued?.['date-parts']?.[0]?.[0]
  return year != null && (year < 1450 || year > referenceCalendarYear + 2)
}

/** DOI/PMID/PMCID entries with unusual `issued` year first, then the rest (stable within each group). */
export function prioritizeVerifiableCitations(items: CslItem[], referenceCalendarYear = new Date().getFullYear()): CslItem[] {
  const withIdentifier = items.filter((item) => item.DOI || item.PMID || item.PMCID)
  const unusual = withIdentifier.filter((i) => isUnusualIssuedYear(i, referenceCalendarYear))
  const unusualIds = new Set(unusual.map((i) => i.id))
  const usual = withIdentifier.filter((i) => !unusualIds.has(i.id))
  return [...unusual, ...usual]
}

/** DOI/PMID/PMCID prioritized first, then other rows, capped — one pass for L1/L2 without duplicate fetches. */
export function prioritizeForUnifiedRegistryCheck(
  items: CslItem[],
  maxItems: number,
  referenceCalendarYear = new Date().getFullYear()
): CslItem[] {
  const primary = prioritizeVerifiableCitations(items, referenceCalendarYear)
  const seen = new Set(primary.map((i) => i.id))
  const rest = items.filter((i) => !seen.has(i.id))
  return [...primary, ...rest].slice(0, maxItems)
}

export type RegistryLayerSnapshot = {
  l1: LayerVerdict
  l2: LayerVerdict
  source: RegistrySource
  updatedAt: number
}

async function runRegistryChecksOnItems(items: CslItem[]): Promise<{
  layersByCitationId: Record<string, RegistryLayerSnapshot>
  mismatches: VerificationMismatch[]
}> {
  const layersByCitationId: Record<string, RegistryLayerSnapshot> = {}
  const mismatches: VerificationMismatch[] = []
  const concurrency = 3
  const now = Date.now()

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async (item) => {
        try {
          return await registryCheckOneItem(item)
        } catch {
          return {
            citationId: item.id,
            l1: { status: 'insufficient_evidence' as const, reason: 'Registry check failed (network or timeout)' },
            l2: { status: 'skipped' as const, reason: 'not_applicable' as const },
            source: 'none' as RegistrySource,
            mismatches: [] as VerificationMismatch[]
          }
        }
      })
    )
    for (const r of results) {
      layersByCitationId[r.citationId] = {
        l1: r.l1,
        l2: r.l2,
        source: r.source,
        updatedAt: now
      }
      mismatches.push(...r.mismatches)
    }
  }

  return { layersByCitationId, mismatches }
}

function mergeLayers(
  prev: Record<string, RegistryLayerSnapshot>,
  citations: CslItem[],
  patch: Record<string, RegistryLayerSnapshot>
): Record<string, RegistryLayerSnapshot> {
  const validIds = new Set(citations.map((c) => c.id))
  const next: Record<string, RegistryLayerSnapshot> = {}
  for (const [id, snap] of Object.entries(prev)) {
    if (validIds.has(id)) next[id] = snap
  }
  for (const [id, snap] of Object.entries(patch)) {
    if (validIds.has(id)) next[id] = snap
  }
  return next
}

/**
 * Unified L1 + L2 registry verification with optional auto-patch from mismatches.
 * Single network pass per item (no parallel verifyCitations + alignMetadata).
 */
export async function verifyUnifiedRegistryWithPatches(
  citations: CslItem[],
  maxItems: number
): Promise<{
  nextCitations: CslItem[]
  remainingMismatches: VerificationMismatch[]
  layersByCitationId: Record<string, RegistryLayerSnapshot>
}> {
  const slice = prioritizeForUnifiedRegistryCheck(citations, maxItems)

  if (slice.length === 0) {
    return { nextCitations: citations, remainingMismatches: [], layersByCitationId: {} }
  }

  const first = await runRegistryChecksOnItems(slice)
  if (first.mismatches.length === 0) {
    return {
      nextCitations: citations,
      remainingMismatches: [],
      layersByCitationId: mergeLayers({}, citations, first.layersByCitationId)
    }
  }

  // DOI↔title identity conflicts: never auto-patch any field; leave for manual UI.
  const conflictIds = doiConflictCitationIds(citations, first.mismatches)
  const autoApply = first.mismatches.filter((m) => !conflictIds.has(m.citationId))
  const heldConflicts = first.mismatches.filter((m) => conflictIds.has(m.citationId))

  const patched = applyVerificationMismatches(citations, autoApply)
  const anyRowChanged = patched.some((c, i) => c !== citations[i])
  if (!anyRowChanged) {
    return {
      nextCitations: citations,
      remainingMismatches: first.mismatches,
      layersByCitationId: mergeLayers({}, citations, first.layersByCitationId)
    }
  }

  const againSlice = prioritizeForUnifiedRegistryCheck(patched, maxItems)
  const second = await runRegistryChecksOnItems(againSlice)
  const secondNonConflict = second.mismatches.filter((m) => !conflictIds.has(m.citationId))
  const remainingMismatches = [...heldConflicts, ...secondNonConflict]

  return {
    nextCitations: patched,
    remainingMismatches,
    layersByCitationId: mergeLayers(first.layersByCitationId, patched, second.layersByCitationId)
  }
}
