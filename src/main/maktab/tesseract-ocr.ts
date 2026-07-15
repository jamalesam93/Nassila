import type {
  MaktabExtractionResult,
  MaktabLanguage,
  MaktabOcrExtractOptions
} from '../../engine/maktab/types'

const MAX_OCR_PAGES = 50
const MIN_PAGE_CHARS = 40

async function rasterizePdfPage(
  pdfjsLib: typeof import('pdfjs-dist'),
  page: import('pdfjs-dist').PDFPageProxy,
  dpi: number,
  createCanvas: (width: number, height: number) => { getContext: (id: '2d') => unknown; toBuffer: (mime: string) => Buffer }
): Promise<Buffer> {
  const scale = dpi / 72
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')
  await page.render({ canvasContext: context as never, viewport }).promise
  return canvas.toBuffer('image/png')
}

/**
 * Main-process Tesseract OCR for Maktab tier B (EN/AR/FR).
 * Rasterizes PDF pages then runs tesseract.js per page.
 */
export async function extractPdfWithTesseract(
  buffer: ArrayBuffer,
  options: MaktabOcrExtractOptions
): Promise<MaktabExtractionResult> {
  const dpi = options.dpi ?? 300
  const languages = options.languages?.length ? options.languages : (['eng'] as MaktabLanguage[])

  const [{ createWorker }, { loadPdfJs, configurePdfJsWorker }, { createCanvas }] = await Promise.all([
    import('tesseract.js'),
    import('../../engine/manuscript/pdfjs-loader'),
    import('canvas')
  ])

  const pdfjsLib = await loadPdfJs()
  await configurePdfJsWorker(pdfjsLib)

  const langArg = languages.join('+')
  const worker = await createWorker(langArg)
  const warnings: string[] = []
  const pageTexts: string[] = []

  try {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
    const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES)
    if (pdf.numPages > MAX_OCR_PAGES) {
      warnings.push(`OCR limited to first ${MAX_OCR_PAGES} of ${pdf.numPages} pages.`)
    }

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const png = await rasterizePdfPage(pdfjsLib, page, dpi, createCanvas)
      const { data } = await worker.recognize(png)
      const text = (data.text ?? '').trim()
      if (text) pageTexts.push(text)
    }
  } finally {
    await worker.terminate()
  }

  const text = pageTexts.join('\n\n').trim()
  if (text.length < MIN_PAGE_CHARS && pageTexts.length > 0) {
    warnings.push('Very little text was extracted. The PDF may be partially scanned or use embedded fonts without a Unicode map.')
  }

  return {
    text,
    pageCount: pageTexts.length || 1,
    warnings,
    tier: 'ocr',
    languages,
    needsReview: text.length < MIN_PAGE_CHARS
  }
}

/** Probe whether native canvas + tesseract can load in this build. */
export async function isTesseractOcrAvailable(): Promise<boolean> {
  try {
    await Promise.all([import('tesseract.js'), import('canvas')])
    return true
  } catch {
    return false
  }
}
