import type { CslItem } from '../types'
import { resolveDoi } from './crossref'
import { resolvePmcid, resolvePmid } from './pubmed'
import { resolveIsbn } from './isbn'
import { resolveUrl, normalizeDoiFromMeta } from './url'
import { isDataCiteDoi, resolveDataCiteDoi } from './datacite'

export type IdentifierType = 'doi' | 'isbn' | 'pmid' | 'pmcid' | 'url' | 'unknown'

export function detectIdentifierType(input: string): IdentifierType {
  const trimmed = input.trim()

  // 1. DOI
  if (/(?:doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[^\s?#]+)/i.test(trimmed)) {
    return 'doi'
  }

  // 2. PMCID (e.g. PMC1234567, PMC 1234567, PMCID: 1234567, or https://.../pmc/articles/PMC1234567/)
  if (
    /(?:PMC(?:ID)?[:/\s-]*)(\d+)/i.test(trimmed) ||
    /pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC(\d+)/i.test(trimmed) ||
    /ncbi\.nlm\.nih\.gov\/pmc\/articles\/PMC(\d+)/i.test(trimmed)
  ) {
    return 'pmcid'
  }

  // 3. PMID (e.g. 35000000, PMID: 35000000, PMID 35000000, pmid:35000000, or https://pubmed.ncbi.nlm.nih.gov/35000000/)
  if (
    /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i.test(trimmed) ||
    /ncbi\.nlm\.nih\.gov\/pubmed\/(\d+)/i.test(trimmed)
  ) {
    return 'pmid'
  }
  if (/^(?:PMID:?\s*)?\d{1,9}$/i.test(trimmed)) {
    return 'pmid'
  }

  // 4. ISBN
  if (/^\d{10}$/.test(trimmed.replace(/-/g, '')) || /^\d{13}$/.test(trimmed.replace(/-/g, ''))) {
    return 'isbn'
  }

  // 5. Generic URL
  if (/^https?:\/\//i.test(trimmed)) {
    return 'url'
  }

  return 'unknown'
}

export function cleanIdentifier(input: string, type: IdentifierType): string {
  const trimmed = input.trim()
  switch (type) {
    case 'doi': {
      const normalized = normalizeDoiFromMeta(trimmed)
      const match = trimmed.match(/10\.\d{4,9}\/[^\s?#]+/i)?.[0]
      return normalized ?? match ?? trimmed.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '').trim()
    }
    case 'pmcid': {
      const match = trimmed.match(/(?:PMC(?:ID)?[:/\s-]*)?(\d+)/i)?.[1]
      return match ? `PMC${match}` : trimmed
    }
    case 'pmid': {
      const urlMatch = trimmed.match(/(?:pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov\/pubmed)\/(\d+)/i)?.[1]
      if (urlMatch) return urlMatch
      return trimmed.replace(/^pmid:?\s*/i, '').replace(/\D/g, '')
    }
    case 'isbn':
      return trimmed.replace(/-/g, '')
    default:
      return trimmed
  }
}

export async function resolveIdentifier(input: string): Promise<CslItem | null> {
  const type = detectIdentifierType(input)
  const cleaned = cleanIdentifier(input, type)

  switch (type) {
    case 'doi': {
      if (isDataCiteDoi(cleaned)) {
        const dcResult = await resolveDataCiteDoi(cleaned)
        if (dcResult) return dcResult
      }
      return resolveDoi(cleaned)
    }
    case 'pmcid':
      return resolvePmcid(cleaned)
    case 'pmid':
      return resolvePmid(cleaned)
    case 'isbn':
      return resolveIsbn(cleaned)
    case 'url':
      return resolveUrl(cleaned)
    default:
      return null
  }
}

export async function batchResolve(
  inputs: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<(CslItem | null)[]> {
  const results: (CslItem | null)[] = []
  const concurrency = 3

  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(resolveIdentifier))
    results.push(...batchResults)
    onProgress?.(results.length, inputs.length)
  }

  return results
}
