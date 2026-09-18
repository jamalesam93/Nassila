/**
 * Arabic recognizer adapter seam (Nassila 2.1.0 Maktab Arabic / MaktabOCR).
 *
 * PP-OCRv5 Arabic packs live under `resources/arabic-ocr/` (not inside the
 * Firecrawl PP-OCRv6 Latin model directory).
 *
 * Never enable Tesseract `ara` as the primary path. Character-reversed
 * ToUnicode PDFs still prefer DOCX even when this adapter is available.
 */

export interface ArabicPageImage {
  /** PNG/JPEG bytes for one page raster. */
  bytes: Uint8Array
  width?: number
  height?: number
  dpi?: number
}

export interface ArabicRecognizeResult {
  text: string
  confidence: number
  needsReview: boolean
}

export interface ArabicRecognizerAdapter {
  id: string
  revision: string
  isAvailable(): boolean | Promise<boolean>
  recognize(pageImage: ArabicPageImage): Promise<ArabicRecognizeResult>
}

/** Default stub — Arabic OCR deferred until a packaged adapter is registered. */
export const unavailableArabicAdapter: ArabicRecognizerAdapter = {
  id: 'arabic-unavailable',
  revision: '0',
  isAvailable: () => false,
  async recognize(): Promise<ArabicRecognizeResult> {
    return {
      text: '',
      confidence: 0,
      needsReview: true
    }
  }
}

let activeAdapter: ArabicRecognizerAdapter = unavailableArabicAdapter

export function setArabicRecognizerAdapter(adapter: ArabicRecognizerAdapter): void {
  activeAdapter = adapter
}

export function getArabicRecognizerAdapter(): ArabicRecognizerAdapter {
  return activeAdapter
}

export function resetArabicRecognizerAdapter(): void {
  activeAdapter = unavailableArabicAdapter
}

/** Marker file written by `npm run ocr:arabic-adapter` when weights are present. */
export const ARABIC_OCR_READY_MARKER = '.nassila-arabic-ocr-ready'

/**
 * True when `modelDirectory` contains the ready marker (packaged PP-OCRv5 Arabic).
 * Does not load ONNX by itself — callers still supply a `runner` for recognition.
 */
export function isArabicOcrModelDirectoryReady(modelDirectory: string | undefined): boolean {
  if (!modelDirectory) return false
  try {
    // Lazy require so engine stays browser-safe when fs is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path')
    return fs.existsSync(path.join(modelDirectory, ARABIC_OCR_READY_MARKER))
  } catch {
    return false
  }
}

import {
  logicalOrderArabicOcrText,
  stripSpuriousDigitNoiseInArabic,
  stripSpuriousLatinInArabic
} from './post-process'
import type { MaktabOcrBackend } from './types'
import type {
  MaktabExtractionResult,
  MaktabLanguage,
  MaktabOcrExtractOptions
} from '../types'

/**
 * Options for candidate Arabic recognizer adapter (PaddleOCR PP-OCRv5 / ONNX).
 */
export interface CandidateArabicAdapterOptions {
  id?: string
  revision?: string
  modelDirectory?: string
  minDpi?: number
  minConfidence?: number
  runner?: (image: ArabicPageImage) => Promise<ArabicRecognizeResult> | ArabicRecognizeResult
}

/**
 * Candidate PaddleOCR Arabic PP-OCRv5 adapter.
 * Encapsulates layout analysis, RTL reading order, confidence flooring,
 * degraded resolution detection, and post-processing filters.
 */
export class CandidatePaddleOcrArabicAdapter implements ArabicRecognizerAdapter {
  readonly id: string
  readonly revision: string
  readonly modelDirectory?: string
  readonly minDpi: number
  readonly minConfidence: number
  private readonly runner?: (image: ArabicPageImage) => Promise<ArabicRecognizeResult> | ArabicRecognizeResult

  constructor(options: CandidateArabicAdapterOptions = {}) {
    this.id = options.id ?? 'paddleocr-arabic-ppocrv5'
    this.revision = options.revision ?? '2026.09-v5'
    this.modelDirectory = options.modelDirectory
    this.minDpi = options.minDpi ?? 150
    this.minConfidence = options.minConfidence ?? 0.78
    this.runner = options.runner
  }

