import type { CslItem } from '../types'
import type { ParsedInTextCitation } from './intext'
import { splitReferenceEntries } from '../parser/document'
import { parsePlainText } from '../parser/plain-text'

export interface MappingWarning {
  message: string
  citationRaw: string
}

export interface BibEntry {
  key: string
  raw: string
  item?: CslItem
}

export interface CitationMapping {
  citation: ParsedInTextCitation
  matchedBibKeys: string[]
  ambiguity?: { candidates: string[]; reason: string }
  warnings: MappingWarning[]
}

export function summarizeCitationMappings(mappings: CitationMapping[]): {
  matched: number
  ambiguous: number
  unmatched: number
} {
  let matched = 0
  let ambiguous = 0
  let unmatched = 0

  for (const mapping of mappings) {
    if (mapping.matchedBibKeys.length > 0) matched++
    else if (mapping.ambiguity) ambiguous++
    else unmatched++
  }

  return { matched, ambiguous, unmatched }
}

/** Only mapped references are eligible for citation-site grounding. */
export function selectMappedBibliographyEntries(
  entries: BibEntry[],
  mappings: CitationMapping[]
): BibEntry[] {
  const mappedKeys = new Set(mappings.flatMap((mapping) => mapping.matchedBibKeys))
  return entries.filter((entry) => mappedKeys.has(entry.key))
}

export interface BibEntryDedupeResult {
  /** Duplicate-free entries, first occurrence wins. */
  entries: BibEntry[]
  /** Removed duplicate key → retained canonical key. */
  aliases: Record<string, string>
  /** Groups of same-title entries that could not be safely merged (missing year / conflicting identity). */
  ambiguousGroups: string[][]
}

const RAW_YEAR_PATTERN = /\b(?:19|20)\d{2}\b/
const RAW_DOI_PATTERN = /10\.\d{4,9}\/[^\s,"]+/i

function stripDoiPrefix(value: string): string {
  return value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase().trim()
}

function entryDoi(entry: BibEntry): string | undefined {
  const itemDoi = entry.item?.DOI?.trim()
  if (itemDoi) return stripDoiPrefix(itemDoi)
  const rawMatch = entry.raw.match(RAW_DOI_PATTERN)
  return rawMatch ? stripDoiPrefix(rawMatch[0].replace(/[.,;)]+$/, '')) : undefined
}

function entryTitleKey(entry: BibEntry): string | undefined {
  // Only parsed items carry a trustworthy isolated title; raw-text matching would
  // over-merge look-alike references.
  const title = entry.item?.title?.trim()
  return title ? normalize(title) || undefined : undefined
}

function entryYear(entry: BibEntry): number | undefined {
  const parts = entry.item?.issued?.['date-parts']?.[0]?.[0]
  if (typeof parts === 'number' && Number.isFinite(parts)) return parts
  const rawMatch = entry.raw.match(RAW_YEAR_PATTERN)
  return rawMatch ? Number.parseInt(rawMatch[0], 10) : undefined
}

/**
 * Deterministic bibliography dedupe (#19): merge by normalized DOI, else by
 * normalized title + year. Title-only look-alikes are reported as ambiguous,
 * never silently merged. Aliases let numeric cite sites ([3], [18]) keep
 * pointing at the same canonical finding after a merge.
 */
export function dedupeBibEntries(entries: BibEntry[]): BibEntryDedupeResult {
  const kept: BibEntry[] = []
  const aliases: Record<string, string> = {}
  const ambiguousGroups: string[][] = []

  const doiIndex = new Map<string, number>()
  const titleYearIndex = new Map<string, number>()
  const titleIndex = new Map<string, number[]>()

  for (const entry of entries) {
    const doi = entryDoi(entry)
    const titleKey = entryTitleKey(entry)
    const yr = entryYear(entry)

    if (doi) {
      const canonicalIdx = doiIndex.get(doi)
      if (canonicalIdx !== undefined) {
        aliases[entry.key] = kept[canonicalIdx].key
        continue
      }
    }

    if (titleKey && yr !== undefined) {
      const canonicalIdx = titleYearIndex.get(`${titleKey}::${yr}`)
      if (canonicalIdx !== undefined) {
        const canonical = kept[canonicalIdx]
        const canonicalDoi = entryDoi(canonical)
        // Different DOIs mean conflicting identity — verify surfaces that, not dedupe.
        if (!(doi && canonicalDoi && doi !== canonicalDoi)) {
          aliases[entry.key] = canonical.key
          continue
        }
      }
    }

    if (titleKey && yr === undefined && titleIndex.has(titleKey)) {
      const group = titleIndex.get(titleKey)!
      ambiguousGroups.push([kept[group[0]].key, entry.key])
      group.push(kept.length)
      kept.push(entry)
      continue
    }

    kept.push(entry)
    const idx = kept.length - 1
    if (doi) doiIndex.set(doi, idx)
    if (titleKey && yr !== undefined) titleYearIndex.set(`${titleKey}::${yr}`, idx)
    if (titleKey) {
      const group = titleIndex.get(titleKey) ?? []
      group.push(idx)
      titleIndex.set(titleKey, group)
    }
  }

  return { entries: kept, aliases, ambiguousGroups }
}

