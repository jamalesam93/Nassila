export interface HeadingNode {
  title: string
  level: number
  start: number
  end: number
}

export interface ManuscriptSegments {
  fullText: string
  bodyText: string
  referencesText: string | null
  headings: HeadingNode[]
}

/** Normalize line endings for section detection. */
export function normalizeManuscriptText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

const REFERENCE_HEADER_LINE =
  /^(?:references?|bibliography|works?\s+cited|literature\s+cited|cited\s+references?|reference\s+list)\s*[:.]?\s*$/i

/** IMRAD-style numbered headings from PDF/Word (e.g. "9. References"). */
const NUMBERED_REFERENCE_HEADER_LINE =
  /^\d{1,2}\.\s*(?:references?|bibliography|works?\s+cited|literature\s+cited|cited\s+references?|reference\s+list)\s*[:.]?\s*$/i

/** TOC lines often append a page number after a tab or wide gap. */
function isLikelyTocLine(line: string, trimmed: string): boolean {
  if (/\t\d{1,4}\s*$/.test(line)) return true
  if (/\s{2,}\d{1,4}\s*$/.test(trimmed)) return true
  return false
}

/**
 * Bibliography / references section heading — EN exact lines plus common AR / bilingual forms.
 * Avoid glossary headings (قائمة المصطلحات).
 */
function isReferenceHeaderLine(trimmed: string): boolean {
  const t = trimmed.replace(/\uFEFF/g, '').trim()
  if (!t || t.length > 120) return false
  if (REFERENCE_HEADER_LINE.test(t) || NUMBERED_REFERENCE_HEADER_LINE.test(t)) return true

  // Glossary / abbreviations — not the bibliography
  if (/المصطلحات|الاختصارات|اختصارات/.test(t)) return false

  if (/academic\s*bibliography/i.test(t)) return true
  // قائمة المراجع / قائمة المراجع والمصادر / قائمة املراجع (garbled PDF lam)
  if (/قائمة\s+ال?\S{0,4}مراجع/.test(t)) return true
  if (/ال?\S{0,4}مراجع\s+وال?\S{0,4}مصادر/.test(t)) return true
  if (/^(?:أولا|ثانيا|ثالثا)[ًا]?\s*[:：.]?\s*ال?\S{0,4}مراجع\b/u.test(t)) return true
  if (/^ال?\S{0,4}مراجع\s*[:.،]?\s*$/u.test(t)) return true
  if (/^ال?\S{0,4}مصادر\s*[:.،]?\s*$/u.test(t)) return true
  return false
}

const BRACKET_BIB_LINE = /^\s*\[\d{1,4}\]\s*\S/
const DOT_NUMBERED_LINE = /^\s*\d{1,4}\.\s+\S/

const SECTION_TITLE_WORDS =
  /^(introduction|abstract|methods?|materials?|results?|discussion|conclusion|background|references?|bibliography|literature\s+review|acknowledgements?|appendix)(?:\s|$)/i

function isNumberedSectionHeading(line: string): boolean {
  const t = line.trim()
  const m = t.match(/^\d{1,2}\.\s+(.+)$/)
  if (!m) return false
  const title = m[1].trim()
  if (title.length > 55) return false
  if (looksLikeBibliographyLine(t)) return false
  if (SECTION_TITLE_WORDS.test(title)) return true
  if (title.length < 45 && !/[;,]/.test(title) && !/\b(19|20)\d{2}\b/.test(title)) return true
  return false
}

/** Bibliography entry line — not a numbered section heading like "1. Introduction". */
function isNumberedBibliographyLine(line: string): boolean {
  const t = line.trim()
  if (BRACKET_BIB_LINE.test(line)) return true
  if (!DOT_NUMBERED_LINE.test(line)) return false
  if (isNumberedSectionHeading(line)) return false
  if (looksLikeBibliographyLine(t)) return true
  if (t.length >= 50 && /[,;]/.test(t)) return true
  return t.length >= 70
}

export function findReferencesBoundary(text: string): { start: number; afterHeader: number; kind: 'header' | 'numbered' } | null {
  const normalized = normalizeManuscriptText(text)
  const header = findReferenceHeader(normalized)
  if (header) return { ...header, kind: 'header' }
  const numbered = findNumberedReferencesBlock(normalized)
  if (numbered) return { ...numbered, kind: 'numbered' }
  return null
}

