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

export function segmentManuscriptText(fullText: string): ManuscriptSegments {
  const refMatch = findReferenceHeader(fullText)
  if (!refMatch) {
    return { fullText, bodyText: fullText, referencesText: null, headings: extractHeadings(fullText) }
  }

  const bodyText = fullText.slice(0, refMatch.start).trim()
  const referencesText = fullText.slice(refMatch.afterHeader).trim()

  return {
    fullText,
    bodyText,
    referencesText: referencesText.length > 0 ? referencesText : null,
    headings: extractHeadings(fullText)
  }
}

const REFERENCE_HEADERS = [
  /^references?\s*$/im,
  /^bibliography\s*$/im,
  /^works?\s+cited\s*$/im,
  /^literature\s+cited\s*$/im,
  /^cited\s+references?\s*$/im,
  /^reference\s+list\s*$/im
]

function findReferenceHeader(text: string): { start: number; afterHeader: number } | null {
  for (const pattern of REFERENCE_HEADERS) {
    const match = text.match(pattern)
    if (match && match.index != null) {
      const start = match.index
      const afterHeader = match.index + match[0].length
      return { start, afterHeader }
    }
  }
  return null
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

    // Common heading heuristics: Title Case line OR all-caps line, surrounded by blank lines
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

