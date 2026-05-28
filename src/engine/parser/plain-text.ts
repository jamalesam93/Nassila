import type { CslItem, CslItemType, CslName, InputFormat } from '../types'
import type { ParseResult } from './index'

export async function parsePlainText(raw: string): Promise<ParseResult> {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const items: CslItem[] = []
  const errors: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    try {
      const item = parseSingleCitation(line, i)
      if (item) {
        items.push(item)
      } else {
        errors.push(`Line ${i + 1}: could not parse citation`)
      }
    } catch (e) {
      errors.push(`Line ${i + 1}: ${(e as Error).message}`)
    }
  }

  return { items, errors, format: 'plain-text' }
}

const GRAY_LIT_INDICATORS: { pattern: RegExp; type: CslItemType; genre?: string; skipIfLineContainsDoi?: boolean }[] = [
  { pattern: /\b(?:ph\.?\s*d\.?|doctoral|master'?s?|m\.?\s*sc\.?|m\.?\s*a\.?)\s*(?:thesis|dissertation)\b/i, type: 'thesis', genre: 'thesis' },
  { pattern: /\b(?:dissertation)\b/i, type: 'thesis', genre: 'dissertation' },
  { pattern: /\b(?:unpublished)\s+(?:thesis|dissertation)\b/i, type: 'thesis' },
  { pattern: /\b(?:technical\s+report|tech\.?\s+rep\.?|working\s+paper|research\s+report|staff\s+report)\b/i, type: 'report', genre: 'technical report' },
  { pattern: /\b(?:policy\s+brief|issue\s+brief|briefing\s+paper|white\s+paper)\b/i, type: 'report', genre: 'policy brief' },
  { pattern: /\b(?:discussion\s+paper|occasional\s+paper)\b/i, type: 'report', genre: 'discussion paper' },
  { pattern: /\b(?:report\s+no\.?|report\s+number|publication\s+no\.?)\b/i, type: 'report' },
  { pattern: /\bpatent\s*(?:no\.?|number|#)?\s*\d/i, type: 'patent' },
  { pattern: /\b(?:U\.?S\.?\s+patent|patent\s+application|patent\s+granted)\b/i, type: 'patent' },
  { pattern: /\b(?:ISO|ANSI|IEEE\s+Std|BS\s+EN|DIN|ASTM)\s*\d/i, type: 'standard' },
  { pattern: /\b(?:standard|specification)\s+(?:no\.?|number)\b/i, type: 'standard' },
  { pattern: /\b(?:conference|proceedings|symposium|workshop|congress)\b/i, type: 'paper-conference' },
  { pattern: /\bpresented\s+at\b/i, type: 'paper-conference' },
  { pattern: /\b(?:legislation|act|statute|regulation|ordinance|decree|public\s+law)\b/i, type: 'legislation' },
  { pattern: /\b(?:§|section)\s*\d/i, type: 'legislation' },
  { pattern: /\b\d+\s+(?:U\.?S\.?C\.?|C\.?F\.?R\.?|Stat\.?)\s/i, type: 'legislation' },
  { pattern: /\bv\.\s+\w+|plaintiff|defendant|court\s+of\s+appeals?\b/i, type: 'legal_case' },
  { pattern: /\b\d+\s+(?:F\.?\s*(?:2d|3d|4th)|S\.?\s*Ct\.?|U\.?S\.?\s+\d)\b/i, type: 'legal_case' },
  { pattern: /\b(?:dataset|data\s+set|data\s+file)\b/i, type: 'dataset' },
  { pattern: /\[(?:data\s*(?:set|file))\]/i, type: 'dataset' },
  { pattern: /\b(?:software|computer\s+program|R\s+package|python\s+package|npm\s+package)\b/i, type: 'software' },
  { pattern: /\b(?:version|ver\.?|v\.?)\s*\d+\.\d+/i, type: 'software' },
  { pattern: /\b(?:GitHub|GitLab|Bitbucket|CRAN|PyPI|npm)\b/i, type: 'software' },
  { pattern: /\b(?:preprint|pre-print|advance\s+online)\b/i, type: 'article' },
  { pattern: /\b(?:arXiv|bioRxiv|medRxiv|SSRN|OSF\s+Preprints|Research\s+Square)\b/i, type: 'article' },
  { pattern: /\b(?:retrieved\s+(?:from|on)|accessed\s+(?:on|at|from)|available\s+(?:at|from|online))\b/i, type: 'webpage', skipIfLineContainsDoi: true },
  { pattern: /\bhttps?:\/\/[^\s]+(?!.*(?:doi\.org|dx\.doi))/i, type: 'webpage', skipIfLineContainsDoi: true },
  { pattern: /\b(?:blog\s+post|web\s*page|website|online)\b/i, type: 'webpage' },
  { pattern: /\b(?:press\s+release|news\s+release|media\s+release)\b/i, type: 'post' },
  { pattern: /\b(?:newspaper|magazine)\b/i, type: 'article-newspaper' },
  { pattern: /\b(?:WHO|UNESCO|UNICEF|World\s+Bank|IMF|OECD|United\s+Nations|European\s+Commission|CDC|NIH|FDA|EPA|USDA)\b/, type: 'report' },
  { pattern: /\b(?:government|gov(?:ernment)?\.?\s+(?:print|publish|account))\b/i, type: 'report', genre: 'government report' },
  { pattern: /\b(?:interview|personal\s+communication)\b/i, type: 'personal_communication' },
  { pattern: /\b(?:documentary|film|motion\s+picture|movie|video)\b/i, type: 'motion_picture' },
  { pattern: /\b(?:podcast|broadcast|television|radio|TV)\b/i, type: 'broadcast' },
  { pattern: /\b(?:speech|lecture|keynote|address|testimony)\b/i, type: 'speech' },
  { pattern: /\b(?:map|atlas|cartographic)\b/i, type: 'map' },
  { pattern: /\b(?:manuscript|unpublished\s+manuscript)\b/i, type: 'manuscript' },
]

// Hosts whose URLs point to scholarly journal articles or preprints, not generic webpages.
const JOURNAL_HOST_PATTERNS: RegExp[] = [
  /pubmed\.ncbi\.nlm\.nih\.gov\/\d+/i,
  /pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+/i,
  /\bpmid:?\s*\d{6,8}\b/i,
  /(?:^|\/\/|\.)mdpi\.com\//i,
  /(?:^|\/\/|\.)frontiersin\.org\/(?:journals|articles)/i,
  /(?:^|\/\/|\.)medrxiv\.org\//i,
  /(?:^|\/\/|\.)biorxiv\.org\//i,
  /(?:^|\/\/|\.)arxiv\.org\//i,
  /(?:^|\/\/|\.)academic\.oup\.com\//i,
  /(?:^|\/\/|\.)journals\.plos\.org\//i,
  /(?:^|\/\/|\.)pubs\.rsc\.org\//i,
  /(?:^|\/\/|\.)link\.springer\.com\/article\//i,
  /(?:^|\/\/|\.)nature\.com\/articles\//i,
  /(?:^|\/\/|\.)sciencedirect\.com\/science\/article\//i,
  /(?:^|\/\/|\.)onlinelibrary\.wiley\.com\/doi\//i,
  /(?:^|\/\/|\.)jmir\.org\//i,
  /(?:^|\/\/|\.)scielo\.br\/j\//i,
  /(?:^|\/\/|\.)europeanreview\.org\//i,
  /(?:^|\/\/|\.)journal-jop\.org\//i,
  /(?:^|\/\/|\.)tandfonline\.com\/doi\//i,
  /(?:^|\/\/|\.)cambridge\.org\/core\/journals\//i,
  /(?:^|\/\/|\.)thelancet\.com\/journals\//i,
  /(?:^|\/\/|\.)bmj\.com\//i,
  /(?:^|\/\/|\.)nejm\.org\//i,
  /(?:^|\/\/|\.)ahajournals\.org\//i,
  /(?:^|\/\/|\.)jamanetwork\.com\//i,
  /(?:^|\/\/|\.)researchgate\.net\/publication\/\d+/i,
  /(?:^|\/\/|\.)ssrn\.com\/abstract=/i,
  /(?:^|\/\/|\.)osf\.io\/preprints\//i
]

export function isJournalArticleUrl(text: string): boolean {
  return JOURNAL_HOST_PATTERNS.some((re) => re.test(text))
}

/** bioRxiv/medRxiv article pages embed the DOI in the URL path (/content/10.1101/...). */
export function extractDoiFromPreprintUrl(url: string): string | undefined {
  const m = url.match(/(?:medrxiv|biorxiv)\.org\/(?:content|early)\/(10\.\d{4,}\/[^\s?#,)]+)/i)
  if (!m?.[1]) return undefined
  return m[1].replace(/[.)]+$/, '').replace(/\/$/, '')
}

/** Crossref registers 10.1101 preprints without the medRxiv/bioRxiv URL version suffix (`v1`, `v2`). */
export function canonicalize1101PreprintDoi(doi: string): string {
  if (!/^10\.1101\//i.test(doi)) return doi
  return doi.replace(/v\d+$/i, '')
}

function detectItemType(text: string): { type: CslItemType; genre?: string } {
  // Catalogue pages on known journal/preprint hosts are journal articles, not generic webpages.
  if (isJournalArticleUrl(text)) {
    return { type: 'article-journal' }
  }

  // Detect Vancouver / journal-article structure BEFORE applying grey-lit
  // heuristics so that journal refs which merely include a publisher URL
  // (e.g. "Available from: https://...") are not mis-tagged as `webpage`.
  // The discriminating signal is a `year;volume` separator (Vancouver style)
  // or an explicit `vol(issue):pages` block. We deliberately do NOT use the
  // bare `[Internet]` marker because it is also used for cited web pages.
  const looksLikeJournal =
    /\b(19|20)\d{2}\b[^;\n]{0,80};\s*\d/.test(text) ||
    /\b\d+\s*\(\d+\)\s*:\s*\d+\b/.test(text) ||
    /\b(?:vol\.?|volume)\s*\d/i.test(text)

  for (const indicator of GRAY_LIT_INDICATORS) {
    if (indicator.pattern.test(text)) {
      // If the ref also exhibits Vancouver/journal structure
      // (year;vol(issue):pages, [Internet]. year, etc.) then it is almost
      // certainly an article-journal. Overriding *all* grey-lit matches is
      // safe because those indicator patterns commonly false-fire on words
      // that also appear in real journal refs (URL substrings, "conference"
      // in a journal name, "Internet", "report", etc.).
      if (looksLikeJournal) {
        continue
      }
      if (
        indicator.skipIfLineContainsDoi &&
        /\b10\.\d{4,}\/[^\s,;)]+/i.test(text)
      ) {
        continue
      }
      if (indicator.type === 'webpage' && isJournalArticleUrl(text)) {
        continue
      }
      return { type: indicator.type, genre: indicator.genre }
    }
  }

  if (looksLikeJournal) {
    return { type: 'article-journal' }
  }
  if (/\b(?:ed(?:s|itor)?\.?\s*[,)]|chapter|chap\.)\b/i.test(text) && /\b(?:in:?\s)/i.test(text)) {
    return { type: 'chapter' }
  }
  if (/\b(?:press|publisher|university\s+press|verlag)\b/i.test(text) && !/\b(?:journal|vol\.?)\b/i.test(text)) {
    return { type: 'book' }
  }

  return { type: 'article-journal' }
}

function parseSingleCitation(text: string, index: number): CslItem | null {
  const trimmedInput = text.trim()
  const looksLikeBareUrlOnly =
    /^https?:\/\/\S+$/i.test(trimmedInput) ||
    /^\[?\d+[\].)]\s*https?:\/\/\S+$/i.test(trimmedInput)

  const detected = detectItemType(text)

  const item: CslItem = {
    id: `plain-${index}`,
    type: detected.type,
    _original: text,
    _sourceFormat: 'plain-text' as InputFormat,
    _parseConfidence: 0
  }

  if (detected.genre) {
    item.genre = detected.genre
  }

  let confidence = 0
  let remaining = text

  remaining = remaining.replace(/^\s*\[?\d+[\].)]\s*/, '')

  // URL must come BEFORE inline DOI extraction. DOIs like `10.1101/...` appear inside
  // medRxiv/bioRxiv URLs (`.../content/10.1101/...`); matching DOI first strips that
  // segment and leaves a truncated URL (`https://www.medrxiv.org/content/`).
  const urlRegex = /https?:\/\/[^\s,;)]+/g
  const urlMatches = [...remaining.matchAll(urlRegex)]
  if (urlMatches.length > 0) {
    const candidates = urlMatches.map((m) => m[0].replace(/[.)]+$/, ''))
    // Prefer the preprint article URL when the line accidentally lists another link first
    // (e.g. publisher homepage, Related articles).
    const rawUrl =
      candidates.find((u) =>
        /(?:medrxiv|biorxiv)\.org\/(?:content|early)\/10\.1101\//i.test(u)
      ) ?? candidates[0]
    const matchToStrip =
      urlMatches.find((m) => m[0].replace(/[.)]+$/, '') === rawUrl)?.[0] ?? urlMatches[0][0]
    item.URL = rawUrl
    const pathDoi = extractDoiFromPreprintUrl(rawUrl)
    if (pathDoi) {
      item.DOI = canonicalize1101PreprintDoi(pathDoi)
      confidence += 0.1
    }
    remaining = remaining.replace(matchToStrip, '')
    if (detected.type === 'webpage' || detected.type === 'software' || detected.type === 'dataset') {
      confidence += 0.1
    }
  }

  const doiMatch = remaining.match(/\b(10\.\d{4,}\/[^\s,;]+)/i)
  if (doiMatch) {
    const extracted = doiMatch[1].replace(/[.)]+$/, '')
    if (!item.DOI) {
      item.DOI = canonicalize1101PreprintDoi(extracted)
      confidence += 0.1
    }
    remaining = remaining.replace(doiMatch[0], '')
  }

  const pmidFromText =
    text.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1] ??
    text.match(/\bpmid:?\s*(\d{6,8})\b/i)?.[1]
  if (pmidFromText) {
    item.PMID = pmidFromText
    confidence += 0.1
  }

  const pmcidFromText =
    text.match(/pmc\.ncbi\.nlm\.nih\.gov\/articles\/(PMC\d+)/i)?.[1] ??
    text.match(/\b(PMC\d{4,})\b/i)?.[1]
  if (pmcidFromText) {
    item.PMCID = pmcidFromText.toUpperCase().startsWith('PMC')
      ? pmcidFromText.toUpperCase()
      : `PMC${pmcidFromText}`
    confidence += 0.1
  }

  const accessedMatch = remaining.match(/(?:retrieved|accessed)\s+(?:on\s+)?(\w+\.?\s+\d{1,2},?\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i)
  if (accessedMatch) {
    item.accessed = { literal: accessedMatch[1].trim() }
    remaining = remaining.replace(accessedMatch[0], '')
  }

  // Prefer the publication year (typically after the journal/title block)
  // over any year that appears inside a range like "1990-2021" (which usually
  // sits inside the title).
  const yearRegex = /\(?\b(1[5-9]\d{2}|20[0-3]\d)\b\)?/g
  let pickedYear: { match: RegExpExecArray; year: number } | null = null
  {
    // Pre-scan explicit year ranges so we can exclude BOTH endpoints.
    const rangeRegex = /(1[5-9]\d{2}|20[0-3]\d)\s*[-–—]\s*(1[5-9]\d{2}|20[0-3]\d)/g
    const rangePositions = new Set<number>()
    let rm: RegExpExecArray | null
    while ((rm = rangeRegex.exec(remaining)) !== null) {
      rangePositions.add(rm.index)
      rangePositions.add(rm.index + rm[0].length - rm[2].length)
    }

    let m: RegExpExecArray | null
    const all: { match: RegExpExecArray; year: number }[] = []
    while ((m = yearRegex.exec(remaining)) !== null) {
      if (rangePositions.has(m.index) || rangePositions.has(m.index + (m[0].startsWith('(') ? 1 : 0))) continue
      all.push({ match: m, year: parseInt(m[1], 10) })
    }
    // Prefer the first non-range year; fall back to any year if all are ranges.
    pickedYear = all[0] ?? null
    if (!pickedYear) {
      yearRegex.lastIndex = 0
      const firstAny = yearRegex.exec(remaining)
      if (firstAny) pickedYear = { match: firstAny, year: parseInt(firstAny[1], 10) }
    }
  }
  if (pickedYear) {
    item.issued = { 'date-parts': [[pickedYear.year]] }
    confidence += 0.15
    remaining = remaining.replace(pickedYear.match[0], '')
  }

  if (detected.type === 'report' || detected.type === 'standard') {
    const reportNoMatch = remaining.match(/(?:report|publication|paper|doc(?:ument)?|no|number|#|tech\.?\s*rep\.?)\s*(?:no\.?\s*)?(\S+\d+\S*)/i)
    if (reportNoMatch) {
      item['citation-number'] = reportNoMatch[1]
      remaining = remaining.replace(reportNoMatch[0], '')
      confidence += 0.1
    }
  }

  if (detected.type === 'patent') {
    const patentNoMatch = remaining.match(/patent\s*(?:no\.?\s*)?([A-Z]?\d[\d,]+\d)/i)
    if (patentNoMatch) {
      item['citation-number'] = patentNoMatch[1]
      remaining = remaining.replace(patentNoMatch[0], '')
      confidence += 0.1
    }
  }

  if (detected.type === 'software') {
    const versionMatch = remaining.match(/(?:version|ver\.?|v\.?)\s*(\d+(?:\.\d+)*)/i)
    if (versionMatch) {
      item.version = versionMatch[1]
      remaining = remaining.replace(versionMatch[0], '')
      confidence += 0.1
    }
  }

  if (detected.type === 'thesis') {
    const universityMatch = remaining.match(/(?:university\s+of\s+\w+(?:\s+\w+)*|\w+\s+university(?:\s+of\s+\w+)?)/i)
    if (universityMatch) {
      item.publisher = universityMatch[0].trim()
      confidence += 0.1
    }
  }

  if (detected.type === 'paper-conference') {
    const eventMatch = remaining.match(/(?:proceedings?\s+of\s+(?:the\s+)?|presented\s+at\s+(?:the\s+)?)(.+?)(?:\.|,\s*\d)/i)
    if (eventMatch) {
      item['event-title'] = eventMatch[1].trim()
      confidence += 0.1
    }
  }

  const volIssuePages = remaining.match(
    /(?:vol\.?\s*)?(\d+)\s*(?:\((\d+)\))?\s*[,:]\s*(?:pp?\.?\s*)?(\d+[\u2013\-–]\d+)/i
  )
  if (volIssuePages) {
    item.volume = volIssuePages[1]
    if (volIssuePages[2]) item.issue = volIssuePages[2]
    item.page = volIssuePages[3].replace(/[\u2013–]/g, '-')
    confidence += 0.15
    remaining = remaining.replace(volIssuePages[0], '')
  } else {
    const pagesMatch = remaining.match(/(?:pp?\.?\s*)(\d+[\u2013\-–]\d+)/)
    if (pagesMatch) {
      item.page = pagesMatch[1].replace(/[\u2013–]/g, '-')
      remaining = remaining.replace(pagesMatch[0], '')
      confidence += 0.05
    }
  }

  const parts = remaining
    .split(/\.\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2)

  if (parts.length >= 1) {
    const hasAuthorBlock = parts.length >= 2 && looksLikeAuthorSegment(parts[0])
    const titleIdx = hasAuthorBlock ? 1 : 0

    if (hasAuthorBlock) {
      item.author = parseAuthors(parts[0])
      if (item.author.length > 0) confidence += 0.2
    }

    item.title = parts[titleIdx]?.replace(/[."]+$/, '').trim() ?? ''
    if (item.title) confidence += 0.2

    if (parts.length > titleIdx + 1) {
      const containerPart = parts[titleIdx + 1].replace(/[,;]+$/, '').trim()
      if (containerPart.length > 2) {
        if (detected.type === 'article-journal') {
          item['container-title'] = containerPart
        } else if (detected.type === 'chapter') {
          item['container-title'] = containerPart
        } else if (detected.type === 'report') {
          item.publisher = item.publisher ?? containerPart
        } else if (detected.type === 'thesis') {
          item.publisher = item.publisher ?? containerPart
        } else if (detected.type === 'paper-conference') {
          item['container-title'] = containerPart
        } else {
          item.publisher = item.publisher ?? containerPart
        }
        confidence += 0.1
      }
    }

    if (parts.length > titleIdx + 2) {
      const publisherPart = parts[titleIdx + 2].replace(/[,;]+$/, '').trim()
      if (publisherPart.length > 2 && !item.publisher) {
        item.publisher = publisherPart
        confidence += 0.05
      }
    }
  }

  item._parseConfidence = Math.min(confidence, 1)

  // Preprint servers are not traditional journals; satisfy journal-field validation when
  // the depositor line has no separate journal name (common for "… | medRxiv" grey text).
  if (item.URL && detected.type === 'article-journal' && !item['container-title']) {
    if (/medrxiv\.org/i.test(item.URL)) item['container-title'] = 'medRxiv'
    else if (/biorxiv\.org/i.test(item.URL)) item['container-title'] = 'bioRxiv'
  }

  if (!item.title && !item.author?.length) {
    if (item.URL && looksLikeBareUrlOnly) {
      item.title = placeholderWebpageTitleFromUrl(item.URL)
    } else {
      return null
    }
  }

  return item
}

function placeholderWebpageTitleFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host || 'Web page'
  } catch {
    return 'Web page'
  }
}

/** True when the first `. `-separated segment looks like a real author list, not a paper title. */
function looksLikeAuthorSegment(text: string): boolean {
  const t = text.trim()
  if (t.length > 140) return false
  if (/\bet\s+al\.?\b/i.test(t)) return true
  if (/(?:^|[,;]\s*)[A-Z][\p{L}'’-]+,\s*[A-Z](?:\.[A-Z]\.)?/u.test(t)) return true
  if (/(?:^|[,;]\s*)[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)?\s+[A-Z]{1,4}(?:\s*[,;]|$)/u.test(t)) {
    return true
  }
  if (t.length > 80 && /\b(study|review|injury|analysis|cohort|article|disease|predicting|models|mechanisms)\b/i.test(t)) {
    return false
  }
  const segments = t.split(/\s*[,;]\s*/)
  if (segments.length >= 3) {
    const authorLike = segments.filter((s) =>
      /^[A-Z][\p{L}'’-]+,\s*[A-Z]/u.test(s.trim()) ||
      /^[A-Z][\p{L}'’-]+\s+[A-Z]{1,4}$/u.test(s.trim())
    ).length
    if (authorLike >= 1) return true
    if (segments.every((s) => s.split(/\s+/).length > 3)) return false
  }
  return segments.length <= 4 && t.length < 80 && !/\b(study|injury|cohort|mechanisms)\b/i.test(t)
}

function parseAuthors(text: string): CslName[] {
  const cleaned = text
    .replace(/^by\s+/i, '')
    .replace(/\s+&\s+|\s+and\s+/gi, ', ')
    .replace(/\s*et\s+al\.?\s*/gi, '')
    .trim()

  if (!cleaned) return []

  const authorStrings = cleaned.split(/\s*[,;]\s*/)
  const names: CslName[] = []
  let i = 0

  while (i < authorStrings.length) {
    const part = authorStrings[i].trim()
    if (!part) { i++; continue }

    if (isOrganizationalAuthor(part)) {
      names.push({ literal: part })
      i++
      continue
    }

    // "Family, Given Initials" form: next token is pure initials (no lowercase).
    // Regex WITHOUT `i` flag so we only match genuine uppercase initial strings
    // like "J", "J.R.", "SE", "WFS", and do not accidentally match names that
    // happen to begin with an uppercase letter (e.g. "Alshakka M").
    if (
      i + 1 < authorStrings.length &&
      /^[A-Z]/.test(part) &&
      /^[A-Z]\.?(?:[\s-]*[A-Z]\.?)*$/.test(authorStrings[i + 1].trim())
    ) {
      names.push({ family: part, given: authorStrings[i + 1].trim() })
      i += 2
      continue
    }

    // Vancouver-style "Family INITIALS" inside a single comma-separated token.
    // Example: "Badulla WFS" → family="Badulla", given="WFS".
    // Character class accepts apostrophes and all Unicode dash/hyphen
    // variants (regular hyphen, figure dash U+2010, non-breaking hyphen
    // U+2011, en/em dashes, minus, hyphen-minus) so names like "Al‐Waleedi"
    // are correctly recognised.
    const NAME_CHARS = "[\\p{L}'’\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212]"
    const vancouver = part.match(new RegExp(
      `^(\\p{L}${NAME_CHARS}*(?:\\s+\\p{L}${NAME_CHARS}*)*?)\\s+([A-Z]{1,4})$`,
      'u'
    ))
    if (vancouver) {
      names.push({ given: vancouver[2], family: vancouver[1] })
      i++
      continue
    }

    const firstLast = part.match(/^(.+?)\s+(\S+)$/)
    if (firstLast) {
      names.push({ given: firstLast[1], family: firstLast[2] })
    } else {
      names.push({ literal: part })
    }
    i++
  }

  return names
}

function isOrganizationalAuthor(text: string): boolean {
  const orgPatterns = [
    /\b(?:WHO|UNESCO|UNICEF|UNDP|OECD|IMF|CDC|NIH|FDA|EPA|USDA|NASA|NIST|GAO)\b/,
    /\b(?:World\s+(?:Health|Bank)|United\s+Nations|European\s+(?:Commission|Union))\b/i,
    /\b(?:Department|Ministry|Bureau|Agency|Commission|Office|Institute|Council|Foundation|Association|Organization|Committee|Board|Authority|Corporation|Centre|Center)\b/i,
    /\b(?:National|Federal|State|Royal|American|British|International)\s+(?:\w+\s+)*(?:of|for|on)\b/i,
  ]
  return orgPatterns.some((p) => p.test(text))
}
