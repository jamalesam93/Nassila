/**
 * Programmatic PDF builder for Maktab golden fixtures.
 * Hand-builds minimal valid PDFs (embedded Helvetica text, Type0 Arabic with
 * ToUnicode CMap, image-only scans) so tests need no committed binary assets.
 * xref byte offsets are computed from assembled chunks; any offset error fails
 * loudly at load time (pdf.js getDocument / WASM parse).
 */

export interface PdfTextRun {
  x: number
  y: number
  size: number
  text: string
}

export const GOLDEN_PAGE_WIDTH = 612
export const GOLDEN_PAGE_HEIGHT = 792

/** >200 glyphs so pdf.js does not flag the embedded fixture as sparse. */
export const GOLDEN_EMBEDDED_TEXT =
  'This golden manuscript sentence describes antimicrobial resistance surveillance ' +
  'in tertiary care hospitals across five regions and exceeds the sparse text threshold ' +
  'used for extraction review flags, with follow-up monitoring confirming the trend.'

const ARABIC_PHRASE = 'في الصحة العامة والتنمية المستدامة'

/**
 * Character-reversed Arabic (broken ToUnicode): 22× phrase with each word's
 * letters reversed ("في" → "يف") so pdf.js extraction triggers the reversal
 * heuristic (ara > 500, "يف" > 20) and the DOCX-deferral path.
 */
export const GOLDEN_REVERSED_ARABIC_TEXT = Array.from({ length: 22 }, () => ARABIC_PHRASE)
  .join(' ')
  .split(' ')
  .map((word) => [...word].reverse().join(''))
  .join(' ')

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function utf16Hex(text: string): string {
  let out = ''
  for (const ch of text) {
    out += (ch.codePointAt(0) as number).toString(16).padStart(4, '0')
  }
  return out
}

function textContentStream(runs: PdfTextRun[]): string {
  const body = runs
    .map(
      (r) =>
        `/F1 ${r.size} Tf 1 0 0 1 ${r.x} ${r.y} Tm (${escapePdfText(r.text)}) Tj`
    )
    .join('\n')
  return `BT\n${body}\nET`
}

function arabicContentStream(runs: PdfTextRun[]): string {
  const body = runs
    .map((r) => `/F1 ${r.size} Tf 1 0 0 1 ${r.x} ${r.y} Tm <${utf16Hex(r.text)}> Tj`)
    .join('\n')
  return `BT\n${body}\nET`
}

function assemblePdf(objectBodies: string[]): ArrayBuffer {
  const encoder = new TextEncoder()
  const header = encoder.encode('%PDF-1.4\n')
  const encoded = objectBodies.map((body, index) =>
    encoder.encode(`${index + 1} 0 obj\n${body}\nendobj\n`)
  )
  const offsets: number[] = []
  let cursor = header.length
  for (const piece of encoded) {
    offsets.push(cursor)
    cursor += piece.length
  }
  const xrefStart = cursor
  const xref = encoder.encode(
    `xref\n0 ${objectBodies.length + 1}\n` +
      '0000000000 65535 f \n' +
      offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  )
  const trailer = encoder.encode(
    `trailer\n<</Size ${objectBodies.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`
  )
  const out = new Uint8Array(cursor + xref.length + trailer.length)
  let pos = 0
  for (const piece of [header, ...encoded, xref, trailer]) {
    out.set(piece, pos)
    pos += piece.length
  }
  return out.buffer
}

function catalogObject(): string {
  return '<</Type/Catalog/Pages 2 0 R>>'
}

function pagesObject(pageRefs: string[]): string {
  return `<</Type/Pages/Kids[${pageRefs.join(' ')}]/Count ${pageRefs.length}>>`
}

function pageObject(contentRef: number, fontDictBody: string): string {
  return [
    `<</Type/Page/MediaBox[0 0 ${GOLDEN_PAGE_WIDTH} ${GOLDEN_PAGE_HEIGHT}]`,
    `/Parent 2 0 R/Resources<</Font<</${fontDictBody}>>>>/Contents ${contentRef} 0 R>>`
  ].join('')
}

/** Single- or multi-page PDF with embedded Helvetica text (tier A). */
export function buildTextPdf(pages: PdfTextRun[][]): ArrayBuffer {
  const n = pages.length
  const fontRef = 3 + n
  const streamStart = fontRef + 1
  const bodies: string[] = [
    catalogObject(),
    pagesObject(Array.from({ length: n }, (_, i) => `${3 + i} 0 R`))
  ]
  for (let i = 0; i < n; i++) {
    bodies.push(pageObject(streamStart + i, `F1 ${fontRef} 0 R`))
  }
  bodies.push('<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>')
  for (const runs of pages) {
    const stream = textContentStream(runs)
    bodies.push(`<</Length ${stream.length}>>stream\n${stream}\nendstream`)
  }
  return assemblePdf(bodies)
}

