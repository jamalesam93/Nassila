import type { CslItem, VerificationMismatch } from '../types'
import type { LayerVerdict } from './types'
import { THRESHOLDS } from './thresholds'
import { resolveIdentifier } from '../resolver'
import { resolveOpenAlexDoi, resolveOpenAlexPmid, searchOpenAlex } from '../resolver/openalex'
import { pmcidToPmid, resolvePubMedByDoi, resolvePmid } from '../resolver/pubmed'
import { isDataCiteDoi, resolveDataCiteDoi } from '../resolver/datacite'
import { normalizeDoiFromMeta } from '../resolver/url'
import { searchCrossRef } from '../resolver/crossref'
import { verifyAgainstCrossRef } from '../verifier/crossref-verify'
import { verifyAgainstPubMed } from '../verifier/pubmed-verify'

export type RegistrySource = 'crossref' | 'datacite' | 'pubmed' | 'openalex' | 'none'

export interface RegistryResolution {
  source: RegistrySource
  canonical: CslItem | null
  l1: LayerVerdict
}

export interface MetadataAlignment {
  l2: LayerVerdict
  mismatchedFields: string[]
}

export async function resolveRegistry(item: CslItem): Promise<RegistryResolution> {
  if (item.DOI) {
    const doiResult = await resolveDoiAcrossRegistries(item.DOI)
    if (doiResult.canonical) return { source: doiResult.source, canonical: doiResult.canonical, l1: { status: 'pass' } }

    if (item.PMID) {
      const pmidResult = await resolvePmidAcrossRegistries(item.PMID)
      if (pmidResult.canonical) return { source: pmidResult.source, canonical: pmidResult.canonical, l1: { status: 'pass' } }
    }

    const titleFallback = await resolveViaOpenAlex(item)
    if (titleFallback) return { source: 'openalex', canonical: titleFallback, l1: { status: 'pass' } }

    return {
      source: doiResult.source,
      canonical: null,
      l1: {
        status: 'fail',
        reasons: ['DOI could not be resolved in Crossref, OpenAlex, or PubMed']
      }
    }
  }

  if (item.PMID) {
    const pmidResult = await resolvePmidAcrossRegistries(item.PMID)
    if (pmidResult.canonical) return { source: pmidResult.source, canonical: pmidResult.canonical, l1: { status: 'pass' } }

    const titleFallback = await resolveViaOpenAlex(item)
    if (titleFallback) return { source: 'openalex', canonical: titleFallback, l1: { status: 'pass' } }

    return {
      source: pmidResult.source,
      canonical: null,
      l1: { status: 'fail', reasons: ['PMID could not be resolved in PubMed or OpenAlex'] }
    }
  }

  const pmcid =
    item.PMCID ??
    item.URL?.match(/pmc\.ncbi\.nlm\.nih\.gov\/articles\/(PMC\d+)/i)?.[1]
  if (pmcid) {
    const pmid = await pmcidToPmid(pmcid)
    if (pmid) {
      const pmidResult = await resolvePmidAcrossRegistries(pmid)
      if (pmidResult.canonical) {
        return { source: pmidResult.source, canonical: pmidResult.canonical, l1: { status: 'pass' } }
      }
    }
    return {
      source: 'pubmed',
      canonical: null,
      l1: { status: 'fail', reasons: ['PMCID could not be mapped to a resolvable PubMed record'] }
    }
  }

  // Many legitimate references (reports/web pages/theses) are not consistently indexed in Crossref/OpenAlex.
  // Do not mass-flag these as "insufficient evidence"; treat as grey/non-indexed and let the user decide.
  if (item.type === 'webpage' || item.type === 'report' || item.type === 'thesis' || item.type === 'post' || item.type === 'post-weblog') {
    return {
      source: 'none',
      canonical: null,
      l1: { status: 'warn', reasons: ['Not reliably indexed (grey literature / web source). Verify manually if required by the journal.'] }
    }
  }

  // Tier 1: parsed-fields query against OpenAlex.
  const canonical = await resolveViaOpenAlex(item)
  if (canonical) return { source: 'openalex', canonical, l1: { status: 'pass' } }

  // Tier 2: when parsed fields are missing/wrong, retry by sending the
  // entire raw reference line to Crossref's `query.bibliographic` endpoint,
  // which is purpose-built for messy citation strings. If a high-confidence
  // match comes back AND it has a DOI, resolve that DOI canonically.
  const raw = item._original?.trim()
  if (raw && raw.length >= 30) {
    const bibCandidates = await searchCrossRef(raw, 3, { bibliographic: true })
    const best = pickBestRawMatch(item, bibCandidates)
    if (best?.DOI) {
      const resolved = await resolveIdentifier(best.DOI)
      if (resolved) return { source: 'crossref', canonical: resolved, l1: { status: 'pass' } }
    }

    // Tier 3: same idea against OpenAlex with the raw line as the query.
    const oaCandidates = await searchOpenAlex(raw, undefined, 25)
    const oaBest = pickBestRawMatch(item, oaCandidates)
    if (oaBest) return { source: 'openalex', canonical: oaBest, l1: { status: 'pass' } }
  }

  return {
    source: 'openalex',
    canonical: null,
    l1: { status: 'insufficient_evidence', reason: 'No DOI/PMID and no high-confidence registry match (parsed or whole-reference search)' }
  }
}

