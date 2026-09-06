import type { ShahidEvidence, ShahidPageBoundary, ShahidRegionKind } from './types'

const CAPTION_LINE_RE =
  /^(Figure|Fig\.?|Table)\s+(\d+[A-Za-z]?)\s*[:.\u2013\u2014-]?\s*(.*)$/i
const TABLE_ROW_RE = /^\|.*\|$/
const TABLE_SEP_RE = /^\|[\s:|-]+\|$/

/**
 * Parse Markdown tables and Figure/Table caption lines into Shahid evidence rows
 * with page locators from character-offset page boundaries.
 */
export function extractDeterministicEvidenceFromMarkdown(
  markdown: string,
  pageBoundaries: ShahidPageBoundary[]
): ShahidEvidence[] {
  if (!markdown.trim()) return []

  const lines = splitLinesWithOffsets(markdown)
  const evidence: ShahidEvidence[] = []
  let seq = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    const captionMatch = CAPTION_LINE_RE.exec(line.text.trim())
    if (captionMatch) {
      const kindLabel = captionMatch[1]!.toLowerCase()
      const regionKind: ShahidRegionKind = kindLabel.startsWith('tab') ? 'table' : 'figure'
      const label = `${captionMatch[1]} ${captionMatch[2]}`.replace(/\s+/g, ' ').trim()
      const rest = (captionMatch[3] ?? '').trim()
      const caption = rest ? `${label}: ${rest}` : label
      const page = pageForOffset(line.start, pageBoundaries)
      // Prefer associating a following Markdown table (past optional blank lines) with a Table caption.
      if (regionKind === 'table') {
        let nextIdx = i + 1
        while (nextIdx < lines.length && lines[nextIdx]!.text.trim() === '') {
          nextIdx++
        }
        if (nextIdx < lines.length && isTableRow(lines[nextIdx]!.text)) {
          const table = collectTable(lines, nextIdx)
          if (table) {
            seq += 1
            evidence.push(tableEvidence(seq, table, pageBoundaries, caption))
            i = table.endIndex + 1
            continue
          }
        }
      }

      seq += 1
      evidence.push({
        id: `shahid-caption-${seq}`,
        regionKind: 'caption',
        page,
        caption,
        text: caption,
        extractionMethod: 'deterministic',
        confidence: rest.length > 0 ? 0.85 : 0.7,
        reviewState: 'needs_review'
      })
      i += 1
      continue
    }

    if (isTableRow(line.text) && !TABLE_SEP_RE.test(line.text.trim())) {
      const table = collectTable(lines, i)
      if (table && table.bodyLines.length > 0) {
        seq += 1
        evidence.push(tableEvidence(seq, table, pageBoundaries))
        i = table.endIndex + 1
        continue
      }
    }

    i += 1
  }

  return evidence
}

function tableEvidence(
  seq: number,
  table: CollectedTable,
  pageBoundaries: ShahidPageBoundary[],
  caption?: string
): ShahidEvidence {
  const page = pageForOffset(table.start, pageBoundaries)
  const text = table.bodyLines.join('\n')
  const cellEvidence = firstDataCell(table.bodyLines)
  return {
    id: `shahid-table-${seq}`,
    regionKind: 'table',
    page,
    caption,
    text: text.slice(0, 4000),
    cellEvidence,
    extractionMethod: 'deterministic',
    confidence: caption ? 0.8 : 0.65,
    reviewState: 'needs_review'
  }
}

interface LineSpan {
  text: string
  start: number
  end: number
}

interface CollectedTable {
  start: number
  endIndex: number
  bodyLines: string[]
}

function splitLinesWithOffsets(markdown: string): LineSpan[] {
  const out: LineSpan[] = []
  let start = 0
  const parts = markdown.split('\n')
  for (let i = 0; i < parts.length; i++) {
    const text = parts[i]!
    const end = start + text.length
    out.push({ text, start, end })
    start = end + 1 // account for '\n'
  }
  return out
}

function isTableRow(text: string): boolean {
  const t = text.trim()
  return TABLE_ROW_RE.test(t)
}

function collectTable(lines: LineSpan[], startIndex: number): CollectedTable | null {
  const first = lines[startIndex]
  if (!first || !isTableRow(first.text)) return null

  const bodyLines: string[] = []
  let endIndex = startIndex
  for (let i = startIndex; i < lines.length; i++) {
    const row = lines[i]!.text
    if (!isTableRow(row) && row.trim() !== '') break
    if (isTableRow(row)) {
      bodyLines.push(row.trim())
      endIndex = i
    } else if (bodyLines.length > 0) {
      // blank line ends table
      break
    }
  }

  // Need header + separator at minimum, or at least two pipe rows
  const meaningful = bodyLines.filter((r) => !TABLE_SEP_RE.test(r))
  if (meaningful.length === 0) return null
  if (bodyLines.length < 2 && meaningful.length < 1) return null

  return { start: first.start, endIndex, bodyLines }
}

function firstDataCell(bodyLines: string[]): string | undefined {
  for (const row of bodyLines) {
    if (TABLE_SEP_RE.test(row)) continue
    const cells = row
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean)
    if (cells.length === 0) continue
    // Skip pure header-looking first row if next is separator — still return a cell
    const sample = cells.slice(0, 3).join(' | ')
    if (sample) return sample.slice(0, 200)
  }
  return undefined
}

function pageForOffset(offset: number, pageBoundaries: ShahidPageBoundary[]): number | undefined {
  if (!pageBoundaries.length) return undefined
  for (const b of pageBoundaries) {
    if (offset >= b.start && offset < b.end) return b.page
  }
  // Clamp to last page when offset equals end of text
  const last = pageBoundaries[pageBoundaries.length - 1]!
  if (offset >= last.start && offset <= last.end) return last.page
  return undefined
}
