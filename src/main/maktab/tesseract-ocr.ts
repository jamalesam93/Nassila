import type {
  MaktabExtractionResult,
  MaktabLanguage,
  MaktabOcrExtractOptions
} from '../../engine/maktab/types'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const MAX_OCR_PAGES = 200
const MIN_PAGE_CHARS = 40

export function resolveTesseractLangPath(runtime: {
  isPackaged: boolean
  appPath: string
  resourcesPath: string
}): string {
  return runtime.isPackaged
    ? join(runtime.resourcesPath, 'tesseract')
    : join(runtime.appPath, 'resources', 'tesseract')
}

/** Resolve worker/core paths from node_modules (must stay external — not Rollup-bundled). */
export function resolveTesseractWorkerPaths(appPath: string): {
  workerPath: string
  corePath: string
} {
  const require = createRequire(join(appPath, 'package.json'))
  return {
    workerPath: require.resolve('tesseract.js/src/worker-script/node/index.js'),
    corePath: require.resolve('tesseract.js-core/tesseract-core.wasm.js')
  }
}

async function rasterizePdfPage(
  pdf: {
    canvasFactory: {
      create: (
        width: number,
        height: number
      ) => { canvas: { toBuffer: (mime: string) => Buffer }; context: unknown }
      destroy: (entry: { canvas: unknown; context: unknown }) => void
    }
  },
  page: import('pdfjs-dist').PDFPageProxy,
  dpi: number
): Promise<Buffer> {
  const scale = dpi / 72
  const viewport = page.getViewport({ scale })
  const width = Math.ceil(viewport.width)
  const height = Math.ceil(viewport.height)
  // pdf.js v5 NodeCanvasFactory uses @napi-rs/canvas — must render via pdf.canvasFactory,
  // not node-canvas, or embedded images throw "Image or Canvas expected".
  const canvasEntry = pdf.canvasFactory.create(width, height)

  try {
    await page.render({ canvasContext: canvasEntry.context as never, viewport }).promise
    return canvasEntry.canvas.toBuffer('image/png')
  } finally {
    pdf.canvasFactory.destroy(canvasEntry)
  }
}

/**
 * Main-process Tesseract OCR for Maktab tier B (EN/AR/FR).
 * Rasterizes PDF pages then runs tesseract.js per page.
 */
export async function extractPdfWithTesseract(
  buffer: ArrayBuffer,
  options: MaktabOcrExtractOptions,
  onProgress?: (progress: { processed: number; total: number; elapsedMs: number }) => void
): Promise<MaktabExtractionResult> {
  const dpi = options.dpi ?? 300
  const languages = options.languages?.length
    ? options.languages
    : (['eng', 'fra'] as MaktabLanguage[])

  const [{ createWorker, OEM, PSM }, { loadPdfJs, configurePdfJsWorker }, { app }] = await Promise.all([
    import('tesseract.js'),
    import('../../engine/manuscript/pdfjs-loader'),
    import('electron')
  ])

  const pdfjsLib = await loadPdfJs()
  await configurePdfJsWorker(pdfjsLib)

  const langArg = languages.join('+')
  const warnings: string[] = []
  const langPath = resolveTesseractLangPath({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath
  })
  const { workerPath, corePath } = resolveTesseractWorkerPaths(app.getAppPath())

  const hasBundledLanguages = languages.every((language) =>
    existsSync(join(langPath, `${language}.traineddata`))
  )
  if (!hasBundledLanguages) {
    const warning = `Bundled OCR language packs were not found at ${langPath}; Tesseract may use its network fallback.`
    console.warn(warning)
    warnings.push(warning)
  }

  const workerOptions = { workerPath, corePath, langPath, gzip: false as const }
  const worker = hasBundledLanguages
    ? await createWorker(langArg, OEM.LSTM_ONLY, workerOptions)
    : await createWorker(langArg, OEM.LSTM_ONLY, { workerPath, corePath })

  // Declare DPI so Tesseract scales estimates correctly; keep AUTO layout for mixed thesis pages.
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    user_defined_dpi: String(dpi),
    preserve_interword_spaces: '1'
  })

  const pageTexts: string[] = []
  const pageConfidences: number[] = []
  const startedAt = Date.now()

  try {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise
    const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES)
    if (pdf.numPages > MAX_OCR_PAGES) {
      warnings.push(`OCR limited to first ${MAX_OCR_PAGES} of ${pdf.numPages} pages.`)
    }

    onProgress?.({ processed: 0, total: pageCount, elapsedMs: 0 })

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const png = await rasterizePdfPage(pdf, page, dpi)
      const { data } = await worker.recognize(png)
      const text = (data.text ?? '').trim()
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0
      if (text) {
        pageTexts.push(text)
        pageConfidences.push(confidence)
      }
      onProgress?.({
        processed: pageNum,
        total: pageCount,
        elapsedMs: Date.now() - startedAt
      })
    }
  } finally {
    await worker.terminate()
  }

  const text = pageTexts.join('\n\n').trim()
  let offset = 0
  const pageBoundaries = pageTexts.map((pageText, index) => {
    const boundary = { page: index + 1, start: offset, end: offset + pageText.length }
    offset = boundary.end + 2
    return boundary
  })
  if (text.length < MIN_PAGE_CHARS && pageTexts.length > 0) {
    warnings.push('Very little text was extracted. The PDF may be partially scanned or use embedded fonts without a Unicode map.')
  }

  return {
    text,
    pageCount: pageTexts.length || 1,
    pageBoundaries,
    pageConfidences,
    warnings,
    tier: 'ocr',
    languages,
    needsReview: text.length < MIN_PAGE_CHARS
  }
}

/** Probe whether tesseract worker + pdf.js Node canvas (@napi-rs/canvas) can load. */
export async function isTesseractOcrAvailable(): Promise<boolean> {
  try {
    const { app } = await import('electron')
    resolveTesseractWorkerPaths(app.getAppPath())
    await Promise.all([import('tesseract.js'), import('@napi-rs/canvas')])
    return true
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.warn(`[maktab-ocr] native backend unavailable: ${detail}`)
    return false
  }
}