async function resolveDoiAcrossRegistries(rawDoi: string): Promise<{ source: RegistrySource; canonical: CslItem | null }> {
  const doi = normalizeDoiFromMeta(rawDoi) ?? rawDoi.trim()
  if (!doi) return { source: 'crossref', canonical: null }

  if (isDataCiteDoi(doi)) {
    const datacite = await resolveDataCiteDoi(doi)
    if (datacite) return { source: 'datacite', canonical: datacite }
  }

  const crossref = await resolveIdentifier(doi)
  if (crossref) return { source: 'crossref', canonical: crossref }

  const openalex = await resolveOpenAlexDoi(doi)
  if (openalex) return { source: 'openalex', canonical: openalex }

  const pubmed = await resolvePubMedByDoi(doi)
  if (pubmed) return { source: 'pubmed', canonical: pubmed }

  return { source: 'crossref', canonical: null }
}

async function resolvePmidAcrossRegistries(rawPmid: string): Promise<{ source: RegistrySource; canonical: CslItem | null }> {
  const pmid = rawPmid.replace(/^pmid:?\s*/i, '').replace(/\D/g, '')
  if (!/^\d+$/.test(pmid)) return { source: 'pubmed', canonical: null }

  const pubmed = await resolvePmid(pmid)
  if (pubmed) return { source: 'pubmed', canonical: pubmed }

  const openalex = await resolveOpenAlexPmid(pmid)
  if (openalex) return { source: 'openalex', canonical: openalex }

  return { source: 'pubmed', canonical: null }
}

