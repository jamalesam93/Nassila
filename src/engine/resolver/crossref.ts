import type { CslItem, CslName } from '../types'
import { fetchWithPolicy, readJsonResponse } from '../network/http'

const CROSSREF_API = 'https://api.crossref.org/works'
const USER_AGENT = 'Nassila/1.0 (mailto:nassila-app@users.noreply.github.com)'

interface CrossRefWork {
  DOI: string
  type: string
  title?: string[]
  author?: { given?: string; family?: string; name?: string }[]
  'container-title'?: string[]
  volume?: string
  issue?: string
  page?: string
  published?: { 'date-parts'?: number[][] }
  'published-print'?: { 'date-parts'?: number[][] }
  'published-online'?: { 'date-parts'?: number[][] }
  ISSN?: string[]
  ISBN?: string[]
  publisher?: string
  'publisher-location'?: string
  abstract?: string
  URL?: string
  edition?: string
  subject?: string[]
}

function mapCrossRefType(type: string): string {
  const typeMap: Record<string, string> = {
    'journal-article': 'article-journal',
    'book-chapter': 'chapter',
    'proceedings-article': 'paper-conference',
    'posted-content': 'article',
    'monograph': 'book',
    'edited-book': 'book',
    'reference-book': 'book',
    'book': 'book',
    'report': 'report',
    'dataset': 'dataset',
    'dissertation': 'thesis',
    'standard': 'standard',
    'peer-review': 'review'
  }
  return typeMap[type] ?? 'article'
}

function mapAuthors(authors?: CrossRefWork['author']): CslName[] {
  if (!authors) return []
  return authors.map((a) => {
    if (a.name) return { literal: a.name }
    return { family: a.family ?? '', given: a.given ?? '' }
  })
}

export async function resolveDoi(doi: string): Promise<CslItem | null> {
  try {
    const response = await fetchWithPolicy(`${CROSSREF_API}/${encodeURIComponent(doi)}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) return null

    const data = await readJsonResponse<{ message: CrossRefWork }>(response)
    const work = data.message

    const dateParts =
      work.published?.['date-parts'] ??
      work['published-print']?.['date-parts'] ??
      work['published-online']?.['date-parts']

    const item: CslItem = {
      id: `doi-${doi.replace(/[^a-zA-Z0-9]/g, '-')}`,
      type: mapCrossRefType(work.type) as CslItem['type'],
      title: work.title?.[0],
      author: mapAuthors(work.author),
      'container-title': work['container-title']?.[0],
      volume: work.volume,
      issue: work.issue,
      page: work.page,
      DOI: work.DOI,
      ISSN: work.ISSN?.[0],
      ISBN: work.ISBN?.[0],
      publisher: work.publisher,
      'publisher-place': work['publisher-location'],
      URL: work.URL,
      abstract: work.abstract,
      issued: dateParts ? { 'date-parts': dateParts } : undefined,
      _sourceFormat: 'doi',
      _parseConfidence: 1.0
    }

    return item
  } catch {
    return null
  }
}

export async function searchCrossRef(
  query: string,
  rows = 5,
  options: { bibliographic?: boolean } = {}
): Promise<CslItem[]> {
  try {
    // `query.bibliographic` is Crossref's purpose-built endpoint for messy raw
    // citation strings (whole references). It tolerates wrong order, missing
    // fields, and Vancouver vs APA formatting better than the generic `query`.
    const param = options.bibliographic ? 'query.bibliographic' : 'query'
    const response = await fetchWithPolicy(
      `${CROSSREF_API}?${param}=${encodeURIComponent(query)}&rows=${rows}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) return []

    const data = await readJsonResponse<{ message: { items: CrossRefWork[] } }>(response)
    const results: CslItem[] = []

    for (const work of data.message.items) {
      if (work.DOI) {
        const dateParts =
          work.published?.['date-parts'] ??
          work['published-print']?.['date-parts']

        results.push({
          id: `doi-${work.DOI.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: mapCrossRefType(work.type) as CslItem['type'],
          title: work.title?.[0],
          author: mapAuthors(work.author),
          'container-title': work['container-title']?.[0],
          volume: work.volume,
          issue: work.issue,
          page: work.page,
          DOI: work.DOI,
          issued: dateParts ? { 'date-parts': dateParts } : undefined,
          _sourceFormat: 'doi',
          _parseConfidence: 1.0
        })
      }
    }

    return results
  } catch {
    return []
  }
}