/** Rewrite citation matches so duplicates collapse onto their canonical bibKey. */
export function applyDedupeAliases(
  mappings: CitationMapping[],
  aliases: Record<string, string>
): void {
  if (Object.keys(aliases).length === 0) return
  for (const mapping of mappings) {
    if (mapping.matchedBibKeys.length === 0) continue
    mapping.matchedBibKeys = Array.from(
      new Set(mapping.matchedBibKeys.map((key) => aliases[key] ?? key))
    )
    const ambiguityCandidates = mapping.ambiguity?.candidates
    if (ambiguityCandidates?.length) {
      mapping.ambiguity!.candidates = Array.from(
        new Set(ambiguityCandidates.map((key) => aliases[key] ?? key))
      )
    }
  }
}

export function mapInTextToBibliography(
  citations: ParsedInTextCitation[],
  bibEntries: BibEntry[]
): CitationMapping[] {
  const byNumber = new Map<number, BibEntry>()
  for (const entry of bibEntries) {
    const n = Number.parseInt(entry.key.replace(/[^\d]/g, ''), 10)
    if (Number.isFinite(n)) byNumber.set(n, entry)
  }

  return citations.map((citation) => {
    const warnings: MappingWarning[] = []
    const matchedBibKeys: string[] = []

    if (citation.kind === 'numeric' && citation.numbers) {
      for (const n of citation.numbers) {
        const entry = byNumber.get(n)
        if (entry) matchedBibKeys.push(entry.key)
        else warnings.push({ citationRaw: citation.raw, message: `No bibliography entry found for [${n}]` })
      }
      return { citation, matchedBibKeys: Array.from(new Set(matchedBibKeys)), warnings }
    }

    if (citation.kind === 'author-year' && citation.authorFamilyNames && citation.year) {
      const year = citation.year
      const family = citation.authorFamilyNames[0]
      const candidates = bibEntries.filter((e) => matchesAuthorYear(e, family, year, citation.yearSuffix))

      if (candidates.length === 1) {
        matchedBibKeys.push(candidates[0].key)
      } else if (candidates.length > 1) {
        return {
          citation,
          matchedBibKeys: [],
          ambiguity: { candidates: candidates.map((c) => c.key), reason: `Multiple bibliography entries match ${family} ${year}` },
          warnings
        }
      } else {
        warnings.push({ citationRaw: citation.raw, message: `No bibliography entry found for ${family} ${year}` })
      }

      return { citation, matchedBibKeys, warnings }
    }

    return { citation, matchedBibKeys: [], warnings: [{ citationRaw: citation.raw, message: 'Unsupported citation format' }] }
  })
}

export async function buildBibEntriesFromReferencesText(referencesText: string): Promise<{
  entries: BibEntry[]
  errors: string[]
}> {
  const cleaned = stripLeadingReferencesHeader(referencesText)
  const rawEntries = splitReferenceEntries(cleaned)
  if (rawEntries.length === 0) return { entries: [], errors: ['No reference entries found'] }

  const parseResult = await parsePlainText(rawEntries.join('\n'))
  const numberedPattern = /^\s*\[?\d+[\].)]\s+/

  const entries: BibEntry[] = rawEntries.map((raw, idx) => {
    const numbered = raw.match(/^\s*\[?(\d+)[\].)]\s+/)
    const key = numbered?.[1] ?? `ref-${idx + 1}`
    return {
      key,
      raw: raw.replace(numberedPattern, '').trim(),
      item: parseResult.items[idx]
    }
  })

  return { entries, errors: parseResult.errors }
}

function stripLeadingReferencesHeader(text: string): string {
  const lines = text.split('\n')
  const firstNonEmptyIdx = lines.findIndex((l) => l.trim().length > 0)
  if (firstNonEmptyIdx < 0) return text
  const first = lines[firstNonEmptyIdx].trim()
  if (/^(references?|bibliography|works cited|literature cited)$/i.test(first)) {
    return lines.slice(firstNonEmptyIdx + 1).join('\n')
  }
  return text
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

function matchesAuthorYear(entry: BibEntry, family: string, year: number, suffix?: string): boolean {
  const raw = normalize(entry.raw)
  const familyNorm = normalize(family)
  const yearStr = String(year)
  if (!raw.includes(yearStr)) return false
  if (!raw.includes(familyNorm)) return false

  if (suffix) {
    // common in author-year bibliographies: "2020a"
    if (!raw.includes(`${yearStr}${suffix.toLowerCase()}`)) {
      // keep as match if bibliography doesn't encode suffix; disambiguation happens elsewhere
      return true
    }
  }

  return true
}

