import type { CslItem, CslItemType, CslName } from '../types'
import { searchCrossRef, resolveDoi } from '../resolver/crossref'
import { searchDataCite, isDataCiteDoi, resolveDataCiteDoi } from '../resolver/datacite'
import { searchOpenAlex } from '../resolver/openalex'
import { findDoiByTitle, resolvePmid, pmcidToPmid } from '../resolver/pubmed'
import { fetchUrlMetadata, extractSiteName, extractDoiFromOxfordAcademicUrl, titleHintFromResearchGateUrl } from '../resolver/url'
import { canonicalize1101PreprintDoi, isJournalArticleUrl } from '../parser/plain-text'
import type { CorrectionLog } from './index'

export interface EnhanceProgress {
  current: number
  total: number
  currentTitle?: string
}

export interface EnhanceOptions {
  shouldAbort?: () => boolean
}

const JOURNAL_TYPES: Set<CslItemType> = new Set([
  'article-journal', 'article-magazine', 'article-newspaper'
])

const DATACITE_TYPES: Set<CslItemType> = new Set([
  'dataset', 'software', 'standard'
])

const GRAY_LIT_TYPES: Set<CslItemType> = new Set([
  'report', 'thesis', 'paper-conference', 'manuscript',
  'speech', 'broadcast', 'motion_picture', 'webpage', 'post',
  'post-weblog', 'patent', 'legislation', 'legal_case', 'bill',
  'regulation', 'map', 'personal_communication', 'document'
])

/** Crossref often registers bioRxiv/medRxiv without the `v1` / `v2` version suffix. */
async function resolveDoiWithPreprintFallback(doi: string): Promise<CslItem | null> {
  const first = await resolveDoi(doi)
  if (first) return first
  if (!/^10\.1101\//i.test(doi)) return null
  const stripped = doi.replace(/v\d+$/i, '')
  if (stripped === doi) return null
  return resolveDoi(stripped)
}

function crossrefOptsFromItem(item: CslItem): { bibliographic: boolean } {
  const bibliographic = /\bresearchgate\.net\/publication\//i.test(item.URL ?? '')
  return { bibliographic }
}

export async function enhanceCitationsOnline(
  items: CslItem[],
  onProgress?: (progress: EnhanceProgress) => void,
  options?: EnhanceOptions
): Promise<{ enhanced: CslItem[]; log: CorrectionLog[] }> {
  const log: CorrectionLog[] = []
  const enhanced: CslItem[] = []
  const total = items.length

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (options?.shouldAbort?.()) {
      break
    }
    onProgress?.({ current: i + 1, total, currentTitle: item.title })

    const ned = needsEnhancement(item)

    if (!ned) {
      enhanced.push(item)
      continue
    }

    try {
      const enriched = await enhanceByType(item)
      if (enriched.log.length > 0) {
        enhanced.push(enriched.item)
        log.push(...enriched.log)
      } else {
        enhanced.push(item)
      }
    } catch {
      enhanced.push(item)
    }

    if (i < items.length - 1) {
      await delay(350)
    }
    if (options?.shouldAbort?.()) {
      break
    }
  }

  return { enhanced, log }
}

function needsEnhancement(item: CslItem): boolean {
  if (
    (item.type === 'webpage' || item.type === 'post' || item.type === 'post-weblog') &&
    item.URL
  ) {
    return true
  }

  if (!item.title && !item.DOI) return false

  if (JOURNAL_TYPES.has(item.type)) {
    return !item.DOI || !item.volume || !item.page || !item['container-title']
  }

  if (DATACITE_TYPES.has(item.type)) {
    return !item.DOI || !item.URL || !item.publisher
  }

  if (item.type === 'thesis') {
    return !item.DOI || !item.publisher || !item.URL
  }

  if (item.type === 'report') {
    return !item.DOI || !item.URL || !item.publisher
  }

  if (item.type === 'webpage' || item.type === 'post' || item.type === 'post-weblog') {
    // Always try enrichment for webpage-typed items: with a DOI we may reclassify
    // to article-journal; without one we look up by URL/title/PMID.
    return true
  }

  if (item.type === 'paper-conference') {
    return !item.DOI || !item['container-title'] || !item['event-title']
  }

  if (GRAY_LIT_TYPES.has(item.type)) {
    return !item.DOI || !item.URL
  }

  return !item.DOI || !item.volume || !item.page
}