// Score a candidate against the user's full raw reference line. We use the
// raw line because parsed fields may be wrong; the full string is the most
// honest signal we have. Accept threshold is intentionally HIGHER than the
// parsed-title threshold to compensate for noise (numbers, journal name,
// publisher URL all dilute the similarity score).
function pickBestRawMatch(item: CslItem, candidates: CslItem[]): CslItem | null {
  const raw = item._original?.trim()
  if (!raw) return null
  const userYear = item.issued?.['date-parts']?.[0]?.[0]
  const userAuthor = item.author?.[0]?.family?.trim()

  const scored = candidates
    .map((c) => {
      const titleHit = c.title ? containmentScore(c.title, raw) : 0
      const authorHit = c.author?.[0]?.family && c.author[0].family.length >= 3
        ? normalize(raw).includes(normalize(c.author[0].family))
        : false
      const cYear = c.issued?.['date-parts']?.[0]?.[0]
      const yearOk = !userYear || !cYear || Math.abs(userYear - cYear) <= THRESHOLDS.openalex.yearSkewMax
      const authorOk = !userAuthor || !c.author?.[0]?.family
        || authorFamilyMatches(userAuthor, c.author[0].family)
      return { item: c, titleHit, authorHit, yearOk, authorOk }
    })
    .sort((a, b) => b.titleHit - a.titleHit)

  const best = scored[0]
  if (!best) return null
  // Need a strong containment signal AND year/author plausibility. Either the
  // candidate's title appears (>=70%) inside the raw line OR the title score
  // is moderate (>=50%) plus the author family also appears in the raw line.
  const strong = best.titleHit >= 0.7
  const moderate = best.titleHit >= 0.5 && best.authorHit
  if (!(strong || moderate)) return null
  if (!best.yearOk) return null
  if (!best.authorOk) return null
  return best.item
}

// Token-overlap containment: how much of the candidate title's tokens appear
// (in any order) inside the raw reference line.
function containmentScore(candidateTitle: string, rawLine: string): number {
  const ct = normalize(candidateTitle).split(/\s+/).filter((t) => t.length >= 3)
  if (ct.length === 0) return 0
  const rl = ' ' + normalize(rawLine) + ' '
  let hits = 0
  for (const tok of ct) {
    if (rl.includes(' ' + tok + ' ')) hits++
  }
  return hits / ct.length
}

/** True when a registry title plausibly describes the bibliography line (guards wrong-DOI rows). */
export function bibliographySupportsRegistryTitle(rawLine: string, canonicalTitle?: string): boolean {
  const title = canonicalTitle?.trim()
  const raw = rawLine.trim()
  if (!title || raw.length < 20) return true
  return containmentScore(title, raw) >= 0.35
}

export async function alignMetadata(userItem: CslItem, canonical: CslItem, source: RegistrySource): Promise<MetadataAlignment> {
  if (source === 'crossref') {
    const mismatches = await verifyAgainstCrossRef(userItem)
    return mismatchesToVerdict(mismatches.map((m) => m.field))
  }

  if (source === 'pubmed') {
    const mismatches = await verifyAgainstPubMed(userItem)
    return mismatchesToVerdict(mismatches.map((m) => m.field))
  }

  if (source === 'openalex') {
    const fields: string[] = []
    if (userItem.title && canonical.title && titleSimilarity(userItem.title, canonical.title) < 0.9) {
      fields.push('title')
    }
    const uy = userItem.issued?.['date-parts']?.[0]?.[0]
    const cy = canonical.issued?.['date-parts']?.[0]?.[0]
    if (uy && cy && uy !== cy) fields.push('year')
    return mismatchesToVerdict(fields)
  }

  return { l2: { status: 'skipped', reason: 'not_applicable' }, mismatchedFields: [] }
}

/** Single network pass: L1 registry resolution + L2 metadata check + field mismatches for patch UX (no L3). */
export async function registryCheckOneItem(item: CslItem): Promise<{
  citationId: string
  l1: LayerVerdict
  l2: LayerVerdict
  source: RegistrySource
  mismatches: VerificationMismatch[]
}> {
  const resolution = await resolveRegistry(item)
  const citationId = item.id

  if (!resolution.canonical) {
    return {
      citationId,
      l1: resolution.l1,
      l2: { status: 'skipped', reason: 'not_applicable' },
      source: resolution.source,
      mismatches: []
    }
  }

  if (resolution.source === 'crossref') {
    const mismatches = await verifyAgainstCrossRef(item)
    const meta = mismatchesToVerdict(mismatches.map((m) => m.field))
    return { citationId, l1: resolution.l1, l2: meta.l2, source: resolution.source, mismatches }
  }

  if (resolution.source === 'pubmed') {
    const mismatches = await verifyAgainstPubMed(item)
    const meta = mismatchesToVerdict(mismatches.map((m) => m.field))
    return { citationId, l1: resolution.l1, l2: meta.l2, source: resolution.source, mismatches }
  }

  const meta = await alignMetadata(item, resolution.canonical, resolution.source)
  return {
    citationId,
    l1: resolution.l1,
    l2: meta.l2,
    source: resolution.source,
    mismatches: []
  }
}

