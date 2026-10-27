/**
 * Main-process Arabic OCR via official PP-OCRv5 ONNX (ppu-paddle-ocr + onnxruntime-node).
 *
 * Pack: resources/arabic-ocr/ (see npm run ocr:arabic-adapter).
 * Never use Tesseract `ara` as the primary path.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  MaktabExtractionResult,
  MaktabLanguage,
  MaktabOcrExtractOptions
} from '../../engine/maktab/types'
import {
  ARABIC_OCR_READY_MARKER,
  type ArabicPageImage,
  type ArabicRecognizeResult
} from '../../engine/maktab/ocr/arabic-adapter'
import { rasterizePdfPage } from './pdf-page-raster'
import { logicalOrderArabicOcrText } from '../../engine/maktab/ocr/post-process'
import { MIN_ARABIC_PAGE_CHARS } from '../../engine/maktab/ocr/indra/route'

const MAX_OCR_PAGES = 200
const MIN_PAGE_CHARS = MIN_ARABIC_PAGE_CHARS

export const ARABIC_OCR_REC_ONNX = 'arabic_ppocrv5_mobile_rec.onnx'
export const ARABIC_OCR_DET_ONNX = 'ppocrv5_mobile_det.onnx'
export const ARABIC_OCR_DICT = 'ppocrv5_arabic_dict.txt'

export function resolveArabicOcrModelDirectory(runtime: {
  isPackaged: boolean
  appPath: string
  resourcesPath: string
  envDir?: string
}): string {
  if (runtime.envDir && runtime.envDir.length > 0) return runtime.envDir
  return runtime.isPackaged
    ? join(runtime.resourcesPath, 'arabic-ocr')
    : join(runtime.appPath, 'resources', 'arabic-ocr')
}

export function isArabicOcrPackComplete(modelDirectory: string): boolean {
  return (
    existsSync(join(modelDirectory, ARABIC_OCR_READY_MARKER)) &&
    existsSync(join(modelDirectory, ARABIC_OCR_REC_ONNX)) &&
    existsSync(join(modelDirectory, ARABIC_OCR_DET_ONNX)) &&
    existsSync(join(modelDirectory, ARABIC_OCR_DICT))
  )
}

type PaddleService = {
  initialize: () => Promise<void>
  isInitialized: () => boolean
  destroy?: () => Promise<void> | void
  recognize: (
    image: ArrayBuffer,
    options?: { flatten?: boolean }
  ) => Promise<{ text: string; confidence: number }>
}

let cachedService: PaddleService | null = null
let cachedDir: string | null = null

async function loadPaddleService(modelDirectory: string): Promise<PaddleService> {
  if (cachedService && cachedDir === modelDirectory && cachedService.isInitialized()) {
    return cachedService
  }

  const { PaddleOcrService } = await import('ppu-paddle-ocr')
  const detection = join(modelDirectory, ARABIC_OCR_DET_ONNX)
  const recognition = join(modelDirectory, ARABIC_OCR_REC_ONNX)
  const charactersDictionary = join(modelDirectory, ARABIC_OCR_DICT)

  const service = new PaddleOcrService({
    model: { detection, recognition, charactersDictionary }
  }) as PaddleService

  await service.initialize()
  cachedService = service
  cachedDir = modelDirectory
  return service
}

function resolveRuntimeModelDirectory(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    return resolveArabicOcrModelDirectory({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      envDir: process.env.NASSILA_ARABIC_OCR_DIR
    })
  } catch {
    return resolveArabicOcrModelDirectory({
      isPackaged: false,
      appPath: process.cwd(),
      resourcesPath: process.cwd(),
      envDir: process.env.NASSILA_ARABIC_OCR_DIR
    })
  }
}

/** True when the Arabic ONNX pack is on disk and onnxruntime-node can load. */
export async function isArabicPaddleOcrAvailable(): Promise<boolean> {
  try {
    const dir = resolveRuntimeModelDirectory()
    if (!isArabicOcrPackComplete(dir)) return false
    await import('onnxruntime-node')
    await import('ppu-paddle-ocr')
    return true
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.warn(`[maktab-arabic-ocr] unavailable: ${detail}`)
    return false
  }
}

