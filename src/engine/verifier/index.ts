import type { CslItem, VerificationMismatch } from '../types'
import { verifyAgainstCrossRef } from './crossref-verify'
import { verifyAgainstPubMed } from './pubmed-verify'

export async function verifyCitations(
  items: CslItem[],
  onProgress?: (completed: number, total: number) => void
): Promise<VerificationMismatch[]> {
  const mismatches: VerificationMismatch[] = []
  const concurrency = 3

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        if (item.DOI) {
          return verifyAgainstCrossRef(item)
        }
        if (item.PMID) {
          return verifyAgainstPubMed(item)
        }
        return []
      })
    )
    for (const result of batchResults) {
      mismatches.push(...result)
    }
    onProgress?.(Math.min(i + concurrency, items.length), items.length)
  }

  return mismatches
}