async function resolveViaOpenAlex(item: CslItem): Promise<CslItem | null> {
  const title = item.title?.trim()
  const original = item._original?.trim()
  const querySeed = title ?? original
  if (!querySeed) return null

  const year = item.issued?.['date-parts']?.[0]?.[0]
  const authorFamily = item.author?.[0]?.family?.trim()
  const query = [querySeed, authorFamily, year ? String(year) : undefined].filter(Boolean).join(' ')

  const candidates = await searchOpenAlex(query, undefined, 25)
  if (candidates.length === 0) return null

  const scored = candidates
    .map((c) => ({
      item: c,
      titleScore: c.title
        ? titleSimilarity(title ?? original ?? '', c.title)
        : 0,
      yearSkew: year && c.issued?.['date-parts']?.[0]?.[0] ? Math.abs(year - (c.issued['date-parts']![0]![0]!)) : 0,
      authorMatch: authorFamily && c.author?.[0]?.family ? authorFamilyMatches(authorFamily, c.author[0].family) : false
    }))
    .sort((a, b) => b.titleScore - a.titleScore)

  const best = scored[0]
  if (!best) return null

  if (best.titleScore < THRESHOLDS.openalex.titleSimilarityMin) return null
  if (year && best.yearSkew > THRESHOLDS.openalex.yearSkewMax) return null
  // If we have author info but it doesn't match, only accept when the title match is extremely strong.
  // This avoids mass "insufficient evidence" when author initials/transliterations differ.
  if (authorFamily && !best.authorMatch && best.titleScore < 0.97) return null

  return best.item
}

function mismatchesToVerdict(fields: string[]): MetadataAlignment {
  const unique = Array.from(new Set(fields))
  const mismatchedFields = unique

  const hasTitle = mismatchedFields.includes('title')
  if (hasTitle) {
    return { l2: { status: 'fail', reasons: ['Title mismatch against registry record'] }, mismatchedFields }
  }

  const warnings: string[] = []
  if (mismatchedFields.includes('year')) warnings.push('Year mismatch against registry record')
  if (mismatchedFields.includes('container-title')) warnings.push('Journal mismatch against registry record')
  if (mismatchedFields.includes('volume')) warnings.push('Volume mismatch against registry record')
  if (mismatchedFields.includes('page')) warnings.push('Page mismatch against registry record')

  if (warnings.length > 0) return { l2: { status: 'warn', reasons: warnings }, mismatchedFields }
  return { l2: { status: 'pass' }, mismatchedFields }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function authorFamilyMatches(userFamily: string, canonicalFamily: string): boolean {
  // Strip trailing initials that may have leaked into the user-side "family"
  // field (defensive — parser should already separate these).
  const stripTrailingInitials = (s: string) => s.replace(/\s+[A-Z]{1,4}$/, '').trim()
  const u = normalize(stripTrailingInitials(userFamily))
  const c = normalize(stripTrailingInitials(canonicalFamily))
  if (!u || !c) return false
  if (u === c) return true
  const strip = (x: string) => x.replace(/[\s-]+/g, '')
  if (strip(u) === strip(c)) return true
  // First-word equality handles "van der Berg" vs "van" or "Al Serouri" vs "Al-Serouri".
  const firstU = u.split(/\s+/)[0]
  const firstC = c.split(/\s+/)[0]
  if (firstU && firstC && strip(firstU) === strip(firstC)) return true
  return false
}

function titleSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) matrix[i][j] = j
      else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }
  }
  return matrix[a.length][b.length]
}