  isAvailable(): boolean {
    if (typeof this.runner === 'function') return true
    return isArabicOcrModelDirectoryReady(this.modelDirectory)
  }

  async recognize(pageImage: ArabicPageImage): Promise<ArabicRecognizeResult> {
    if (!pageImage.bytes || pageImage.bytes.length === 0) {
      return { text: '', confidence: 0, needsReview: true }
    }

    const isDegraded = Boolean(pageImage.dpi && pageImage.dpi < this.minDpi)

    if (this.runner) {
      const raw = await this.runner(pageImage)
      const ordered = logicalOrderArabicOcrText(raw.text)
      const cleaned = stripSpuriousDigitNoiseInArabic(stripSpuriousLatinInArabic(ordered))
      const confidence = isDegraded ? Math.min(raw.confidence, 0.45) : raw.confidence
      const needsReview = Boolean(raw.needsReview || isDegraded || confidence < this.minConfidence)
      return {
        text: cleaned,
        confidence,
        needsReview
      }
    }

    return {
      text: '',
      confidence: 0,
      needsReview: true
    }
  }
}

/** Factory for candidate Arabic adapter. */
export function createCandidateArabicAdapter(
  options?: CandidateArabicAdapterOptions
): ArabicRecognizerAdapter {
  return new CandidatePaddleOcrArabicAdapter(options)
}

/**
 * Bridges an ArabicRecognizerAdapter to MaktabOcrBackend for unified PDF extraction.
 */
export function createArabicMaktabOcrBackend(
  adapter: ArabicRecognizerAdapter
): MaktabOcrBackend {
  return {
    id: adapter.id,
    isAvailable: () => {
      const avail = adapter.isAvailable()
      return typeof avail === 'boolean' ? avail : true
    },
    async extractFromPdf(
      buffer: ArrayBuffer,
      options: MaktabOcrExtractOptions
    ): Promise<MaktabExtractionResult> {
      const pageImage: ArabicPageImage = {
        bytes: new Uint8Array(buffer),
        dpi: options.dpi ?? 300
      }
      const recognized = await adapter.recognize(pageImage)
      const cleanedText = stripSpuriousDigitNoiseInArabic(stripSpuriousLatinInArabic(recognized.text))
      const pageBoundaries =
        cleanedText.length > 0
          ? [{ page: 1, start: 0, end: cleanedText.length }]
          : []

      return {
        text: cleanedText,
        pageCount: 1,
        pageBoundaries,
        tier: 'ocr',
        languages: (options.languages as MaktabLanguage[]) ?? ['ara'],
        warnings: recognized.needsReview
          ? ['Arabic OCR confidence was low or degraded; review recommended.']
          : [],
        needsReview: recognized.needsReview,
        pageConfidences: [recognized.confidence]
      }
    }
  }
}

/**
 * Compute Levenshtein distance between two strings.
 */
export function computeLevenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    const aChar = a[i - 1]
    for (let j = 1; j <= n; j++) {
      const cost = aChar === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      )
    }
    const temp = prev
    prev = curr
    curr = temp
  }
  return prev[n]
}

/**
 * Compute Character Error Rate (CER) against reference string.
 */
export function computeCer(reference: string, hypothesis: string): number {
  if (!reference.length) return hypothesis.length ? 1 : 0
  const dist = computeLevenshteinDistance(reference, hypothesis)
  return dist / reference.length
}

/**
 * Compute Keyword Recall against a set of golden domain tokens.
 */
export function computeKeywordRecall(
  text: string,
  keywords: readonly string[]
): { recall: number; matched: string[]; missing: string[] } {
  if (keywords.length === 0) return { recall: 1.0, matched: [], missing: [] }
  const matched: string[] = []
  const missing: string[] = []

  for (const kw of keywords) {
    if (text.includes(kw)) {
      matched.push(kw)
    } else {
      missing.push(kw)
    }
  }

  const recall = matched.length / keywords.length
  return { recall, matched, missing }
}
