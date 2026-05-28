import type { CslItem, VerificationMismatch } from '../types'
import { fetchWithPolicy, readJsonResponse } from '../network/http'

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

let mismatchIdCounter = 1000

export async function verifyAgainstPubMed(item: CslItem): Promise<VerificationMismatch[]> {
  if (!item.PMID) return []

  try {
    if (!/^\d+$/.test(item.PMID)) return []

    const url = `${EUTILS_BASE}/esummary.fcgi?db=pubmed&id=${item.PMID}&retmode=json`
    const response = await fetchWithPolicy(url)
    if (!response.ok) return []

    const data = await readJsonResponse<{ result: Record<string, Record<string, unknown>> }>(response)
    const article = data.result[item.PMID]
    if (!article) return []

    const mismatches: VerificationMismatch[] = []

    // Compare title
    const canonicalTitle = article.title as string | undefined
    if (canonicalTitle && item.title) {
      const normC = canonicalTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      const normU = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      if (normC !== normU) {
        mismatches.push({
          id: `pm-mismatch-${++mismatchIdCounter}`,
          citationId: item.id,
          field: 'title',
          userValue: item.title,
          canonicalValue: canonicalTitle,
          source: 'pubmed'
        })
      }
    }

    // Compare journal
    const canonicalJournal = article.fulljournalname as string | undefined
    if (canonicalJournal && item['container-title']) {
      const normC = canonicalJournal.toLowerCase().trim()
      const normU = item['container-title'].toLowerCase().trim()
      if (normC !== normU && !normC.includes(normU) && !normU.includes(normC)) {
        mismatches.push({
          id: `pm-mismatch-${++mismatchIdCounter}`,
          citationId: item.id,
          field: 'container-title',
          userValue: item['container-title'],
          canonicalValue: canonicalJournal,
          source: 'pubmed'
        })
      }
    }

    // Compare volume
    const canonicalVolume = article.volume as string | undefined
    if (canonicalVolume && item.volume && canonicalVolume !== item.volume) {
      mismatches.push({
        id: `pm-mismatch-${++mismatchIdCounter}`,
        citationId: item.id,
        field: 'volume',
        userValue: item.volume,
        canonicalValue: canonicalVolume,
        source: 'pubmed'
      })
    }

    return mismatches
  } catch {
    return []
  }
}
