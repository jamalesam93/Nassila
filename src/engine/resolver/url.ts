import type { CslItem, CslName } from '../types'
import {
  fetchWithPolicy,
  readTextResponse,
  validateExternalUrl
} from '../network/http'

const MAX_HTML_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3

export async function resolveUrl(url: string): Promise<CslItem | null> {
  try {
    const doiMatch = url.match(/\b(10\.\d{4,}\/[^\s&?#]+)/i)
    if (doiMatch) {
      const { resolveDoi } = await import('./crossref')
      return resolveDoi(doiMatch[1])
    }

    const response = await fetchHtmlResponse(url)

    if (!response.ok) return null

    const html = await readTextResponse(response, { maxBytes: MAX_HTML_BYTES })
    return extractMetaFromHtml(html, url)
  } catch {
    return null
  }
}

interface ElectronApiWithFetchHtml {
  fetchHtml: (url: string) => Promise<{
    ok: boolean
    status: number
    contentType: string | null
    finalUrl: string
    html: string
    error?: string
  }>
}

function getElectronApi(): ElectronApiWithFetchHtml | null {
  if (typeof globalThis === 'undefined') return null
  const win = globalThis as unknown as { api?: ElectronApiWithFetchHtml }
  if (win.api && typeof win.api.fetchHtml === 'function') return win.api
  return null
}

export async function fetchUrlMetadata(url: string): Promise<Partial<CslItem> | null> {
  // Prefer the main-process bridge in Electron — it uses `net.fetch` which sends
  // a real browser User-Agent and bypasses renderer-side CORS, so we can actually
  // read `<meta name="citation_doi">` on MDPI / Springer / OUP / PMC / etc.
  const api = getElectronApi()
  if (api) {
    try {
      const result = await api.fetchHtml(url)
      if (result.ok && result.html) {
        return extractPartialMeta(result.html, result.finalUrl || url)
      }
      return null
    } catch {
      return null
    }
  }

  try {
    const response = await fetchHtmlResponse(url)

    if (!response.ok) return null

    const html = await readTextResponse(response, { maxBytes: MAX_HTML_BYTES })
    return extractPartialMeta(html, url)
  } catch {
    return null
  }
}

async function fetchHtmlResponse(url: string, redirectCount = 0): Promise<Response> {
  const parsedUrl = validateExternalUrl(url, { allowHttp: true })
  const response = await fetchWithPolicy(parsedUrl, {
    headers: { 'Accept': 'text/html' },
    redirect: 'manual'
  })

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error('Too many redirects')
    }

    const location = response.headers.get('location')
    if (!location) {
      throw new Error('Redirect missing location')
    }

    const redirectedUrl = new URL(location, parsedUrl)
    return fetchHtmlResponse(redirectedUrl.toString(), redirectCount + 1)
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error('URL did not return HTML')
  }

  return response
}

/** Highwire/dc `<meta>` DOI values may be `doi:10.x/...`, a doi.org URL, or bare `10.x/...`. */
export function normalizeDoiFromMeta(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let s = raw.trim()
  const fromDoiOrg = s.match(/(?:https?:\/\/)?(?:dx\.)?doi\.org\/(10\.\d{4,}\/[^\s'"<>]+)/i)
  if (fromDoiOrg?.[1]) return stripDoiNoise(fromDoiOrg[1])
  const low = s.toLowerCase()
  if (low.startsWith('doi:')) s = s.slice(4).trim()
  else if (low.startsWith('urn:doi:')) s = s.slice(8).trim()
  if (/^10\.\d{4,}\//.test(s)) return stripDoiNoise(s)
  return undefined
}

function stripDoiNoise(doi: string): string {
  const noQuery = doi.split(/[?#]/)[0]
  return noQuery.replace(/[.)]+$/, '').replace(/\/$/, '')
}

/**
 * Oxford Academic article URLs use `/journal/article/vol/issue/{piiname}/{numeric-id}` or `article-pdf/...`.
 * The Highwire DOI is `10.1093/{shortJ}/{piiname}`.
 */
export function extractDoiFromOxfordAcademicUrl(rawUrl: string): string | undefined {
  let pathname: string
  try {
    const u = new URL(rawUrl)
    if (!/^academic\.oup\.com$/i.test(u.hostname.replace(/^www\./, ''))) return undefined
    pathname = u.pathname
  } catch {
    return undefined
  }
  const m = pathname.match(
    /^\/([^/]+)\/(?:article|article-pdf)\/\d+\/\d+\/([^/]+)\/(?:\d+)?\/?$/i
  )
  if (!m?.[1] || !m?.[2]) return undefined
  const shortJournal = m[1].toLowerCase()
  const piiname = m[2].toLowerCase()
  if (!/^[a-z]/i.test(piiname)) return undefined
  return `10.1093/${shortJournal}/${piiname}`
}

/** Underscore slug after `/publication/{id}_` often matches the real title better than pasted grey text. */
export function titleHintFromResearchGateUrl(rawUrl: string): string | undefined {
  try {
    const u = new URL(rawUrl)
    if (!/^researchgate\.net$/i.test(u.hostname.replace(/^www\./, ''))) return undefined
    const m = u.pathname.match(/\/publication\/\d+_([^/?#]+)/)
    if (!m?.[1]) return undefined
    const s = decodeURIComponent(m[1]).replace(/_/g, ' ').replace(/\+/g, ' ').replace(/\s+/g, ' ').trim()
    return s.length >= 12 ? s : undefined
  } catch {
    return undefined
  }
}

/** Meta tags are often missing when ResearchGate serves a login wall; DOI still appears in JSON / data attributes.
 * Huge pages must be scoped — the first DOI globally is often unrelated (logged: ASN `10.1681/` for ML‑AKI pages). */
const RESEARCH_GATE_HTML_HEAD_BYTES = 420_000
const RESEARCH_GATE_ANCHOR_WINDOW_BEFORE = 500
const RESEARCH_GATE_ANCHOR_WINDOW_AFTER = 28_000

export function tryResearchGateDoiFromHtml(
  html: string,
  publicationPageUrl?: string
): string | undefined {
  const patterns: RegExp[] = [
    /data-doi=["'](10\.\d{4,}\/[^"']+)/i,
    /"doi"\s*:\s*["']?(10\.\d{4,}\/[^"'\s,}\]]+)/i,
    /"DOI"\s*:\s*["']?(10\.\d{4,}\/[^"'\s,}\]]+)/i,
    /https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,}\/[^"'\\\s<>]+)/i
  ]

  const firstDoiFrom = (s: string): string | undefined => {
    for (const re of patterns) {
      const m = s.match(re)
      const d = normalizeDoiFromMeta(m?.[1])
      if (d) return d
    }
    return undefined
  }

  let publicationIdFromUrl: string | undefined
  try {
    if (publicationPageUrl) {
      const path = new URL(publicationPageUrl).pathname
      publicationIdFromUrl = path.match(/\/publication\/(\d+)/)?.[1]
    }
  } catch {
    publicationIdFromUrl = undefined
  }

  /** When we have a publication URL, ONLY accept dois near its numeric id (`…/publication/NNN_…`).
   * The rendered head often contains unrelated dois (ADS, ASN, related items). Anchoring MUST
   * scan full HTML — the payload is often serialized after hundreds of KiB (log: ASN poison in HEAD). */
  if (publicationIdFromUrl) {
    if (!html.includes(publicationIdFromUrl)) return undefined

    let idx = html.indexOf(`"${publicationIdFromUrl}"`)
    if (idx < 0) idx = html.indexOf(`'${publicationIdFromUrl}'`)
    if (idx < 0) idx = html.indexOf(publicationIdFromUrl)
    if (idx < 0) return undefined

    const winStart = Math.max(0, idx - RESEARCH_GATE_ANCHOR_WINDOW_BEFORE)
    const winEnd = Math.min(html.length, idx + RESEARCH_GATE_ANCHOR_WINDOW_AFTER)
    return firstDoiFrom(html.slice(winStart, winEnd))
  }

  const scoped =
    html.length <= RESEARCH_GATE_HTML_HEAD_BYTES ? html : html.slice(0, RESEARCH_GATE_HTML_HEAD_BYTES)
  return firstDoiFrom(scoped)
}

/** Empty fetch / bot-wall HTML should not contribute fake titles like "Just a moment…". */
const ACCESS_WALL_MAX_BYTES = 65536

function isAccessWallHtml(html: string): boolean {
  if (/<title[^>]*>\s*Just a moment/i.test(html)) return true
  // Huge pages (e.g. ResearchGate) often bundle Cloudflare bootstrapping strings somewhere
  // in the markup; rejecting the entire document blanks out downstream DOI/JSON heuristics.
  if (
    html.length < ACCESS_WALL_MAX_BYTES &&
    /(?:_cf_chl_opt\b|cdn-cgi\/challenge-platform)/i.test(html)
  ) {
    return true
  }
  return false
}

function stripHtmlNoise(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function extractJsonLdGraph(html: string): unknown[] {
  const out: unknown[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    try {
      out.push(JSON.parse(raw))
    } catch {
      /* ignore malformed blocks */
    }
  }
  return out
}

function flattenLdThings(data: unknown): Record<string, unknown>[] {
  if (data === null || data === undefined) return []
  if (Array.isArray(data)) {
    return data.flatMap(flattenLdThings)
  }
  if (typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  if (Array.isArray(o['@graph'])) {
    return (o['@graph'] as unknown[]).flatMap(flattenLdThings)
  }
  return [o]
}

const JSON_LD_ARTICLE_TYPES = new Set([
  'article',
  'newsarticle',
  'scholarlyarticle',
  'blogposting',
  'webpage',
  'medicalwebpage',
  'report'
])

function ldTypeRank(t: unknown): number {
  const types = (Array.isArray(t) ? t : [t]).filter((x) => typeof x === 'string') as string[]
  let best = 0
  for (const x of types) {
    const low = x.toLowerCase().replace(/^https?:\/\/schema\.org\//i, '')
    if (JSON_LD_ARTICLE_TYPES.has(low)) {
      if (low === 'scholarlyarticle' || low === 'newsarticle') best = Math.max(best, 5)
      else if (low === 'article') best = Math.max(best, 4)
      else if (low === 'blogposting') best = Math.max(best, 3)
      else if (low === 'webpage' || low === 'medicalwebpage') best = Math.max(best, 2)
      else if (low === 'report') best = Math.max(best, 1)
    }
  }
  return best
}

function sortJsonLdNodes(nodes: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...nodes].sort((a, b) => ldTypeRank(b['@type']) - ldTypeRank(a['@type']))
}

function getHeadlineOrName(node: Record<string, unknown>): string | undefined {
  const h = node.headline
  if (typeof h === 'string' && h.trim()) return stripHtmlNoise(h)
  const n = node.name
  if (typeof n === 'string' && n.trim()) return stripHtmlNoise(n)
  return undefined
}

function parseJsonLdYear(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const iso = raw.match(/^(\d{4})/)
  if (iso) return parseInt(iso[1], 10)
  const y = raw.match(/\b(19|20)\d{2}\b/)
  return y ? parseInt(y[0], 10) : undefined
}

function jsonLdPersonToName(p: unknown): CslName | null {
  if (typeof p === 'string') {
    const s = p.trim()
    return s ? parseAuthorString(s) : null
  }
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (name) return parseAuthorString(name)
  const given = typeof o.givenName === 'string' ? o.givenName : ''
  const family = typeof o.familyName === 'string' ? o.familyName : ''
  if (family) return { given: given.trim(), family: family.trim() }
  return null
}

function jsonLdAuthorsField(raw: unknown): CslName[] {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : [raw]
  const out: CslName[] = []
  for (const entry of list) {
    const role = entry && typeof entry === 'object' ? (entry as Record<string, unknown>)['@type'] : undefined
    const r = typeof role === 'string' ? role.toLowerCase() : ''
    if (r && r.includes('organization')) continue
    const n = jsonLdPersonToName(entry)
    if (n) out.push(n)
  }
  return out
}

function publisherNameFromJsonLd(pub: unknown): string | undefined {
  if (typeof pub === 'string') return pub.trim() || undefined
  if (!pub || typeof pub !== 'object') return undefined
  const o = pub as Record<string, unknown>
  if (typeof o.name === 'string') return o.name.trim() || undefined
  return undefined
}

function mergeJsonLdIntoPartial(html: string, partial: Partial<CslItem>): void {
  const roots = extractJsonLdGraph(html)
  const flat: Record<string, unknown>[] = []
  for (const root of roots) {
    flat.push(...flattenLdThings(root))
  }
  if (flat.length === 0) return

  const sorted = sortJsonLdNodes(flat)
  for (const node of sorted) {
    if (!partial.title) {
      const t = getHeadlineOrName(node)
      if (t) partial.title = t
    }
    if (!partial.author?.length) {
      const fromAuthor = jsonLdAuthorsField(node.author)
      if (fromAuthor.length) partial.author = fromAuthor
      else {
        const fromCreator = jsonLdAuthorsField(node.creator)
        if (fromCreator.length) partial.author = fromCreator
      }
    }
    if (!partial.issued) {
      const d =
        (typeof node.datePublished === 'string' && node.datePublished) ||
        (typeof node.dateCreated === 'string' && node.dateCreated) ||
        (typeof node.dateModified === 'string' && node.dateModified)
      const y = typeof d === 'string' ? parseJsonLdYear(d) : undefined
      if (y) partial.issued = { 'date-parts': [[y]] }
    }
    if (!partial.DOI) {
      const ident = node.identifier
      if (typeof ident === 'string') {
        const doi = normalizeDoiFromMeta(ident)
        if (doi) partial.DOI = doi
      } else if (Array.isArray(ident)) {
        for (const id of ident) {
          if (typeof id === 'string') {
            const doi = normalizeDoiFromMeta(id)
            if (doi) {
              partial.DOI = doi
              break
            }
          }
        }
      }
    }

    const site =
      publisherNameFromJsonLd(node.publisher) ??
      publisherNameFromJsonLd(node.sourceOrganization)
    if (site) {
      if (!partial['container-title']) partial['container-title'] = site
      else if (!partial.publisher) partial.publisher = site
    }

    if (partial.title && partial.author?.length) break
  }
}

export function extractPartialMeta(html: string, sourceUrl: string): Partial<CslItem> | null {
  if (isAccessWallHtml(html)) return null

  const metas = parseMetaTags(html)
  const result: Partial<CslItem> = {}

  const title =
    metas.get('citation_title') ??
    metas.get('dc.title') ??
    metas.get('og:title') ??
    extractHtmlTitle(html)

  if (title) result.title = title

  const authors = collectAuthors(html, metas)
  if (authors.length > 0) result.author = authors

  const siteName =
    metas.get('og:site_name') ??
    metas.get('application-name') ??
    metas.get('publisher') ??
    metas.get('dc.publisher') ??
    metas.get('citation_journal_title')

  if (siteName) {
    result['container-title'] = siteName
  }

  if (!siteName) {
    const hostname = extractSiteName(sourceUrl)
    if (hostname) result.publisher = hostname
  }

  const description =
    metas.get('description') ??
    metas.get('og:description') ??
    metas.get('dc.description')
  if (description) result.abstract = description

  const isResearchGate = /researchgate\.net/i.test(sourceUrl)
  if (isResearchGate) {
    const rgAnchored = tryResearchGateDoiFromHtml(html, sourceUrl)
    if (rgAnchored) {
      result.DOI = rgAnchored
    } else {
      const citDoi = normalizeDoiFromMeta(metas.get('citation_doi'))
      if (citDoi) result.DOI = citDoi
    }
  } else {
    const fromMeta = normalizeDoiFromMeta(
      metas.get('citation_doi') ?? metas.get('dc.identifier')
    )
    if (fromMeta) result.DOI = fromMeta
  }

  const journal = metas.get('citation_journal_title')
  if (journal) result['container-title'] = journal

  const volume = metas.get('citation_volume')
  if (volume) result.volume = volume

  const issue = metas.get('citation_issue')
  if (issue) result.issue = issue

  const firstPage = metas.get('citation_firstpage')
  const lastPage = metas.get('citation_lastpage')
  if (firstPage) {
    result.page = lastPage ? `${firstPage}-${lastPage}` : firstPage
  }

  const dateStr =
    metas.get('citation_publication_date') ??
    metas.get('citation_date') ??
    metas.get('article:published_time') ??
    metas.get('date') ??
    metas.get('dc.date')
  if (dateStr) {
    const yearMatch = dateStr.match(/(\d{4})/)
    if (yearMatch) {
      result.issued = { 'date-parts': [[parseInt(yearMatch[1], 10)]] }
    }
  }

  mergeJsonLdIntoPartial(html, result)

  return result
}

function extractMetaFromHtml(html: string, sourceUrl: string): CslItem | null {
  const partial = extractPartialMeta(html, sourceUrl)
  if (!partial?.title) return null

  const journal = partial['container-title']
  const hasJournalMeta = partial.volume || partial.issue || partial.page

  const item: CslItem = {
    id: `url-${Date.now()}`,
    type: (journal && hasJournalMeta) ? 'article-journal' : 'webpage',
    title: partial.title,
    author: partial.author ?? [],
    'container-title': partial['container-title'],
    volume: partial.volume,
    issue: partial.issue,
    page: partial.page,
    DOI: partial.DOI,
    URL: sourceUrl,
    issued: partial.issued,
    publisher: partial.publisher,
    abstract: partial.abstract,
    _sourceFormat: 'url',
    _parseConfidence: 0.8
  }

  return item
}

function parseMetaTags(html: string): Map<string, string> {
  const metas = new Map<string, string>()

  const metaRegex = /<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']*?)["']/gi
  const metaRegex2 = /<meta\s+content=["']([^"']*?)["']\s+(?:name|property)=["']([^"']+)["']/gi

  let match: RegExpExecArray | null
  while ((match = metaRegex.exec(html)) !== null) {
    metas.set(match[1].toLowerCase(), match[2])
  }
  while ((match = metaRegex2.exec(html)) !== null) {
    metas.set(match[2].toLowerCase(), match[1])
  }

  return metas
}

function collectAuthors(html: string, metas: Map<string, string>): CslName[] {
  const names: CslName[] = []
  const seen = new Set<string>()

  const authorPatterns = [
    /<meta\s+name=["']citation_author["']\s+content=["']([^"']+)["']/gi,
    /<meta\s+content=["']([^"']+)["']\s+name=["']citation_author["']/gi,
    /<meta\s+name=["']dc\.creator["']\s+content=["']([^"']+)["']/gi,
    /<meta\s+name=["']author["']\s+content=["']([^"']+)["']/gi,
    /<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/gi,
  ]

  for (const pattern of authorPatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(html)) !== null) {
      const raw = match[1].trim()
      if (raw && !seen.has(raw.toLowerCase())) {
        seen.add(raw.toLowerCase())
        names.push(parseAuthorString(raw))
      }
    }
  }

  if (names.length === 0) {
    const singleAuthor = metas.get('author') ?? metas.get('dc.creator')
    if (singleAuthor && singleAuthor.trim()) {
      names.push(parseAuthorString(singleAuthor.trim()))
    }
  }

  return names
}

function parseAuthorString(raw: string): CslName {
  const parts = raw.split(/,\s*/)
  if (parts.length === 2 && parts[0].length > 1 && parts[1].length > 0) {
    return { family: parts[0], given: parts[1] }
  }
  const words = raw.split(/\s+/)
  if (words.length >= 2) {
    return { family: words[words.length - 1], given: words.slice(0, -1).join(' ') }
  }
  return { literal: raw }
}

function extractHtmlTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim() || undefined
}

export function extractSiteName(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname
    const clean = hostname.replace(/^www\./, '')

    const KNOWN_SITES: Record<string, string> = {
      'pubmed.ncbi.nlm.nih.gov': 'PubMed',
      'ncbi.nlm.nih.gov': 'NCBI',
      'scholar.google.com': 'Google Scholar',
      'researchgate.net': 'ResearchGate',
      'academia.edu': 'Academia.edu',
      'sciencedirect.com': 'ScienceDirect',
      'springer.com': 'Springer',
      'link.springer.com': 'Springer Link',
      'nature.com': 'Nature',
      'wiley.com': 'Wiley',
      'onlinelibrary.wiley.com': 'Wiley Online Library',
      'tandfonline.com': 'Taylor & Francis Online',
      'jstor.org': 'JSTOR',
      'arxiv.org': 'arXiv',
      'biorxiv.org': 'bioRxiv',
      'medrxiv.org': 'medRxiv',
      'ssrn.com': 'SSRN',
      'doi.org': 'DOI.org',
      'plos.org': 'PLOS',
      'journals.plos.org': 'PLOS',
      'frontiersin.org': 'Frontiers',
      'mdpi.com': 'MDPI',
      'scielo.br': 'SciELO',
      'scielo.org': 'SciELO',
      'who.int': 'World Health Organization',
      'cdc.gov': 'Centers for Disease Control and Prevention',
      'nih.gov': 'National Institutes of Health',
      'worldbank.org': 'World Bank',
      'un.org': 'United Nations',
      'europa.eu': 'European Union',
      'oecd.org': 'OECD',
      'github.com': 'GitHub',
      'zenodo.org': 'Zenodo',
      'figshare.com': 'Figshare',
      'ieee.org': 'IEEE',
      'ieeexplore.ieee.org': 'IEEE Xplore',
      'acm.org': 'ACM',
      'dl.acm.org': 'ACM Digital Library',
      'bmj.com': 'BMJ',
      'thelancet.com': 'The Lancet',
      'nejm.org': 'NEJM',
      'jamanetwork.com': 'JAMA Network',
      'cochranelibrary.com': 'Cochrane Library',
      'globalresearchonline.net': 'Global Research Online',
      'pacehospital.com': 'PACE Hospital',
    }

    for (const [domain, name] of Object.entries(KNOWN_SITES)) {
      if (clean === domain || clean.endsWith('.' + domain)) return name
    }

    const parts = clean.split('.')
    if (parts.length >= 2) {
      const domain = parts[parts.length - 2]
      return domain.charAt(0).toUpperCase() + domain.slice(1)
    }

    return clean
  } catch {
    return undefined
  }
}