async function enhanceByType(item: CslItem): Promise<{ item: CslItem; log: CorrectionLog[] }> {
  const log: CorrectionLog[] = []
  let merged = { ...item }
  const pmidFromUrl = item.URL?.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1]
  const pmcidFromUrl =
    item.URL?.match(/pmc\.ncbi\.nlm\.nih\.gov\/articles\/(PMC\d+)/i)?.[1] ??
    item.PMCID

  if (item.DOI) {
    const resolved = isDataCiteDoi(item.DOI)
      ? await resolveDataCiteDoi(item.DOI)
      : await resolveDoiWithPreprintFallback(item.DOI)

    if (resolved) {
      if (!registryIdentityCompatible(item, resolved)) {
        return { item, log: [] }
      }
      const replaceMetadata = metadataLooksImplausible(merged)
      merged = mergeFields(merged, resolved, log, { replaceImplausibleAuthors: replaceMetadata })
      if (replaceMetadata && resolved.title && merged.title !== resolved.title) {
        const oldTitle = merged.title
        merged.title = resolved.title
        log.push({
          citationId: item.id,
          field: 'title',
          oldValue: oldTitle,
          newValue: resolved.title,
          rule: 'registry-identity-repair'
        })
      }
      if (!isDataCiteDoi(item.DOI) && /^10\.1101\//i.test(item.DOI ?? '') && resolved.DOI) {
        const kIn = canonicalize1101PreprintDoi(item.DOI).toLowerCase()
        const kResolved = canonicalize1101PreprintDoi(resolved.DOI).toLowerCase()
        if (kIn === kResolved && merged.DOI !== resolved.DOI) {
          const oldDoi = merged.DOI
          merged = { ...merged, DOI: resolved.DOI }
          log.push({
            citationId: item.id,
            field: 'DOI',
            oldValue: oldDoi,
            newValue: resolved.DOI,
            rule: 'preprint-doi-canonical'
          })
        }
      }
      if (
        (item.type === 'webpage' || item.type === 'post' || item.type === 'post-weblog') &&
        resolved.type &&
        resolved.type !== 'webpage'
      ) {
        merged = { ...merged, type: resolved.type }
        log.push({
          citationId: item.id,
          field: 'type',
          oldValue: item.type,
          newValue: resolved.type,
          rule: 'reclassify-from-doi'
        })
      } else if (resolved.type === 'chapter' && item.type !== 'chapter') {
        merged = { ...merged, type: 'chapter' }
        log.push({
          citationId: item.id,
          field: 'type',
          oldValue: item.type,
          newValue: 'chapter',
          rule: 'reclassify-book-chapter'
        })
      }
      return { item: merged, log }
    }
  }

  let pmid = item.PMID ?? pmidFromUrl
  if (!pmid && pmcidFromUrl) {
    const converted = await pmcidToPmid(pmcidFromUrl)
    if (converted) pmid = converted
  }
  if (pmid) {
    const resolved = await resolvePmid(pmid)
    if (resolved) {
      if (!registryIdentityCompatible(item, resolved)) {
        return { item, log: [] }
      }
      const replaceMetadata = metadataLooksImplausible(merged)
      merged = mergeFields(merged, resolved, log, { replaceImplausibleAuthors: replaceMetadata })
      if (replaceMetadata && resolved.title) {
        const oldTitle = merged.title
        merged.title = resolved.title
        log.push({
          citationId: item.id,
          field: 'title',
          oldValue: oldTitle,
          newValue: resolved.title,
          rule: 'pubmed-fill'
        })
      }
      if (
        (item.type === 'webpage' || item.type === 'post' || item.type === 'post-weblog') &&
        resolved.type &&
        resolved.type !== 'webpage'
      ) {
        merged = { ...merged, type: resolved.type }
        log.push({
          citationId: item.id,
          field: 'type',
          oldValue: item.type,
          newValue: resolved.type,
          rule: 'reclassify-from-pubmed'
        })
      }
      return { item: merged, log }
    }
  }

  const isWebpageType = item.type === 'webpage' || item.type === 'post' || item.type === 'post-weblog'

  // Known journal hosts (MDPI, Frontiers, Springer, Wiley, OUP, RSC, JMIR, Nature, etc.)
  // expose a canonical DOI via <meta name="citation_doi"> on the article page. Read that
  // directly — much safer than fuzzy title-matching against Crossref, which can return a
  // wrong paper for short / generic titles (e.g. several MDPI titles look very similar).
  const looksLikeJournalHost = !!item.URL && isJournalArticleUrl(item.URL)
  if (!merged.DOI && looksLikeJournalHost && item.URL) {
    const oupDoi = extractDoiFromOxfordAcademicUrl(item.URL)
    if (oupDoi) {
      const oupResolved = await resolveDoi(oupDoi)
      if (oupResolved) {
        if (!registryIdentityCompatible(item, oupResolved)) {
          return { item, log: [] }
        }
        const replaceMetadata = metadataLooksImplausible(merged)
        merged = mergeFields(merged, oupResolved, log, { replaceImplausibleAuthors: replaceMetadata })
        if (!merged.DOI) {
          merged.DOI = oupDoi
          log.push({
            citationId: item.id,
            field: 'DOI',
            oldValue: undefined,
            newValue: oupDoi,
            rule: 'oup-url-doi-fill'
          })
        }
        if (replaceMetadata && oupResolved.title) {
          const oldTitle = merged.title
          merged.title = oupResolved.title
          log.push({
            citationId: item.id,
            field: 'title',
            oldValue: oldTitle,
            newValue: oupResolved.title,
            rule: 'oup-url-doi-fill'
          })
        }
        if (isWebpageType && oupResolved.type && oupResolved.type !== 'webpage') {
          merged = { ...merged, type: oupResolved.type }
          log.push({
            citationId: item.id,
            field: 'type',
            oldValue: item.type,
            newValue: oupResolved.type,
            rule: 'reclassify-from-oup-url-doi'
          })
        }
        return { item: merged, log }
      }
    }

    const meta = await fetchUrlMetadata(item.URL)
    if (meta?.DOI) {
      const resolved = await resolveDoiWithPreprintFallback(meta.DOI)
      if (resolved) {
        if (!registryIdentityCompatible(item, resolved)) {
          return { item, log: [] }
        }
        const replaceMetadata = metadataLooksImplausible(merged)
        merged = mergeFields(merged, resolved, log, { replaceImplausibleAuthors: replaceMetadata })
        if (!merged.DOI) {
          merged.DOI = meta.DOI
          log.push({
            citationId: item.id,
            field: 'DOI',
            oldValue: undefined,
            newValue: meta.DOI,
            rule: 'meta-doi-fill'
          })
        }
        if (replaceMetadata && resolved.title) {
          const oldTitle = merged.title
          merged.title = resolved.title
          log.push({
            citationId: item.id,
            field: 'title',
            oldValue: oldTitle,
            newValue: resolved.title,
            rule: 'meta-doi-fill'
          })
        }
        if (isWebpageType && resolved.type && resolved.type !== 'webpage') {
          merged = { ...merged, type: resolved.type }
          log.push({
            citationId: item.id,
            field: 'type',
            oldValue: item.type,
            newValue: resolved.type,
            rule: 'reclassify-from-meta-doi'
          })
        }
        return { item: merged, log }
      }
      // Crossref couldn't resolve the meta DOI; still fill DOI plus meta-derived fields.
      const oldDoi = merged.DOI
      merged.DOI = meta.DOI
      if (oldDoi !== meta.DOI) {
        log.push({
          citationId: item.id,
          field: 'DOI',
          oldValue: oldDoi,
          newValue: meta.DOI,
          rule: 'meta-doi-fill'
        })
      }
      if (
        (!merged.author?.length || authorsLookImplausible(merged.author, merged.title)) &&
        meta.author?.length
      ) {
        const oldAuthors = merged.author
        merged.author = meta.author
        log.push({
          citationId: item.id,
          field: 'author',
          oldValue: oldAuthors,
          newValue: meta.author,
          rule: 'meta-doi-fill'
        })
      }
      if (!merged['container-title'] && meta['container-title']) {
        merged['container-title'] = meta['container-title']
      }
      if (!merged.issued && meta.issued) merged.issued = meta.issued
      if (!merged.volume && meta.volume) merged.volume = meta.volume
      if (!merged.issue && meta.issue) merged.issue = meta.issue
      if (!merged.page && meta.page) merged.page = meta.page
      return { item: merged, log }
    }
  }
  if (isWebpageType && looksLikeJournalHost && item.title) {
    const crResults = await searchCrossRef(
      buildSearchQuery(item) ?? item.title,
      5,
      crossrefOptsFromItem(item)
    )
    const crMatch = findBestMatch(item, crResults)
    if (crMatch) {
      const replaceMetadata = authorsLookImplausible(merged.author, merged.title)
      merged = mergeFields(merged, crMatch, log, { replaceImplausibleAuthors: replaceMetadata })
      if (replaceMetadata && crMatch.title) {
        const oldTitle = merged.title
        merged.title = crMatch.title
        log.push({
          citationId: item.id,
          field: 'title',
          oldValue: oldTitle,
          newValue: crMatch.title,
          rule: 'crossref-fill'
        })
      }
      if (crMatch.type && crMatch.type !== 'webpage') {
        merged = { ...merged, type: crMatch.type }
        log.push({
          citationId: item.id,
          field: 'type',
          oldValue: item.type,
          newValue: crMatch.type,
          rule: 'reclassify-from-crossref'
        })
      }
      return { item: merged, log }
    }

    const pubMedMatch = await findDoiByTitle(item)
    if (pubMedMatch) {
      const replaceMetadata = authorsLookImplausible(merged.author, merged.title)
      const logStart = log.length
      merged = mergeFields(merged, pubMedMatch, log, { replaceImplausibleAuthors: replaceMetadata })
      relabelNewLogRules(log, logStart, 'pubmed-fill')
      if (replaceMetadata && pubMedMatch.title) {
        const oldTitle = merged.title
        merged.title = pubMedMatch.title
        log.push({
          citationId: item.id,
          field: 'title',
          oldValue: oldTitle,
          newValue: pubMedMatch.title,
          rule: 'pubmed-fill'
        })
      }
      if (pubMedMatch.type && pubMedMatch.type !== 'webpage') {
        merged = { ...merged, type: pubMedMatch.type }
        log.push({
          citationId: item.id,
          field: 'type',
          oldValue: item.type,
          newValue: pubMedMatch.type,
          rule: 'reclassify-from-pubmed'
        })
      }
      return { item: merged, log }
    }
  }

  if (isWebpageType && item.URL) {
    const result = await enhanceWebpage(merged, log)
    if (result) return { item: result, log }
  }

  if (DATACITE_TYPES.has(item.type) && item.title) {
    const dcResults = await searchDataCite(item.title, mapTypeForDataCite(item.type), 3)
    const match = findBestMatch(item, dcResults)
    if (match) {
      merged = mergeFields(merged, match, log)
      return { item: merged, log }
    }
  }

  if (JOURNAL_TYPES.has(item.type) && item.title) {
    const crResults = await searchCrossRef(
      buildSearchQuery(item) ?? item.title,
      5,
      crossrefOptsFromItem(item)
    )
    const match = findBestMatch(item, crResults)
    if (match) {
      merged = mergeFields(merged, match, log)
      return { item: merged, log }
    }

    if (!item.DOI) {
      const pubMedMatch = await findDoiByTitle(item)
      if (pubMedMatch) {
        const logStart = log.length
        merged = mergeFields(merged, pubMedMatch, log)
        relabelNewLogRules(log, logStart, 'pubmed-fill')
        return { item: merged, log }
      }
    }
  }

  const openAlexQuery = buildSearchQuery(item) ?? item.title
  if (openAlexQuery) {
    const oaType = mapTypeForOpenAlex(item.type)
    const oaResults = await searchOpenAlex(openAlexQuery, oaType, 5)
    const match = findBestMatch(item, oaResults)
    if (match) {
      merged = mergeFields(merged, match, log)
      if (shouldReclassifyWebpageFromOpenAlex(item, match)) {
        merged = { ...merged, type: match.type }
        log.push({
          citationId: item.id,
          field: 'type',
          oldValue: item.type,
          newValue: match.type,
          rule: 'reclassify-from-openalex'
        })
      }
      return { item: merged, log }
    }
  }

  return { item, log: [] }
}

