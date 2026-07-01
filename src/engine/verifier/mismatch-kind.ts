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

export function partitionMismatches(
  citations: CslItem[],
  mismatches: VerificationMismatch[]
): {
  cosmetic: VerificationMismatch[]
  doiConflicts: VerificationMismatch[]
} {
  const byId = new Map(citations.map((c) => [c.id, c]))
  const cosmetic: VerificationMismatch[] = []
  const doiConflicts: VerificationMismatch[] = []
  for (const m of mismatches) {
    const cite = byId.get(m.citationId)
    if (cite && isDoiTitleConflict(cite, m)) {
      doiConflicts.push(m)
    } else {
      cosmetic.push(m)
    }
  }
  return { cosmetic, doiConflicts }
}
