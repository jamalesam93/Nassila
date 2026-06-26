import type { CslItem } from '../types'
import { resolveDoi } from './crossref'
import { resolvePmid } from './pubmed'
import { resolveIsbn } from './isbn'
import { resolveUrl, normalizeDoiFromMeta } from './url'
import { isDataCiteDoi, resolveDataCiteDoi } from './datacite'

export type IdentifierType = 'doi' | 'isbn' | 'pmid' | 'url' | 'unknown'

export function detectIdentifierType(input: string): IdentifierType {
  const trimmed = input.trim()
  if (/^10\.\d{4,}\//.test(trimmed)) return 'doi'
  if (/^https?:\/\/doi\.org\//i.test(trimmed)) return 'doi'
  if (/^\d{10}$/.test(trimmed.replace(/-/g, '')) || /^\d{13}$/.test(trimmed.replace(/-/g, ''))) return 'isbn'
  if (/^\d{6,8}$/.test(trimmed)) return 'pmid'
  if (/^https?:\/\//i.test(trimmed)) return 'url'
  return 'unknown'
}

export function cleanIdentifier(input: string, type: IdentifierType): string {
  const trimmed = input.trim()
  switch (type) {
    case 'doi': {
      const normalized = normalizeDoiFromMeta(trimmed)
      return normalized ?? trimmed.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '').trim()
    }
    case 'isbn':
      return trimmed.replace(/-/g, '')
    case 'pmid':
      return trimmed.replace(/^pmid:?\s*/i, '').replace(/\D/g, '')
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
    case 'isbn':
      return resolveIsbn(cleaned)
    case 'pmid':
      return resolvePmid(cleaned)
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