/** Crossref → PubMed → OpenAlex title search for bibliography rows (incl. wrong-DOI repair). */
export async function findRegistryMatchForItem(item: CslItem): Promise<CslItem | null> {
  if (!item.title?.trim()) return null
  const query = buildSearchQuery(item) ?? item.title

  const crResults = await searchCrossRef(query, 5, crossrefOptsFromItem(item))
  const crMatch = findBestMatch(item, crResults)
  if (crMatch?.DOI) return crMatch

  const pubMedMatch = await findDoiByTitle(item)
  if (pubMedMatch?.DOI) return pubMedMatch

  const oaType = mapTypeForOpenAlex(item.type)
  const oaResults = await searchOpenAlex(query, oaType, 5)
  const oaMatch = findBestMatch(item, oaResults)
  if (oaMatch?.DOI) return oaMatch

  return null
}

/** Replace a wrong DOI when registry search finds a better match for the row's title. */
export async function resolveDoiForTitle(
  item: CslItem
): Promise<{ item: CslItem; log: CorrectionLog[] } | null> {
  const match = await findRegistryMatchForItem(item)
  if (!match?.DOI) return null

  const current = item.DOI?.trim().toLowerCase()
  const nextDoi = match.DOI.trim().toLowerCase()
  if (current && current === nextDoi) return null

  const localTitle = (item.title ?? '').toLowerCase().trim()
  const matchTitle = (match.title ?? '').toLowerCase().trim()
  if (localTitle && matchTitle && titleSimilarity(localTitle, matchTitle) < 0.6) {
    return null
  }

  const log: CorrectionLog[] = [
    {
      citationId: item.id,
      field: 'DOI',
      oldValue: item.DOI,
      newValue: match.DOI,
      rule: 'doi-title-resolve'
    }
  ]

  let merged: CslItem = {
    ...item,
    DOI: match.DOI,
    URL: match.URL ?? item.URL ?? `https://doi.org/${match.DOI}`
  }
  merged = mergeFields(merged, match, log)

  return { item: merged, log }
}

