import type { CslItem, VerificationMismatch } from '../types'
import { bibliographySupportsRegistryTitle } from '../manuscript/verify'

export type TitleMismatchKind = 'cosmetic' | 'doi_conflict'

/** Title mismatch where the DOI's registry record describes a different work than the row. */
export function isDoiTitleConflict(citation: CslItem, mismatch: VerificationMismatch): boolean {
  if (mismatch.field !== 'title') return false
  const anchor =
    citation._original?.trim() ||
    citation.title?.trim() ||
    mismatch.userValue?.trim()
  const canonical = mismatch.canonicalValue?.trim()
  if (!anchor || !canonical) return false
  return !bibliographySupportsRegistryTitle(anchor, canonical)
}

export function titleMismatchKind(
  citation: CslItem,
  mismatch: VerificationMismatch
): TitleMismatchKind {
  return isDoiTitleConflict(citation, mismatch) ? 'doi_conflict' : 'cosmetic'
}

/** Citation ids that have at least one DOI↔title identity conflict. */
export function doiConflictCitationIds(
  citations: CslItem[],
  mismatches: VerificationMismatch[]
): Set<string> {
  const byId = new Map(citations.map((c) => [c.id, c]))
  const ids = new Set<string>()
  for (const m of mismatches) {
    const cite = byId.get(m.citationId)
    if (cite && isDoiTitleConflict(cite, m)) {
      ids.add(m.citationId)
    }
  }
  return ids
}

export function partitionMismatches(
  citations: CslItem[],
  mismatches: VerificationMismatch[]
): {
  cosmetic: VerificationMismatch[]
  doiConflicts: VerificationMismatch[]
} {
  const conflictIds = doiConflictCitationIds(citations, mismatches)
  const cosmetic: VerificationMismatch[] = []
  const doiConflicts: VerificationMismatch[] = []
  for (const m of mismatches) {
    if (conflictIds.has(m.citationId)) {
      doiConflicts.push(m)
    } else {
      cosmetic.push(m)
    }
  }
  return { cosmetic, doiConflicts }
}
