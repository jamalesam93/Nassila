export type InTextCitationKind = 'numeric' | 'author-year' | 'unknown'

export interface ParsedInTextCitation {
  kind: InTextCitationKind
  raw: string
  start: number
  end: number
  numbers?: number[]
  authorFamilyNames?: string[]
  year?: number
  yearSuffix?: string
  locator?: string
  confidence: 'high' | 'medium' | 'low'
}

export interface InTextParseResult {
  citations: ParsedInTextCitation[]
  warnings: string[]
}

export function parseInTextCitations(text: string): InTextParseResult {
  const warnings: string[] = []
  const citations: ParsedInTextCitation[] = []

  // Numeric brackets: [1], [1-5], [1,3,7], [12, pp. 45-48]
  const numericBracket = /\[(\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)\s*(?:,\s*([^\]]{1,30}))?\]/g
  for (const match of text.matchAll(numericBracket)) {
    const raw = match[0]
    const list = match[1]
    const locator = match[2]?.trim()
    const start = match.index ?? 0
    const end = start + raw.length
    const numbers = parseNumericList(list)
    if (numbers.length === 0) {
      warnings.push(`Could not parse numeric citation list: ${raw}`)
      continue
    }
    citations.push({
      kind: 'numeric',
      raw,
      start,
      end,
      numbers,
      locator,
      confidence: 'high'
    })
  }

  // Numeric parentheses: (1), (1–3), (6,7)
  // IMPORTANT: must run before author-year parsing, and only match digits/separators to avoid conflicting with (Smith, 2020).
  // Enumerated list markers after "to: (1) provide…" are rejected — see isEnumeratedListMarker.
  const numericParen = /\((\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)\s*\)/g
  for (const match of text.matchAll(numericParen)) {
    const raw = match[0]
    const list = match[1]
    const start = match.index ?? 0
    const end = start + raw.length
    const numbers = parseNumericList(list)
    if (numbers.length === 0) continue
    if (isEnumeratedListMarker(text, start, end, numbers)) continue
    citations.push({
      kind: 'numeric',
      raw,
      start,
      end,
      numbers,
      confidence: 'high'
    })
  }

  // Superscript markup (best-effort for DOCX HTML extraction later): <sup>1,3</sup>
  const sup = /<sup>(\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)<\/sup>/g
  for (const match of text.matchAll(sup)) {
    const raw = match[0]
    const list = match[1]
    const start = match.index ?? 0
    const end = start + raw.length
    const numbers = parseNumericList(list)
    if (numbers.length === 0) continue
    citations.push({
      kind: 'numeric',
      raw,
      start,
      end,
      numbers,
      confidence: 'medium'
    })
  }

  // Parenthetical author-year: (Smith, 2020a, p. 12)
  const authorYearParen =
    /\(([^()]{2,80}?)\s*,\s*(\d{4})([a-z])?(?:\s*,\s*([^)]{1,30}))?\)/gi
  for (const match of text.matchAll(authorYearParen)) {
    const raw = match[0]
    const authorsRaw = match[1]
    const year = Number.parseInt(match[2], 10)
    const yearSuffix = match[3]
    const locator = match[4]?.trim()
    const start = match.index ?? 0
    const end = start + raw.length
    const authorFamilyNames = parseAuthorFamilyNames(authorsRaw)
    if (authorFamilyNames.length === 0 || !Number.isFinite(year)) continue
    citations.push({
      kind: 'author-year',
      raw,
      start,
      end,
      authorFamilyNames,
      year,
      yearSuffix,
      locator,
      confidence: 'medium'
    })
  }

  // Narrative author-year: Smith (2020b)
  const narrative = /\b([A-Z][\p{L}'’-]+)\s*\((\d{4})([a-z])?\)/giu
  for (const match of text.matchAll(narrative)) {
    const raw = match[0]
    const author = match[1]
    const year = Number.parseInt(match[2], 10)
    const yearSuffix = match[3]
    const start = match.index ?? 0
    const end = start + raw.length
    citations.push({
      kind: 'author-year',
      raw,
      start,
      end,
      authorFamilyNames: [normalizeName(author)],
      year,
      yearSuffix,
      confidence: 'medium'
    })
  }

  // Order by appearance, then de-duplicate exact spans.
  citations.sort((a, b) => a.start - b.start || a.end - b.end)
  const deduped: ParsedInTextCitation[] = []
  const seen = new Set<string>()
  for (const c of citations) {
    const key = `${c.kind}:${c.start}:${c.end}:${c.raw}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(c)
  }

  return { citations: deduped, warnings }
}

/**
 * Detect objectives/aims-style enumerated list markers such as
 * "…are to: (1) provide …; (2) conduct …; and (4) propose…" so they are not
 * treated as Vancouver cites. Conservatively preserves end-of-claim forms like
 * "… outcome (4)." and grouped/ranged cites.
 */
export function isEnumeratedListMarker(
  text: string,
  start: number,
  end: number,
  numbers: number[]
): boolean {
  // Ranges and groups are never list markers: (1–3), (6,7).
  if (numbers.length !== 1) return false

  const before = text.slice(Math.max(0, start - 80), start)
  const after = text.slice(end).replace(/^\s+/, '')
  if (!/^[A-Za-z]/.test(after)) return false

  // Strong signal: colon immediately before the marker (list intro).
  if (/:\s*$/.test(before)) return true

  // Continuation after "; (2) …", ", (3) …", or "and (4) …" when an earlier
  // "(n-1) <letter>" itself followed a colon in the same paragraph.
  const n = numbers[0]
  if (n > 1) {
    const earlier = text.slice(Math.max(0, start - 500), start)
    const prev = new RegExp(`:\\s*[\\s\\S]{0,400}\\(${n - 1}\\)\\s+[A-Za-z]`)
    if (prev.test(earlier)) return true
  }

  return false
}

function parseNumericList(list: string): number[] {
  const result: number[] = []
  const parts = list.split(',').map((p) => p.trim()).filter(Boolean)
  for (const part of parts) {
    const range = part.split(/[-–]/).map((p) => p.trim())
    if (range.length === 1) {
      const n = Number.parseInt(range[0], 10)
      if (Number.isFinite(n)) result.push(n)
      continue
    }
    if (range.length === 2) {
      const start = Number.parseInt(range[0], 10)
      const end = Number.parseInt(range[1], 10)
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue
      if (end < start) continue
      for (let i = start; i <= end; i++) result.push(i)
    }
  }
  return Array.from(new Set(result)).sort((a, b) => a - b)
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9'’-]+/g, '')
}

function parseAuthorFamilyNames(authorsRaw: string): string[] {
  const normalized = authorsRaw
    .replace(/et\s+al\.?/gi, '')
    .replace(/&/g, ' and ')
    .replace(/;/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = normalized
    .split(/\band\b/i)
    .map((p) => p.trim())
    .filter(Boolean)

  const names: string[] = []
  for (const p of parts) {
    // "Smith" or "Smith J" or "Smith, J."
    const family = p.split(',')[0].trim().split(' ')[0]?.trim()
    if (family) names.push(normalizeName(family))
  }
  return Array.from(new Set(names))
}