function isPlaceholderTitle(title?: string): boolean {
  const t = title?.trim()
  if (!t) return true
  return t === '()' || t === '(?)' || t === '—' || t === '-'
}

async function enhanceWebpage(
  item: CslItem,
  log: CorrectionLog[]
): Promise<CslItem | null> {
  if (!item.URL) return null

  const meta = await fetchUrlMetadata(item.URL)
  let merged = { ...item }
  let changed = false

  if (meta) {
    if (isPlaceholderTitle(merged.title) && meta.title) {
      const oldTitle = merged.title
      merged.title = meta.title
      log.push({
        citationId: item.id,
        field: 'title',
        oldValue: oldTitle,
        newValue: meta.title,
        rule: 'url-meta-fill'
      })
      changed = true
    }
    if (
      (!merged.author?.length || authorsLookImplausible(merged.author, merged.title)) &&
      meta.author?.length
    ) {
      const oldAuthors = merged.author
      merged.author = meta.author
      log.push({
        citationId: item.id,
        field: 'author',
        oldValue: oldAuthors,
        newValue: meta.author,
        rule: 'url-meta-fill'
      })
      changed = true
    }

    if (!merged['container-title'] && meta['container-title']) {
      merged['container-title'] = meta['container-title']
      log.push({ citationId: item.id, field: 'container-title', oldValue: undefined, newValue: meta['container-title'], rule: 'url-meta-fill' })
      changed = true
    }

    if (!merged.publisher && meta.publisher) {
      merged.publisher = meta.publisher
      log.push({ citationId: item.id, field: 'publisher', oldValue: undefined, newValue: meta.publisher, rule: 'url-meta-fill' })
      changed = true
    }

    if (!merged.issued && meta.issued) {
      merged.issued = meta.issued
      log.push({ citationId: item.id, field: 'issued', oldValue: undefined, newValue: meta.issued, rule: 'url-meta-fill' })
      changed = true
    }

    if (!merged.abstract && meta.abstract) {
      merged.abstract = meta.abstract
      log.push({ citationId: item.id, field: 'abstract', oldValue: undefined, newValue: meta.abstract, rule: 'url-meta-fill' })
      changed = true
    }

    if (!merged.DOI && meta.DOI) {
      merged.DOI = meta.DOI
      log.push({ citationId: item.id, field: 'DOI', oldValue: undefined, newValue: meta.DOI, rule: 'url-meta-fill' })
      changed = true

      if (meta.DOI) {
        const crossrefItem = await resolveDoiWithPreprintFallback(meta.DOI)
        if (crossrefItem) {
          merged = mergeFields(merged, crossrefItem, log)
          if (crossrefItem.type && crossrefItem.type !== 'webpage') {
            merged.type = crossrefItem.type
            log.push({ citationId: item.id, field: 'type', oldValue: 'webpage', newValue: crossrefItem.type, rule: 'reclassify-from-doi' })
          }
          return merged
        }
      }
    }

    if (meta.volume) { merged.volume = meta.volume; changed = true }
    if (meta.issue) { merged.issue = meta.issue; changed = true }
    if (meta.page) { merged.page = meta.page; changed = true }
  }

  if (!merged['container-title'] && !merged.publisher && item.URL) {
    const siteName = extractSiteName(item.URL)
    if (siteName) {
      merged.publisher = siteName
      log.push({ citationId: item.id, field: 'publisher', oldValue: undefined, newValue: siteName, rule: 'hostname-fallback' })
      changed = true
    }
  }

  return changed ? merged : null
}

