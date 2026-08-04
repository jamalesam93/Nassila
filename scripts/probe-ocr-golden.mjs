/**
 * Golden OCR content probe — real Tesseract (tier B) through the real pdf.js
 * rasterization path, against the same generated-PDF fixture design as
 * `tests/unit/maktab-golden-fixtures.test.ts`.
 *
 * Unit tests assert routing (sparse/scan/embedded) without Tesseract; this
 * probe asserts that genuine OCR of a rasterized golden page recovers the
 * golden content markers. Run in the packaged/CI Windows job:
 *
 *   npm run probe:ocr:golden
 */
import { app } from 'electron'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const require = createRequire(join(root, 'package.json'))

// ---------------------------------------------------------------------------
// Golden fixture builder (same design as tests/fixtures/maktab-pdf-builder.ts)
// ---------------------------------------------------------------------------

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function textContentStream(runs) {
  const body = runs
    .map((r) => `/F1 ${r.size} Tf 1 0 0 1 ${r.x} ${r.y} Tm (${escapePdfText(r.text)}) Tj`)
    .join('\n')
  return `BT\n${body}\nET`
}

function splitIntoLines(text, maxChars) {
  const lines = []
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

function assemblePdf(objectBodies) {
  const encoder = new TextEncoder()
  const header = encoder.encode('%PDF-1.4\n')
  const encoded = objectBodies.map((body, index) =>
    encoder.encode(`${index + 1} 0 obj\n${body}\nendobj\n`)
  )
  const offsets = []
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

function buildTextPdf(pages) {
  const n = pages.length
  const fontRef = 3 + n
  const streamStart = fontRef + 1
  const bodies = [
    '<</Type/Catalog/Pages 2 0 R>>',
    `<</Type/Pages/Kids[${Array.from({ length: n }, (_, i) => `${3 + i} 0 R`).join(' ')}]/Count ${n}>>`
  ]
  for (let i = 0; i < n; i++) {
    bodies.push(
      `<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 ${fontRef} 0 R>>>>/Contents ${streamStart + i} 0 R>>`
    )
  }
  bodies.push('<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>')
  for (const runs of pages) {
    const stream = textContentStream(runs)
    bodies.push(`<</Length ${stream.length}>>stream\n${stream}\nendstream`)
  }
  return assemblePdf(bodies)
}

const GOLDEN_OCR_MARKERS = {
  title: 'Antimicrobial Resistance Surveillance Study',
  body: 'tertiary care hospitals across five regions',
  year: '2019',
  reference: 'Smith'
}

const GOLDEN_OCR_TEXT = [
  GOLDEN_OCR_MARKERS.title,
  'This golden manuscript describes antimicrobial resistance surveillance',
  'in tertiary care hospitals across five regions from 2019 to 2024.',
  'Follow-up monitoring confirmed the trend during the study period.',
  'References',
  '1. Smith J, Jones A. Antimicrobial resistance surveillance. Lancet 2024;45:120-130.',
  '2. Doe R. Hospital stewardship programs. N Engl J Med 2023;89:45-52.'
].join('\n')

function buildGoldenPdf() {
  const runs = splitIntoLines(GOLDEN_OCR_TEXT, 60).map((text, i) => ({
    x: 60,
    y: 740 - i * 22,
    size: 12,
    text
  }))
  return buildTextPdf([runs])
}

function buildSparsePdf() {
  return buildTextPdf([[{ x: 72, y: 700, size: 12, text: 'abc def' }]])
}

function buildScanPdf() {
  return buildTextPdf([[]])
}

// ---------------------------------------------------------------------------
// OCR pipeline (mirrors src/main/maktab/tesseract-ocr.ts)
// ---------------------------------------------------------------------------

async function rasterizePdfPage(pdf, page, dpi) {
  const scale = dpi / 72
  const viewport = page.getViewport({ scale })
  const width = Math.ceil(viewport.width)
  const height = Math.ceil(viewport.height)
  const canvasFactory = pdf.canvasFactory
  const canvasEntry = canvasFactory.create(width, height)
  try {
    await page
      .render({
        canvas: null,
        canvasContext: canvasEntry.context,
        viewport
      })
      .promise
    return canvasEntry.canvas.toBuffer('image/png')
  } finally {
    canvasFactory.destroy(canvasEntry)
  }
}

async function ocrPdf(pdfjsLib, worker, bytes, dpi) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise
  const pages = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const png = await rasterizePdfPage(pdf, page, dpi)
    const { data } = await worker.recognize(png)
    if (data.text && data.text.trim()) pages.push(data.text.trim())
  }
  return { text: pages.join('\n\n').trim(), pageCount: pages.length || 1, pdfNumPages: pdf.numPages }
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim()
}

app.whenReady().then(async () => {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const workerSrc = pathToFileURL(
      require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
    ).href
    const standardFontDataUrl =
      pathToFileURL(join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')) +
      '/'
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

    const { createWorker, OEM, PSM } = await import('tesseract.js')
    const workerPath = require.resolve('tesseract.js/src/worker-script/node/index.js')
    const corePath = require.resolve('tesseract.js-core/tesseract-core.wasm.js')
    const langPath = join(root, 'resources', 'tesseract')
    const hasBundledLanguages = existsSync(join(langPath, 'eng.traineddata'))
    const workerOptions = { workerPath, corePath, langPath, gzip: false }
    const worker = hasBundledLanguages
      ? await createWorker('eng', OEM.LSTM_ONLY, workerOptions)
      : await createWorker('eng', OEM.LSTM_ONLY, { workerPath, corePath })
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      user_defined_dpi: '300',
      preserve_interword_spaces: '1'
    })

    const dpi = 300
    const golden = await ocrPdf(pdfjsLib, worker, buildGoldenPdf(), dpi)
    const sparse = await ocrPdf(pdfjsLib, worker, buildSparsePdf(), dpi)
    const scan = await ocrPdf(pdfjsLib, worker, buildScanPdf(), dpi)
    await worker.terminate()

    const results = {
      golden: { textLength: golden.text.length, pageCount: golden.pageCount },
      sparse: { text: normalize(sparse.text).slice(0, 40), pageCount: sparse.pageCount },
      scan: { textLength: scan.text.length, pageCount: scan.pageCount }
    }

    const goldenNorm = normalize(golden.text)
    const checks = [
      goldenNorm.includes(GOLDEN_OCR_MARKERS.title),
      goldenNorm.includes(GOLDEN_OCR_MARKERS.body),
      goldenNorm.includes(GOLDEN_OCR_MARKERS.year),
      goldenNorm.includes(GOLDEN_OCR_MARKERS.reference),
      normalize(sparse.text).includes('abc'),
      scan.text.length < 40
    ]

    const allPass = checks.every(Boolean)
    console.log(
      `probe-ocr-golden=${allPass}`,
      JSON.stringify({ checks: checks.map(Boolean), results }, null, 2)
    )
    app.exit(allPass ? 0 : 1)
  } catch (err) {
    console.log('probe-ocr-golden=false')
    console.error(err instanceof Error ? err.stack ?? err.message : err)
    app.exit(1)
  }
})