/** Wrap text into lines of at most `maxChars` (word boundaries). */
export function splitIntoLines(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    if (current && current.length + 1 + word.length > maxChars) {
      lines.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) lines.push(current)
  return lines
}

function runsForLines(lines: string[], yStart: number, step: number, size: number): PdfTextRun[] {
  return lines.map((text, i) => ({ x: 60, y: yStart - i * step, size, text }))
}

/**
 * One or more pages of wrapped golden embedded text — each page carries
 * >200 glyphs inside the page width, so neither engine flags it as sparse.
 */
export function buildEmbeddedTextPdf(texts: string[]): ArrayBuffer {
  return buildTextPdf(texts.map((text) => runsForLines(splitIntoLines(text, 60), 740, 22, 12)))
}

/** Fewer than 200 glyphs — pdf.js reports the sparse-text warning. */
export function buildSparseTextPdf(): ArrayBuffer {
  return buildTextPdf([[{ x: 72, y: 700, size: 12, text: 'abc def' }]])
}

/**
 * Two-column page: left column x=60, right column x=380, staggered baselines
 * (left even y, right odd y) so pdf.js `reorderForColumns` has observable
 * effect. Right-column runs are written first in the content stream; correct
 * reading order must place left column first.
 */
export function buildTwoColumnPdf(): ArrayBuffer {
  const runs: PdfTextRun[] = []
  for (let i = 0; i < 12; i++) {
    const rightY = 705 - i * 20
    const leftY = rightY - 5
    runs.push({ x: 380, y: rightY, size: 12, text: `R${String(i + 1).padStart(2, '0')} second column sentence` })
    runs.push({ x: 60, y: leftY, size: 12, text: `L${String(i + 1).padStart(2, '0')} first column sentence` })
  }
  return buildTextPdf([runs])
}

/** Image-only page (no text operators) — both engines treat it as a scan. */
export function buildScanPdf(): ArrayBuffer {
  return buildTextPdf([[]])
}

/** Body + References heading + numbered entries — segmentable bibliography. */
export function buildReferencesPdf(): ArrayBuffer {
  const lines = [
    'Introduction',
    'This study examines the role of antimicrobial resistance in clinical settings across five hospitals.',
    'Methods',
    'We analyzed registry records from 2019 to 2024 using standard surveillance definitions.',
    'Results',
    'Resistance rates increased among Gram-negative isolates during the study period.',
    'References',
    '1. Smith J, Jones A. Antimicrobial resistance surveillance. Lancet 2024;45:120-130.',
    '2. Doe R. Hospital stewardship programs. N Engl J Med 2023;89:45-52.',
    '3. Khan S et al. Resistance trends in tertiary care. J Infect Dis 2022;76:98-110.'
  ]
  const runs: PdfTextRun[] = lines.map((text, index) => ({
    x: 60,
    y: 740 - index * 22,
    size: 12,
    text
  }))
  return buildTextPdf([runs])
}

/**
 * Type0 (Identity-H) PDF with UTF-16BE hex text — pdf.js extracts the Arabic
 * script directly from the char codes. Text is wrapped per line so >500 Arabic
 * chars extract (wide glyphs otherwise truncate at the page edge), which
 * routes to the `shouldDeferArabicToDocx` path (ara > 200 and dominant).
 */
export function buildArabicTextPdf(text: string): ArrayBuffer {
  const runs = splitIntoLines(text, 35).map((line, i) => ({
    x: 60,
    y: 740 - i * 20,
    size: 12,
    text: line
  }))
  const bodies = [
    catalogObject(),
    pagesObject(['3 0 R']),
    pageObject(6, 'F1 4 0 R'),
    [
      '<</Type/Font/Subtype/Type0/BaseFont/ArabicFixture/Encoding/Identity-H',
      '/DescendantFonts[5 0 R]>>'
    ].join(' '),
    [
      '<</Type/Font/Subtype/CIDFontType2/BaseFont/ArabicFixture',
      '/CIDSystemInfo<</Registry(Adobe)/Ordering(Identity)/Supplement 0>>',
      '/FontDescriptor<</Type/FontDescriptor/FontName/ArabicFixture/FontBBox[0 0 1000 1000]/Flags 32>>',
      '/DW 1000/CIDToGIDMap/Identity>>'
    ].join(' ')
  ]
  const stream = arabicContentStream(runs)
  bodies.push(`<</Length ${stream.length}>>stream\n${stream}\nendstream`)
  return assemblePdf(bodies)
}
