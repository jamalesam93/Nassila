/**
 * Manuscript-grade PDF text extraction (column-aware, line breaks, de-hyphenation).
 * Bibliography PDF import (`parsePdf` in `engine/parser/document.ts`) uses this
 * extractor so reference entry splitting matches DOCX quality.
 *   - reading order (single column AND two-column layouts)
 *   - de-hyphenated line breaks ("antimicrob-\nial" -> "antimicrobial")
 *   - superscript citation markers where detected (mostly numeric in-text cites
 *     become parseable inline tokens, e.g. "...AMR ^12,13"; other small-type runs
 *     are left plain to avoid spurious "^" before affiliations / metadata).
 *
 * Quality caveat: structural detection (IMRAD headings) is best-effort on
 * PDFs because heading semantics are lost. Citation verification (L1/L2/L3)
 * is unaffected.
 */

const MAX_PDF_PAGES = 200
const MAX_EXTRACTED_TEXT_CHARS = 4_000_000

interface PdfTextItem {
  str: string
  transform: number[]
  width: number
  height: number
  fontName?: string
}

interface PageBlock {
  text: string
  x: number
  y: number
  fontSize: number
  isSuperscript: boolean
}

export interface PdfManuscriptExtraction {
  text: string
  pageCount: number
  warnings: string[]
}

export async function extractManuscriptFromPdf(
  buffer: ArrayBuffer
): Promise<PdfManuscriptExtraction> {
  const warnings: string[] = []

  const { loadPdfJs, configurePdfJsWorker } = await import('./pdfjs-loader')
  const pdfjsLib = await loadPdfJs()
  await configurePdfJsWorker(pdfjsLib)

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise

  const pageCount = pdf.numPages
  if (pageCount > MAX_PDF_PAGES) {
    throw new Error(`PDF has ${pageCount} pages; maximum supported is ${MAX_PDF_PAGES}.`)
  }

  let fullText = ''
  let totalGlyphCount = 0

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const items = content.items as PdfTextItem[]
    totalGlyphCount += items.reduce((s, it) => s + (it.str?.length ?? 0), 0)

    const blocks = itemsToBlocks(items)
    const ordered = reorderForColumns(blocks, viewport.width)
    const lines = blocksToLines(ordered)
    const pageText = linesToText(lines)

    fullText += pageText + '\n\n'
    if (fullText.length > MAX_EXTRACTED_TEXT_CHARS) {
      throw new Error('PDF text extraction exceeded the safe size limit (4 MB of text).')
    }
  }

  fullText = postProcess(fullText)

  if (totalGlyphCount === 0) {
    throw new Error(
      'This PDF contains no extractable text — it is likely a scan. ' +
        'Run it through OCR (e.g. ocrmypdf, Adobe Acrobat) and re-import.'
    )
  }

  if (totalGlyphCount < 200) {
    warnings.push(
      'Very little text was extracted. The PDF may be partially scanned or use embedded fonts without a Unicode map.'
    )
  }

  return { text: fullText, pageCount, warnings }
}

/**
 * Heuristic: in-text superscript cites are usually mostly digits / cite punctuation.
 * We only tag those (when font is smaller than body), plus *very* tiny runs (likely true superscripts).
 * A loose size-only rule tags affiliations, headers, and DOI lines as "^..." spuriously.
 */
function looksLikeSuperscriptCitationToken(s: string): boolean {
  const t = s.trim()
  if (!t || t.length > 24) return false
  const compact = t.replace(/\s+/g, '')
  if (!/\d/.test(compact)) return false
  let score = 0
  for (const ch of compact) {
    if (/\d/.test(ch)) score += 1
    else if (/[,.;:\-–—·()[\]]/.test(ch)) score += 1
  }
  return score >= compact.length * 0.55
}

function inferSuperscript(fontSize: number, median: number, text: string): boolean {
  if (!(median > 0 && fontSize > 0)) return false
  const ratio = fontSize / median
  const citeLike = looksLikeSuperscriptCitationToken(text)
  // Clearly smaller than body — allow short runs (numeric refs or tiny punctuation-only chunks)
  if (ratio < 0.46) {
    const tr = text.trim()
    return tr.length <= 8 && (citeLike || tr.length <= 3)
  }
  // Moderately smaller: only when content looks like a reference marker
  if (ratio < 0.68 && citeLike) return true
  return false
}

function itemsToBlocks(items: PdfTextItem[]): PageBlock[] {
  const blocks: PageBlock[] = []
  // First pass: compute median font height to detect superscripts.
  const heights = items.map((it) => Math.abs(it.transform[3] ?? it.height ?? 0)).filter((h) => h > 0)
  heights.sort((a, b) => a - b)
  const median = heights.length ? heights[Math.floor(heights.length / 2)] : 0

  for (const it of items) {
    if (!it.str) continue
    const x = it.transform[4] ?? 0
    const y = it.transform[5] ?? 0
    const fontSize = Math.abs(it.transform[3] ?? it.height ?? median)
    const isSuperscript = inferSuperscript(fontSize, median, it.str)
    blocks.push({ text: it.str, x, y, fontSize, isSuperscript })
  }
  return blocks
}