export function segmentManuscriptText(fullText: string): ManuscriptSegments {
  const normalized = normalizeManuscriptText(fullText)
  const refMatch = findReferencesBoundary(normalized)
  if (!refMatch) {
    return { fullText: normalized, bodyText: normalized, referencesText: null, headings: extractHeadings(normalized) }
  }

  const bodyText = normalized.slice(0, refMatch.start).trim()
  const referencesText = normalized.slice(refMatch.afterHeader).trim()

  return {
    fullText: normalized,
    bodyText,
    referencesText: referencesText.length > 0 ? referencesText : null,
    headings: extractHeadings(normalized)
  }
}

function findReferenceHeader(text: string): { start: number; afterHeader: number } | null {
  const lines = text.split('\n')
  let offset = 0
  let best: { start: number; afterHeader: number } | null = null

  for (const line of lines) {
    const trimmed = line.trim().replace(/\uFEFF/g, '')
    // Prefer the last body heading; skip TOC entries ("…\t118").
    if (isReferenceHeaderLine(trimmed) && !isLikelyTocLine(line, trimmed)) {
      best = { start: offset, afterHeader: offset + line.length + 1 }
    }
    offset += line.length + 1
  }
  return best
}

function looksLikeBibliographyLine(line: string): boolean {
  return (
    /\b(19|20)\d{2}\b/.test(line) ||
    /doi\.org|10\.\d{4,}\//i.test(line) ||
    /;\s*\d+\(\d+/.test(line) ||
    /\.\s+[A-Z][\p{L}&]+.*\d{4}/u.test(line)
  )
}

function isWrappedReferenceLine(line: string): boolean {
  const t = line.trim()
  if (t.length < 12) return false
  if (/^(introduction|abstract|methods|results|discussion|conclusion|background|references?|bibliography)\b/i.test(t)) {
    return false
  }
  if (isNumberedBibliographyLine(line)) return false
  return looksLikeBibliographyLine(t) || /^[a-z(]/.test(t) || /[;,.)]\s*$/.test(t)
}

/** Fallback when there is no standalone References heading (common in Word exports). */
function findNumberedReferencesBlock(text: string): { start: number; afterHeader: number } | null {
  const lines = text.split('\n')
  const lineStarts: number[] = []
  let offset = 0
  for (const line of lines) {
    lineStarts.push(offset)
    offset += line.length + 1
  }

  let blockStartIdx = -1
  let blockEndIdx = -1
  let numberedCount = 0
  let bibLikeCount = 0

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    const trimmed = line.trim()
    if (!trimmed) continue

    if (isNumberedBibliographyLine(line)) {
      blockStartIdx = i
      if (blockEndIdx === -1) blockEndIdx = i
      numberedCount++
      if (looksLikeBibliographyLine(trimmed)) bibLikeCount++
      continue
    }

    if (blockEndIdx !== -1) {
      if (isWrappedReferenceLine(line)) {
        blockStartIdx = i
        continue
      }
      break
    }
  }

  if (numberedCount < 3) return null
  if (bibLikeCount < Math.min(2, numberedCount)) return null
  const start = lineStarts[blockStartIdx]!

  // References-only paste (no body): numbered block begins at document start.
  if (start === 0) {
    return { start, afterHeader: start }
  }

  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length
  const tailLineRatio = nonEmptyLines > 0 ? (blockEndIdx + 1) / nonEmptyLines : 1
  const minCharRatio = text.length < 10_000 ? 0.05 : 0.12
  if (start < text.length * minCharRatio && tailLineRatio < 0.45) return null
  return { start, afterHeader: start }
}

function extractHeadings(text: string): HeadingNode[] {
  const lines = text.split('\n')
  const nodes: HeadingNode[] = []
  let offset = 0

  for (const line of lines) {
    const trimmed = line.trim()
    const start = offset
    const end = offset + line.length
    offset = end + 1

    if (trimmed.length < 3) continue
    if (trimmed.length > 120) continue

    const isAllCaps = /^[A-Z0-9\s\-,()]+$/.test(trimmed) && /[A-Z]/.test(trimmed)
    const isTitleCase = /^[A-Z][\p{L}\p{N}\s\-,()]{2,}$/u.test(trimmed) && !/[.?!]$/.test(trimmed)

    if (isAllCaps || isTitleCase) {
      nodes.push({ title: trimmed, level: guessHeadingLevel(trimmed), start, end })
    }
  }

  return nodes
}

function guessHeadingLevel(title: string): number {
  if (/^\d+\.\d+/.test(title)) return 3
  if (/^\d+\./.test(title)) return 2
  return 1
}
