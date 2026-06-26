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

const NUMBERED_REF_LINE = /^\s*\[?\d{1,4}[\].)]\s+\S/

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
  for (const line of lines) {
    const trimmed = line.trim().replace(/\uFEFF/g, '')
    if (REFERENCE_HEADER_LINE.test(trimmed)) {
      const start = offset
      const afterHeader = offset + line.length + 1
      return { start, afterHeader }
    }
    offset += line.length + 1
  }
  return null
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
  if (NUMBERED_REF_LINE.test(line)) return false
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

    if (NUMBERED_REF_LINE.test(line)) {
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
  const minCharRatio = text.length < 10_000 ? 0.08 : 0.2
  if (start < text.length * minCharRatio) return null
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