export async function recognizeArabicPageImage(
  pageImage: ArabicPageImage,
  modelDirectory?: string
): Promise<ArabicRecognizeResult> {
  const dir = modelDirectory ?? resolveRuntimeModelDirectory()
  if (!isArabicOcrPackComplete(dir)) {
    return { text: '', confidence: 0, needsReview: true }
  }
  if (!pageImage.bytes?.length) {
    return { text: '', confidence: 0, needsReview: true }
  }

  const service = await loadPaddleService(dir)
  const ab =
    pageImage.bytes.buffer.slice(
      pageImage.bytes.byteOffset,
      pageImage.bytes.byteOffset + pageImage.bytes.byteLength
    ) as ArrayBuffer

  const result = await service.recognize(ab)
  const text = logicalOrderArabicOcrText((result.text ?? '').trim())
  const confidence =
    typeof result.confidence === 'number' && Number.isFinite(result.confidence)
      ? result.confidence
      : 0

  return {
    text,
    confidence,
    needsReview: text.length < MIN_PAGE_CHARS || confidence < 0.78
  }
}

/**
 * Full-PDF Arabic OCR: rasterize pages (pdf.js) → PP-OCRv5 Arabic ONNX.
 */
export async function extractPdfWithArabicPaddle(
  buffer: ArrayBuffer,
  options: MaktabOcrExtractOptions,
  onProgress?: (progress: { processed: number; total: number; elapsedMs: number }) => void
): Promise<MaktabExtractionResult> {
  const dpi = options.dpi ?? 300
  const languages: MaktabLanguage[] = options.languages?.includes('ara')
    ? options.languages
    : (['ara'] as MaktabLanguage[])
  const warnings: string[] = []
  const dir = resolveRuntimeModelDirectory()

  if (!isArabicOcrPackComplete(dir)) {
    throw new Error(
      `Arabic OCR pack incomplete at ${dir}. Run: npm run ocr:arabic-adapter`
    )
  }

  const [{ loadPdfJs, configurePdfJsWorker }] = await Promise.all([
    import('../../engine/manuscript/pdfjs-loader')
  ])
  const pdfjsLib = await loadPdfJs()
  await configurePdfJsWorker(pdfjsLib)

  const service = await loadPaddleService(dir)
  const pageTexts: string[] = []
  const pageConfidences: number[] = []
  const startedAt = Date.now()
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) })

  try {
    const pdf = await loadingTask.promise
    const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES)
    if (pdf.numPages > MAX_OCR_PAGES) {
      warnings.push(`OCR limited to first ${MAX_OCR_PAGES} of ${pdf.numPages} pages.`)
    }

    onProgress?.({ processed: 0, total: pageCount, elapsedMs: 0 })

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const png = await rasterizePdfPage(pdf, page, dpi)
      const ab = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
      const result = await service.recognize(ab)
      const text = logicalOrderArabicOcrText((result.text ?? '').trim())
      const confidence =
        typeof result.confidence === 'number' && Number.isFinite(result.confidence)
          ? result.confidence
          : 0
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
    await loadingTask.destroy?.().catch(() => {})
  }

  const text = pageTexts.join('\n\n').trim()
  let offset = 0
  const pageBoundaries = pageTexts.map((pageText, index) => {
    const boundary = { page: index + 1, start: offset, end: offset + pageText.length }
    offset = boundary.end + 2
    return boundary
  })

  if (text.length < MIN_PAGE_CHARS && pageTexts.length > 0) {
    warnings.push(
      'Very little Arabic OCR text was recovered. Prefer DOCX for broken font-encoding PDFs.'
    )
  }

  return {
    text,
    pageCount: pageTexts.length || 1,
    pageBoundaries,
    pageConfidences,
    warnings,
    tier: 'ocr',
    languages,
    needsReview: text.length < MIN_PAGE_CHARS || pageConfidences.some((c) => c < 0.78)
  }
}

/** Test helper: dump dict line count without loading ONNX. */
export function readArabicDictLineCount(modelDirectory: string): number {
  const path = join(modelDirectory, ARABIC_OCR_DICT)
  if (!existsSync(path)) return 0
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length
}
