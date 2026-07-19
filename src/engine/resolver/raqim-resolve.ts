import type { CslItem, CslName } from '../types'
import type {
  RaqimCandidateKind,
  RaqimCandidateProvider,
  RaqimLookupKind,
  RaqimLookupRequest,
  RaqimResolveCandidate
} from '../../shared/raqim-resolve'
import { fetchWithPolicy, readJsonResponse } from '../network/http'
import { searchCrossRef, resolveDoi } from './crossref'
import { pmcidToPmid, resolvePmid, searchPubMed } from './pubmed'
import { resolveOpenAlexDoi, resolveOpenAlexPmid, searchOpenAlex } from './openalex'
import { resolveDataCiteDoi, searchDataCite } from './datacite'

/** Candidates below this score are too weak to present as suggested matches. */
export const RAQIM_CANDIDATE_THRESHOLD = 0.42
const MAX_QUERY_LENGTH = 500
const MAX_CANDIDATES = 12

type RawCandidate = {
  provider: RaqimCandidateProvider
  kind?: RaqimCandidateKind
  item: CslItem
  exact?: boolean
}

function normalizeText(value: string | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(value: string | undefined): Set<string> {
  return new Set(normalizeText(value).split(/\s+/).filter((word) => word.length > 2))
}

export function textSimilarity(a: string | undefined, b: string | undefined): number {
  const left = tokens(a)
  const right = tokens(b)
  if (left.size === 0 || right.size === 0) return 0
  let overlap = 0
  for (const word of left) {
    if (right.has(word)) overlap += 1
  }
  return (2 * overlap) / (left.size + right.size)
}

function year(item: CslItem): number | undefined {
  return item.issued?.['date-parts']?.[0]?.[0]
}

function firstAuthor(item: CslItem): string | undefined {
  const name = item.author?.[0]
  return name?.family ?? name?.literal
}

function normalizedDoi(value: string | undefined): string {
  return (value ?? '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase().trim()
}

export function rankRaqimCandidate(
  queryItem: CslItem,
  raw: RawCandidate
): RaqimResolveCandidate {
  const matchedFields: string[] = []
  const mismatchReasons: string[] = []
  const candidate = raw.item
  const titleScore = textSimilarity(queryItem.title, candidate.title)
  let confidence = raw.exact ? 0.82 : titleScore * 0.62

  if (titleScore >= 0.75) matchedFields.push('title')
  else if (queryItem.title && candidate.title) mismatchReasons.push('title')

  const queryDoi = normalizedDoi(queryItem.DOI)
  const candidateDoi = normalizedDoi(candidate.DOI)
  if (queryDoi && candidateDoi) {
    if (queryDoi === candidateDoi) {
      confidence += 0.2
      matchedFields.push('DOI')
    } else {
      mismatchReasons.push('DOI')
    }
  }

  if (queryItem.PMID && candidate.PMID) {
    if (queryItem.PMID.replace(/\D/g, '') === candidate.PMID.replace(/\D/g, '')) {
      confidence += 0.2
      matchedFields.push('PMID')
    } else {
      mismatchReasons.push('PMID')
    }
  }

  const queryYear = year(queryItem)
  const candidateYear = year(candidate)
  if (queryYear && candidateYear) {
    if (queryYear === candidateYear) {
      confidence += 0.1
      matchedFields.push('year')
    } else {
      mismatchReasons.push('year')
      confidence -= Math.abs(queryYear - candidateYear) > 1 ? 0.08 : 0.03
    }
  }

  const authorScore = textSimilarity(firstAuthor(queryItem), firstAuthor(candidate))
  if (authorScore >= 0.8) {
    confidence += 0.08
    matchedFields.push('author')
  } else if (firstAuthor(queryItem) && firstAuthor(candidate)) {
    mismatchReasons.push('author')
  }

  if (queryItem.type === candidate.type) {
    confidence += 0.04
    matchedFields.push('type')
  } else if (queryItem.type && candidate.type) {
    mismatchReasons.push('type')
  }

  return {
    id: `${raw.provider}:${candidate.DOI ?? candidate.PMID ?? candidate.URL ?? candidate.id}`,
    provider: raw.provider,
    kind: raw.kind ?? classifyCandidate(candidate, raw.provider),
    confidence: Math.max(0, Math.min(1, Number(confidence.toFixed(3)))),
    matchedFields,
    mismatchReasons,
    item: candidate
  }
}

function classifyCandidate(item: CslItem, provider: RaqimCandidateProvider): RaqimCandidateKind {
  if (provider === 'huggingface') {
    return item.type === 'dataset' ? 'dataset' : 'model_card'
  }
  if (item.type === 'dataset') return 'dataset'
  if (item.type === 'software') return 'software_release'
  if (item.type === 'report' || item.type === 'article') return 'scholarly_report'
  return 'artifact_citation'
}

function detectLookup(key: string, explicit?: RaqimLookupKind): { kind: RaqimLookupKind; value: string } {
  const value = key.trim().slice(0, MAX_QUERY_LENGTH)
  if (explicit) return { kind: explicit, value }
  const doi = value.match(/(?:doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[^\s?#]+)/i)?.[1]
  if (doi) return { kind: 'doi', value: doi.replace(/[.,;)]+$/, '') }
  const pmcid = value.match(/(?:PMC(?:ID)?[:/\s-]*)(\d+)/i)?.[1]
  if (pmcid) return { kind: 'pmcid', value: `PMC${pmcid}` }
  const pubmed = value.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1]
  if (pubmed) return { kind: 'pmid', value: pubmed }
  if (/^(?:PMID:\s*)?\d{6,9}$/i.test(value)) {
    return { kind: 'pmid', value: value.replace(/\D/g, '') }
  }
  if (/^https:\/\//i.test(value)) return { kind: 'url', value }
  return { kind: 'title', value }
}

async function exactRegistryCandidates(kind: RaqimLookupKind, value: string): Promise<RawCandidate[]> {
  if (kind === 'pmcid') {
    const pmid = await pmcidToPmid(value)
    if (!pmid) return []
    return exactRegistryCandidates('pmid', pmid)
  }
  if (kind === 'pmid') {
    const [pubmed, openalex] = await Promise.all([
      resolvePmid(value),
      resolveOpenAlexPmid(value)
    ])
    return [
      ...(pubmed ? [{ provider: 'pubmed' as const, item: pubmed, exact: true }] : []),
      ...(openalex ? [{ provider: 'openalex' as const, item: openalex, exact: true }] : [])
    ]
  }
  if (kind === 'doi') {
    const [crossref, openalex, datacite] = await Promise.all([
      resolveDoi(value),
      resolveOpenAlexDoi(value),
      resolveDataCiteDoi(value)
    ])
    return [
      ...(crossref ? [{ provider: 'crossref' as const, item: crossref, exact: true }] : []),
      ...(openalex ? [{ provider: 'openalex' as const, item: openalex, exact: true }] : []),
      ...(datacite ? [{ provider: 'datacite' as const, item: datacite, exact: true }] : [])
    ]
  }
  return []
}

async function titleRegistryCandidates(item: CslItem, query: string): Promise<RawCandidate[]> {
  const queryItem = { ...item, title: query }
  const [crossref, pubmed, openalex, datacite] = await Promise.all([
    searchCrossRef(query, 5, { bibliographic: true }),
    searchPubMed(queryItem, 5),
    searchOpenAlex(query, undefined, 5),
    searchDataCite(query, undefined, 5)
  ])
  return [
    ...crossref.map((candidate) => ({ provider: 'crossref' as const, item: candidate })),
    ...pubmed.map((candidate) => ({ provider: 'pubmed' as const, item: candidate })),
    ...openalex.map((candidate) => ({ provider: 'openalex' as const, item: candidate })),
    ...datacite.map((candidate) => ({ provider: 'datacite' as const, item: candidate }))
  ]
}

function literalAuthor(name: string | null | undefined): CslName[] | undefined {
  return name ? [{ family: '', literal: name }] : undefined
}

async function searchHuggingFace(query: string): Promise<RawCandidate[]> {
  try {
    const [modelsResponse, datasetsResponse] = await Promise.all([
      fetchWithPolicy(`https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=3`),
      fetchWithPolicy(`https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=3`)
    ])
    const results: RawCandidate[] = []
    if (modelsResponse.ok) {
      const models = await readJsonResponse<{ id: string; author?: string; lastModified?: string }[]>(modelsResponse)
      for (const model of models) {
        results.push({
          provider: 'huggingface',
          kind: 'model_card',
          item: {
            id: `hf-model-${model.id}`,
            type: 'software',
            title: model.id,
            author: literalAuthor(model.author),
            publisher: 'Hugging Face',
            URL: `https://huggingface.co/${model.id}`,
            issued: model.lastModified ? { raw: model.lastModified } : undefined
          }
        })
      }
    }
    if (datasetsResponse.ok) {
      const datasets = await readJsonResponse<{ id: string; author?: string; lastModified?: string }[]>(datasetsResponse)
      for (const dataset of datasets) {
        results.push({
          provider: 'huggingface',
          kind: 'dataset',
          item: {
            id: `hf-dataset-${dataset.id}`,
            type: 'dataset',
            title: dataset.id,
            author: literalAuthor(dataset.author),
            publisher: 'Hugging Face',
            URL: `https://huggingface.co/datasets/${dataset.id}`,
            issued: dataset.lastModified ? { raw: dataset.lastModified } : undefined
          }
        })
      }
    }
    return results
  } catch {
    return []
  }
}

async function resolveHostUrl(rawUrl: string): Promise<RawCandidate[]> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return []
  }

  const doi = rawUrl.match(/10\.\d{4,9}\/[^\s?#]+/i)?.[0]
  if (doi) return exactRegistryCandidates('doi', doi)
  const pubmed = rawUrl.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1]
  if (pubmed) return exactRegistryCandidates('pmid', pubmed)
  const pmcid = rawUrl.match(/(?:pmc\.ncbi\.nlm\.nih\.gov\/articles\/)?PMC(\d+)/i)?.[1]
  if (pmcid) return exactRegistryCandidates('pmcid', `PMC${pmcid}`)

  if (url.hostname === 'huggingface.co') {
    const parts = url.pathname.split('/').filter(Boolean)
    const isDataset = parts[0] === 'datasets'
    const idParts = isDataset ? parts.slice(1, 3) : parts.slice(0, 2)
    if (idParts.length < 2) return []
    const id = idParts.join('/')
    const endpoint = isDataset ? 'datasets' : 'models'
    const response = await fetchWithPolicy(`https://huggingface.co/api/${endpoint}/${id}`)
    if (!response.ok) return []
    const data = await readJsonResponse<{ id: string; author?: string; lastModified?: string }>(response)
    return [{
      provider: 'huggingface',
      kind: isDataset ? 'dataset' : 'model_card',
      exact: true,
      item: {
        id: `hf-${isDataset ? 'dataset' : 'model'}-${data.id}`,
        type: isDataset ? 'dataset' : 'software',
        title: data.id,
        author: literalAuthor(data.author),
        publisher: 'Hugging Face',
        URL: rawUrl,
        issued: data.lastModified ? { raw: data.lastModified } : undefined
      }
    }]
  }

  const kaggle = url.hostname.endsWith('kaggle.com') && url.pathname.match(/^\/datasets\/([^/]+)\/([^/]+)/)
  if (kaggle) {
    const [, owner, slug] = kaggle
    const response = await fetchWithPolicy(`https://www.kaggle.com/api/v1/datasets/view/${owner}/${slug}`)
    if (!response.ok) return []
    const data = await readJsonResponse<{ title?: string; subtitleNullable?: string; ownerName?: string; lastUpdated?: string }>(response)
    return [{
      provider: 'kaggle',
      kind: 'dataset',
      exact: true,
      item: {
        id: `kaggle-${owner}-${slug}`,
        type: 'dataset',
        title: data.title ?? slug.replace(/-/g, ' '),
        author: literalAuthor(data.ownerName ?? owner),
        publisher: 'Kaggle',
        URL: rawUrl,
        abstract: data.subtitleNullable,
        issued: data.lastUpdated ? { raw: data.lastUpdated } : undefined
      }
    }]
  }

  const github = url.hostname === 'github.com' && url.pathname.match(/^\/([^/]+)\/([^/]+)\/releases(?:\/tag\/([^/]+))?/)
  if (github) {
    const [, owner, repo, tag] = github
    const endpoint = tag
      ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`
      : `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    const response = await fetchWithPolicy(endpoint, { headers: { 'Accept': 'application/vnd.github+json' } })
    if (!response.ok) return []
    const data = await readJsonResponse<{ name?: string; tag_name: string; published_at?: string; html_url: string; author?: { login?: string } }>(response)
    return [{
      provider: 'github',
      kind: 'software_release',
      exact: true,
      item: {
        id: `github-${owner}-${repo}-${data.tag_name}`,
        type: 'software',
        title: data.name ?? `${repo} ${data.tag_name}`,
        author: literalAuthor(data.author?.login ?? owner),
        publisher: 'GitHub',
        version: data.tag_name,
        URL: data.html_url,
        issued: data.published_at ? { raw: data.published_at } : undefined
      }
    }]
  }

  return []
}

function deduplicate(candidates: RaqimResolveCandidate[]): RaqimResolveCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = normalizedDoi(candidate.item.DOI) ||
      candidate.item.PMID ||
      normalizeText(candidate.item.URL) ||
      `${normalizeText(candidate.item.title)}:${year(candidate.item) ?? ''}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function lookupRaqimCandidates(request: RaqimLookupRequest): Promise<RaqimResolveCandidate[]> {
  const fallbackKey = request.item.DOI ?? request.item.PMID ?? request.item.PMCID ??
    request.item.URL ?? request.item.title ?? ''
  const lookup = detectLookup(request.key?.trim() || fallbackKey, request.kind)
  if (lookup.value.length < 2) return []

  let raw: RawCandidate[]
  if (lookup.kind === 'url') {
    try {
      raw = await resolveHostUrl(lookup.value)
    } catch {
      raw = []
    }
    if (raw.length === 0) {
      raw = await titleRegistryCandidates(request.item, request.item.title ?? lookup.value)
    }
  } else if (lookup.kind === 'title') {
    const [registry, huggingFace] = await Promise.all([
      titleRegistryCandidates(request.item, lookup.value),
      searchHuggingFace(lookup.value)
    ])
    raw = [...registry, ...huggingFace]
  } else {
    raw = await exactRegistryCandidates(lookup.kind, lookup.value)
  }

  const queryItem = lookup.kind === 'title'
    ? { ...request.item, title: lookup.value }
    : request.item
  return deduplicate(raw.map((candidate) => rankRaqimCandidate(queryItem, candidate)))
    .filter((candidate) => candidate.confidence >= RAQIM_CANDIDATE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_CANDIDATES)
}