function mapTypeForDataCite(type: CslItemType): string | undefined {
  const map: Partial<Record<CslItemType, string>> = {
    'dataset': 'Dataset',
    'software': 'Software',
    'report': 'Text',
    'thesis': 'Dissertation',
    'standard': 'Standard'
  }
  return map[type]
}

function mapTypeForOpenAlex(type: CslItemType): string | undefined {
  const map: Partial<Record<CslItemType, string>> = {
    'article-journal': 'journal-article',
    'thesis': 'dissertation',
    'report': 'report',
    'paper-conference': 'proceedings-article',
    'dataset': 'dataset',
    'book': 'book',
    'chapter': 'book-chapter',
    'review': 'review'
  }
  return map[type]
}

function shouldReclassifyWebpageFromOpenAlex(local: CslItem, match: CslItem): boolean {
  const fromWeb = local.type === 'webpage' || local.type === 'post' || local.type === 'post-weblog'
  if (!fromWeb) return false
  if (match.type === 'webpage' || match.type === 'post' || match.type === 'post-weblog') {
    return false
  }
  const strong =
    !!match.DOI ||
    !!match.ISSN ||
    !!(match.volume && (match['container-title'] || match.publisher))
  return strong
}

function authorsLookImplausible(authors?: CslName[], title?: string): boolean {
  if (!authors?.length) return false
  const titleLower = (title ?? '').toLowerCase()
  for (const a of authors) {
    const given = (a.given ?? '').toLowerCase()
    const family = (a.family ?? '').toLowerCase()
    if (given.length > 35) return true
    if (/\b(study|injury|review|analysis|cohort|disease|factors|mechanisms|identification|prognostic)\b/.test(given)) {
      return true
    }
    if (family && titleLower.includes(family) && /\b(incidence|mechanisms|factors|injury)\b/.test(family)) {
      return true
    }
  }
  return false
}

