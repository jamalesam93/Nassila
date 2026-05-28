import type { CslItem, VerificationMismatch } from '../types'
import { fetchWithPolicy, readJsonResponse } from '../network/http'

const CROSSREF_API = 'https://api.crossref.org/works'

let mismatchIdCounter = 0

export async function verifyAgainstCrossRef(item: CslItem): Promise<VerificationMismatch[]> {
  if (!item.DOI) return []

  try {
    const response = await fetchWithPolicy(`${CROSSREF_API}/${encodeURIComponent(item.DOI)}`, {
      headers: {
        'User-Agent': 'Nassila/1.0 (mailto:nassila-app@users.noreply.github.com)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) return []

    const data = await readJsonResponse<{ message: Record<string, unknown> }>(response)
    const canonical = data.message
    const mismatches: VerificationMismatch[] = []

    // Compare title
    const canonicalTitle = (canonical.title as string[])?.[0]
    if (canonicalTitle && item.title) {
      const normalizedCanonical = canonicalTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      const normalizedUser = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      if (normalizedCanonical !== normalizedUser && levenshteinRatio(normalizedCanonical, normalizedUser) < 0.9) {
        mismatches.push({
          id: `mismatch-${++mismatchIdCounter}`,
          citationId: item.id,
          field: 'title',
          userValue: item.title,
          canonicalValue: canonicalTitle,
          source: 'crossref'
        })
      }
    }

    // Compare year
    const canonicalDate = canonical.published as { 'date-parts'?: number[][] }
    const canonicalYear = canonicalDate?.['date-parts']?.[0]?.[0]
    const userYear = item.issued?.['date-parts']?.[0]?.[0]
    if (canonicalYear && userYear && canonicalYear !== userYear) {
      mismatches.push({
        id: `mismatch-${++mismatchIdCounter}`,
        citationId: item.id,
        field: 'year',
        userValue: String(userYear),
        canonicalValue: String(canonicalYear),
        source: 'crossref'
      })
    }

    // Compare volume
    const canonicalVolume = canonical.volume as string | undefined
    if (canonicalVolume && item.volume && canonicalVolume !== item.volume) {
      mismatches.push({
        id: `mismatch-${++mismatchIdCounter}`,
        citationId: item.id,
        field: 'volume',
        userValue: item.volume,
        canonicalValue: canonicalVolume,
        source: 'crossref'
      })
    }

    // Compare pages
    const canonicalPage = canonical.page as string | undefined
    if (canonicalPage && item.page) {
      const normCanonical = canonicalPage.replace(/[\u2013–—]/g, '-')
      const normUser = item.page.replace(/[\u2013–—]/g, '-')
      if (normCanonical !== normUser) {
        mismatches.push({
          id: `mismatch-${++mismatchIdCounter}`,
          citationId: item.id,
          field: 'page',
          userValue: item.page,
          canonicalValue: canonicalPage,
          source: 'crossref'
        })
      }
    }

    if (!item.volume && canonicalVolume) {
      mismatches.push({
        id: `mismatch-${++mismatchIdCounter}`,
        citationId: item.id,
        field: 'volume',
        userValue: '(missing)',
        canonicalValue: canonicalVolume,
        source: 'crossref'
      })
    }

    if (!item.page && canonicalPage) {
      mismatches.push({
        id: `mismatch-${++mismatchIdCounter}`,
        citationId: item.id,
        field: 'page',
        userValue: '(missing)',
        canonicalValue: canonicalPage,
        source: 'crossref'
      })
    }

    return mismatches
  } catch {
    return []
  }
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1

  const matrix: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen
}
