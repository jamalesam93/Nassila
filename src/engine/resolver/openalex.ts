import type { CslItem, CslItemType, CslName } from '../types'
import { fetchWithPolicy, readJsonResponse } from '../network/http'

const OPENALEX_API = 'https://api.openalex.org'
const USER_AGENT = 'Nassila/1.0 (mailto:nassila-app@users.noreply.github.com)'
const MAX_ABSTRACT_TOKENS = 5000

interface OpenAlexWork {
  id: string
  doi?: string
  title?: string
  display_name?: string
  publication_year?: number
  publication_date?: string
  type?: string
  authorships?: {
    author: { display_name?: string }
    raw_affiliation_strings?: string[]
  }[]
  primary_location?: {
    source?: { display_name?: string; type?: string; issn_l?: string; host_organization_name?: string }
    landing_page_url?: string
    pdf_url?: string
  }
  biblio?: {
    volume?: string
    issue?: string
    first_page?: string
    last_page?: string
  }
  host_venue?: {
    display_name?: string
    publisher?: string
    type?: string
  }
  open_access?: {
    oa_url?: string
    is_oa?: boolean
  }
  abstract_inverted_index?: Record<string, number[]>
  cited_by_count?: number
  ids?: {
    doi?: string
    pmid?: string
    pmcid?: string
    openalex?: string
  }
}

function mapOpenAlexType(type?: string): CslItemType {
  const typeMap: Record<string, CslItemType> = {
    'journal-article': 'article-journal',
    'article': 'article-journal',
    'book-chapter': 'chapter',
    'book': 'book',
    'proceedings-article': 'paper-conference',
    'proceedings': 'paper-conference',
    'dissertation': 'thesis',
    'dataset': 'dataset',
    'report': 'report',
    'standard': 'standard',
    'preprint': 'article',
    'posted-content': 'article',
    'review': 'review',
    'editorial': 'article-journal',
    'letter': 'article-journal',
    'peer-review': 'review',
    'paratext': 'document',
    'grant': 'report',
    'other': 'document'
  }
  return typeMap[type ?? ''] ?? 'article-journal'
}

function mapAuthors(authorships?: OpenAlexWork['authorships']): CslName[] {
  if (!authorships) return []
  return authorships.map((a) => {
    const name = a.author.display_name ?? ''
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') }
    }
    return { literal: name }
  })
}

function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | undefined {
  if (!invertedIndex) return undefined
  const entries = Object.entries(invertedIndex)
  if (entries.length === 0) return undefined

  const words: [number, string][] = []
  for (const [word, positions] of entries) {
    for (const pos of positions) {
      words.push([pos, word])
      if (words.length > MAX_ABSTRACT_TOKENS) {
        return undefined
      }
    }
  }
  words.sort((a, b) => a[0] - b[0])
  return words.map(([, w]) => w).join(' ')
}

export async function searchOpenAlex(
  query: string,
  type?: string,
  rows = 5
): Promise<CslItem[]> {
  try {
    let url = `${OPENALEX_API}/works?search=${encodeURIComponent(query)}&per_page=${rows}`
    if (type) {
      url += `&filter=type:${type}`
    }
    url += '&mailto=nassila-app@users.noreply.github.com'

    const response = await fetchWithPolicy(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }
    })

    if (!response.ok) return []

    const data = await readJsonResponse<{ results: OpenAlexWork[] }>(response)
    return data.results.map(workToCsl)
  } catch {
    return []
  }
}

export async function resolveOpenAlexDoi(doi: string): Promise<CslItem | null> {
  try {
    const url = `${OPENALEX_API}/works/doi:${encodeURIComponent(doi)}?mailto=nassila-app@users.noreply.github.com`
    const response = await fetchWithPolicy(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }
    })

    if (!response.ok) return null

    const data = await readJsonResponse<OpenAlexWork>(response)
    return workToCsl(data)
  } catch {
    return null
  }
}

function workToCsl(work: OpenAlexWork): CslItem {
  const doi = (work.doi ?? work.ids?.doi ?? '').replace(/^https?:\/\/doi\.org\//i, '')

  const item: CslItem = {
    id: `openalex-${work.id?.replace(/^https?:\/\/openalex\.org\//, '') ?? doi.replace(/[^a-zA-Z0-9]/g, '-')}`,
    type: mapOpenAlexType(work.type),
    title: work.title ?? work.display_name,
    author: mapAuthors(work.authorships),
    DOI: doi || undefined,
    issued: work.publication_year ? { 'date-parts': [[work.publication_year]] } : undefined,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    _sourceFormat: 'doi',
    _parseConfidence: 0.9
  }

  if (work.primary_location?.source) {
    item['container-title'] = work.primary_location.source.display_name
    if (work.primary_location.source.issn_l) {
      item.ISSN = work.primary_location.source.issn_l
    }
  }

  if (work.primary_location?.landing_page_url) {
    item.URL = work.primary_location.landing_page_url
  } else if (work.open_access?.oa_url) {
    item.URL = work.open_access.oa_url
  }

  if (work.host_venue?.publisher) {
    item.publisher = work.host_venue.publisher
  } else if (work.primary_location?.source?.host_organization_name) {
    item.publisher = work.primary_location.source.host_organization_name
  }

  if (work.biblio) {
    if (work.biblio.volume) item.volume = work.biblio.volume
    if (work.biblio.issue) item.issue = work.biblio.issue
    if (work.biblio.first_page) {
      item.page = work.biblio.last_page
        ? `${work.biblio.first_page}-${work.biblio.last_page}`
        : work.biblio.first_page
    }
  }

  if (work.ids?.pmid) {
    item.PMID = work.ids.pmid.replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, '')
  }

  return item
}