function titleLooksImplausible(title?: string): boolean {
  const t = title?.trim()
  if (!t || isPlaceholderTitle(t)) return true
  if (t.length < 8) return true
  if (/^(?:[A-Z]\.?\s*){1,4},?\s*(?:et\s+al\.?)?$/i.test(t)) return true
  if (/^[A-Z]\.,?\s*et\s+al\.?$/i.test(t)) return true
  return false
}

function metadataLooksImplausible(item: CslItem): boolean {
  return titleLooksImplausible(item.title) || authorsLookImplausible(item.author, item.title)
}

/**
 * Registry metadata may fill a row only when it still describes the same work.
 * Implausible parser output is repairable; plausible conflicting titles stay manual-only.
 */
function registryIdentityCompatible(local: CslItem, canonical: CslItem): boolean {
  if (!local.title?.trim() || !canonical.title?.trim()) return true
  if (titleLooksImplausible(local.title)) return true
  if (
    authorsLookImplausible(local.author, local.title) &&
    local.title.trim().split(/\s+/).length <= 4
  ) {
    return true
  }
  return titleSimilarity(local.title.toLowerCase(), canonical.title.toLowerCase()) >= 0.45
}

function mergeFields(
  local: CslItem,
  online: CslItem,
  log: CorrectionLog[],
  options?: { replaceImplausibleAuthors?: boolean }
): CslItem {
  const merged = { ...local }
  const replaceAuthors =
    options?.replaceImplausibleAuthors === true &&
    authorsLookImplausible(local.author, local.title)

  const standardFields: (keyof CslItem)[] = [
    'DOI', 'volume', 'issue', 'page', 'container-title',
    'ISSN', 'publisher', 'URL', 'abstract'
  ]

  const grayLitFields: (keyof CslItem)[] = [
    'publisher-place', 'genre', 'version', 'event-title',
    'collection-title', 'edition', 'PMID'
  ]

  const allFields = [...standardFields, ...grayLitFields]

  for (const field of allFields) {
    if (!merged[field] && online[field]) {
      (merged as Record<string, unknown>)[field] = online[field] as unknown
      log.push({
        citationId: local.id,
        field: String(field),
        oldValue: undefined,
        newValue: online[field],
        rule: 'online-fill'
      })
    }
  }

  if (!merged.issued && online.issued) {
    merged.issued = online.issued
    log.push({
      citationId: local.id,
      field: 'issued',
      oldValue: undefined,
      newValue: online.issued,
      rule: 'online-fill'
    })
  }

  if ((replaceAuthors || !merged.author?.length) && online.author?.length) {
    const oldAuthors = merged.author
    merged.author = online.author
    log.push({
      citationId: local.id,
      field: 'author',
      oldValue: replaceAuthors ? oldAuthors : undefined,
      newValue: online.author,
      rule: replaceAuthors ? 'pubmed-fill' : 'online-fill'
    })
  }

  return merged
}