/**
 * Detect a 2-column layout by looking at the bimodal distribution of x
 * coordinates. If detected, emit blocks left-column-then-right-column;
 * otherwise return blocks in their original order (which pdfjs already
 * supplies in roughly reading order).
 */
function reorderForColumns(blocks: PageBlock[], pageWidth: number): PageBlock[] {
  if (blocks.length < 20) return blocks

  const xs = blocks.map((b) => b.x)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const span = maxX - minX
  if (span < pageWidth * 0.4) return blocks

  // Bin x positions in 16 buckets across the page; if the histogram has two
  // strong peaks separated by a valley, treat as two-column.
  const bins = new Array<number>(16).fill(0)
  for (const x of xs) {
    const idx = Math.min(15, Math.max(0, Math.floor(((x - minX) / span) * 16)))
    bins[idx]++
  }
  const peakLeft = indexOfMax(bins.slice(0, 6)) // left third (0-5)
  const peakRight = 10 + indexOfMax(bins.slice(10, 16)) // right third (10-15)
  const valleyMid = Math.min(...bins.slice(6, 10))
  const peakLeftCount = bins[peakLeft]
  const peakRightCount = bins[peakRight]
  const looksTwoColumn =
    peakLeftCount >= blocks.length * 0.15 &&
    peakRightCount >= blocks.length * 0.15 &&
    valleyMid < Math.min(peakLeftCount, peakRightCount) * 0.4

  if (!looksTwoColumn) return blocks

  const midX = minX + span / 2
  const left = blocks.filter((b) => b.x < midX)
  const right = blocks.filter((b) => b.x >= midX)
  // Sort each column by y descending (PDF y grows upward).
  left.sort((a, b) => b.y - a.y)
  right.sort((a, b) => b.y - a.y)
  return [...left, ...right]
}

function indexOfMax(arr: number[]): number {
  let best = 0
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i
  return best
}

/**
 * Group blocks into lines by clustering on y-coordinate. Keeps the
 * superscript flag so we can wrap superscripts in `^{...}` markers that the
 * existing in-text citation parser knows about.
 */
function blocksToLines(blocks: PageBlock[]): { text: string; y: number }[] {
  const lines: { y: number; items: PageBlock[] }[] = []
  const Y_TOLERANCE = 2.5

  for (const b of blocks) {
    let line = lines.find((l) => Math.abs(l.y - b.y) <= Y_TOLERANCE)
    if (!line) {
      line = { y: b.y, items: [] }
      lines.push(line)
    }
    line.items.push(b)
  }

  // For each line: sort by x, build text, mark superscript runs.
  return lines.map((l) => {
    l.items.sort((a, b) => a.x - b.x)
    let text = ''
    let inSuper = false
    let prevX: number | null = null
    let prevW: number | null = null

    for (const it of l.items) {
      if (prevX !== null && prevW !== null) {
        const gap = it.x - (prevX + prevW)
        if (gap > 1.5) text += ' '
      }
      if (it.isSuperscript && !inSuper) {
        text += '^'
        inSuper = true
      } else if (!it.isSuperscript && inSuper) {
        inSuper = false
      }
      text += it.text
      prevX = it.x
      prevW = it.text.length * (it.fontSize * 0.5)
    }

    return { text: text.trim(), y: l.y }
  })
}

function linesToText(lines: { text: string; y: number }[]): string {
  return lines
    .filter((l) => l.text)
    .map((l) => l.text)
    .join('\n')
}

/**
 * - De-hyphenate words split across line breaks ("antimicrob-\nial" -> "antimicrobial")
 *   but preserve real hyphens ("co-author").
 * - Collapse 3+ blank lines.
 * - Normalize ligatures (ﬁ -> fi, etc.) which some PDFs emit as private-use
 *   glyphs but most modern fonts already map.
 * - Trim trailing whitespace per line.
 */
function postProcess(text: string): string {
  let out = text
  out = out.replace(/\uFB00/g, 'ff').replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi').replace(/\uFB04/g, 'ffl').replace(/\uFB05/g, 'ft').replace(/\uFB06/g, 'st')
  // De-hyphenation: only join when the suffix starts lowercase (a real word
  // continuation) and the prefix ends with a letter.
  out = out.replace(/([A-Za-z]{2,})-\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/([A-Za-z]{2,})-\s*\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/\n{3,}/g, '\n\n')
  out = out.replace(/[ \t]+\n/g, '\n')
  return out.trim()
}
