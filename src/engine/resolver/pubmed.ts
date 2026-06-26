import type { CslItem, CslName } from '../types'
import { fetchWithPolicy, readJsonResponse } from '../network/http'

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

interface PubMedArticleId {
  idtype: string
  value: string
}

interface PubMedArticle {
  uid: string
  title: string
  authors: { name: string; authtype: string }[]
  source: string
  volume: string
  issue: string
  pages: string
  pubdate: string
  doi?: string
  elocationid?: string
  articleids?: PubMedArticleId[]
  fulljournalname: string
  sortpubdate: string
}

function extractIdFromArticle(article: PubMedArticle, kind: 'doi' | 'pmc'): string | undefined {
  const fromIds = article.articleids?.find((id) => id.idtype?.toLowerCase() === kind)?.value
  if (fromIds && fromIds.trim().length > 0) {
    if (kind === 'doi') return fromIds.replace(/^https?:\/\/doi\.org\//i, '').trim()
    return fromIds.replace(/^PMC/i, 'PMC').trim()
  }
  if (kind === 'doi') {
    if (article.doi && article.doi.trim().length > 0) return article.doi.trim()
    const m = article.elocationid?.match(/\b10\.\d{4,}\/[^\s,;]+/)
    if (m) return m[0]
  }
  return undefined
}

interface PubMedSearchResponse {
  esearchresult?: {
    idlist?: string[]
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(/\s+/).filter((word) => word.length > 2))
  const wordsB = new Set(normalizeTitle(b).split(/\s+/).filter((word) => word.length > 2))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let overlap = 0
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++
  }

  return (2 * overlap) / (wordsA.size + wordsB.size)
}

function firstAuthorFamily(item: CslItem): string | null {
  const first = item.author?.[0]
  return first?.family ?? first?.literal ?? null
}

function issuedYear(item: CslItem): number | null {
  return item.issued?.['date-parts']?.[0]?.[0] ?? null
}

function buildPubMedSearchTerm(item: CslItem): string | null {
  if (!item.title) return null

  const parts = [`"${item.title}"[Title]`]
  const author = firstAuthorFamily(item)
  const year = issuedYear(item)

  if (author) parts.push(`${author}[Author]`)
  if (year) parts.push(`${year}[DP]`)

  return parts.join(' AND ')
}

export async function resolvePmid(pmid: string): Promise<CslItem | null> {
  try {
    const cleaned = pmid.replace(/^pmid:?\s*/i, '').replace(/\D/g, '')
    const url = `${EUTILS_BASE}/esummary.fcgi?db=pubmed&id=${cleaned}&retmode=json`
    if (!/^\d+$/.test(cleaned)) return null

    const response = await fetchWithPolicy(url)
    if (!response.ok) return null

    const data = await readJsonResponse<{ result: Record<string, PubMedArticle> }>(response)
    const article = data.result[cleaned]
    if (!article || !article.title) return null

    const authors: CslName[] = (article.authors ?? []).map((a) => {
      const parts = a.name.split(' ')
      const family = parts[0]
      const given = parts.slice(1).join(' ')
      return { family, given }
    })

    const yearMatch =
      article.sortpubdate?.match(/^(\d{4})/) ?? article.pubdate?.match(/^(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined

    const doi = extractIdFromArticle(article, 'doi')
    const pmcid = extractIdFromArticle(article, 'pmc')

    const item: CslItem = {
      id: `pmid-${cleaned}`,
      type: 'article-journal',
      title: article.title,
      author: authors,
      'container-title': article.fulljournalname || article.source,
      volume: article.volume || undefined,
      issue: article.issue || undefined,
      page: article.pages || undefined,
      DOI: doi,
      PMID: cleaned,
      PMCID: pmcid,
      issued: year ? { 'date-parts': [[year]] } : undefined,
      _sourceFormat: 'pmid',
      _parseConfidence: 1.0
    }

    return item
  } catch {
    return null
  }
}

/** Look up a PubMed record by DOI when Crossref/OpenAlex miss (common for biomedical articles). */
export async function resolvePubMedByDoi(doi: string): Promise<CslItem | null> {
  const normalized = doi
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim()
    .replace(/[.)]+$/, '')
  if (!/^10\.\d{4,}\//.test(normalized)) return null

  try {
    const params = new URLSearchParams({
      db: 'pubmed',
      term: `${normalized}[doi]`,
      retmax: '1',
      retmode: 'json'
    })
    const response = await fetchWithPolicy(`${EUTILS_BASE}/esearch.fcgi?${params.toString()}`)
    if (!response.ok) return null

    const data = await readJsonResponse<PubMedSearchResponse>(response)
    const pmid = data.esearchresult?.idlist?.[0]
    if (!pmid) return null
    return resolvePmid(pmid)
  } catch {
    return null
  }
}

/** Convert a PMCID (with or without leading "PMC") to a PMID via e-utilities elink. */
export async function pmcidToPmid(pmcid: string): Promise<string | null> {
  const cleaned = pmcid.replace(/^PMC/i, '')
  if (!/^\d+$/.test(cleaned)) return null
  try {
    const url = `${EUTILS_BASE}/elink.fcgi?dbfrom=pmc&db=pubmed&id=${cleaned}&retmode=json`
    const response = await fetchWithPolicy(url)
    if (!response.ok) return null
    const data = await readJsonResponse<{
      linksets?: { linksetdbs?: { dbto: string; links: string[] }[] }[]
    }>(response)
    const pmid = data.linksets?.[0]?.linksetdbs?.find((db) => db.dbto === 'pubmed')?.links?.[0]
    return pmid && /^\d+$/.test(pmid) ? pmid : null
  } catch {
    return null
  }
}

export async function searchPubMed(item: CslItem, limit = 5): Promise<CslItem[]> {
  const term = buildPubMedSearchTerm(item)
  if (!term) return []

  try {
    const params = new URLSearchParams({
      db: 'pubmed',
      term,
      retmax: String(limit),
      retmode: 'json'
    })
    const response = await fetchWithPolicy(`${EUTILS_BASE}/esearch.fcgi?${params.toString()}`)
    if (!response.ok) return []

    const data = await readJsonResponse<PubMedSearchResponse>(response)
    const pmids = data.esearchresult?.idlist ?? []
    const resolved: CslItem[] = []

    for (const pmid of pmids) {
      const item = await resolvePmid(pmid)
      if (item) resolved.push(item)
    }

    return resolved
  } catch {
    return []
  }
}

export async function findDoiByTitle(item: CslItem): Promise<CslItem | null> {
  if (!item.title) return null

  const candidates = await searchPubMed(item, 5)
  let bestMatch: CslItem | null = null
  let bestScore = 0
  const localYear = issuedYear(item)

  for (const candidate of candidates) {
    if (!candidate.DOI || !candidate.title) continue

    const candidateYear = issuedYear(candidate)
    if (localYear && candidateYear && Math.abs(localYear - candidateYear) > 1) {
      continue
    }

    const score = titleSimilarity(item.title, candidate.title)
    if (score > bestScore && score >= 0.8) {
      bestScore = score
      bestMatch = candidate
    }
  }

  return bestMatch
}