function relabelNewLogRules(log: CorrectionLog[], startIndex: number, rule: string): void {
  for (let i = startIndex; i < log.length; i++) {
    log[i] = { ...log[i], rule }
  }
}

function buildSearchQuery(item: CslItem): string | null {
  const parts: string[] = []

  const rgHint = item.URL ? titleHintFromResearchGateUrl(item.URL) : undefined
  if (rgHint && rgHint.length >= 12) {
    parts.push(rgHint.substring(0, 220))
  } else if (item.title) {
    parts.push(item.title.substring(0, 120))
  } else if (item.URL) {
    const site = extractSiteName(item.URL)
    if (site) parts.push(site)
  }

  if (item.author?.length) {
    const firstAuthor = item.author[0]
    const name = firstAuthor.family ?? firstAuthor.literal ?? ''
    if (name) parts.push(name)
  }

  if (item.issued?.['date-parts']?.[0]?.[0]) {
    parts.push(String(item.issued['date-parts'][0][0]))
  }

  return parts.length > 0 ? parts.join(' ') : null
}

function findBestMatch(local: CslItem, candidates: CslItem[]): CslItem | null {
  if (candidates.length === 0) return null

  const localTitle = (local.title ?? '').toLowerCase().trim()
  if (!localTitle) return null

  const localFamily = local.author?.find((a) => a.family)?.family?.toLowerCase()
  const localYear = local.issued?.['date-parts']?.[0]?.[0]

  let bestMatch: CslItem | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    const candidateTitle = (candidate.title ?? '').toLowerCase().trim()
    if (!candidateTitle) continue

    const score = titleSimilarity(localTitle, candidateTitle)
    if (score <= bestScore) continue

    // Require a stricter title overlap when we have no author or year to corroborate.
    // Looser threshold (0.6) is OK only when at least one of author family or publication
    // year matches the candidate. This stops Crossref from returning a wrong paper for
    // short / generic / truncated MDPI-style titles.
    const candidateFamily = candidate.author?.find((a) => a.family)?.family?.toLowerCase()
    const candidateYear = candidate.issued?.['date-parts']?.[0]?.[0]
    const familyMatches = !!(localFamily && candidateFamily && (
      candidateFamily.includes(localFamily) || localFamily.includes(candidateFamily)
    ))
    const yearMatches = !!(localYear && candidateYear && Math.abs(localYear - candidateYear) <= 1)
    const corroborated = familyMatches || yearMatches

    const minScore = corroborated ? 0.6 : 0.85
    if (score >= minScore) {
      bestScore = score
      bestMatch = candidate
    }
  }

  return bestMatch
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2))
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }

  return (2 * overlap) / (wordsA.size + wordsB.size)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
