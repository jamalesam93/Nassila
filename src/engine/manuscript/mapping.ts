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

