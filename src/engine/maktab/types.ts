/**
 * Maktab (مكتب) — manuscript ingest types.
 * OCR plan: docs/MAKTAB_OCR.md
 */

/** Tesseract traineddata language codes shipped or detected for academic PDFs. */
export type MaktabLanguage = 'eng' | 'fra' | 'ara'

export const MAKTAB_DEFAULT_LANGUAGES: readonly MaktabLanguage[] = ['eng', 'fra', 'ara']

/** How text was obtained from a PDF. */
export type MaktabExtractionTier = 'embedded_text' | 'ocr'

/**
 * - auto: pdf.js first; OCR when embedded text missing or very sparse
 * - embedded_only: pdf.js only (current fast path)
 * - ocr_preferred: OCR when backend available; else fail with clear message
 */
export type MaktabExtractionMode = 'auto' | 'embedded_only' | 'ocr_preferred'

export interface MaktabExtractionOptions {
  mode?: MaktabExtractionMode
  languages?: MaktabLanguage[]
  /** OCR rasterization DPI when tier B runs (default 300). */
  ocrDpi?: number
}

export interface MaktabExtractionResult {
  text: string
  pageCount: number
  warnings: string[]
  tier: MaktabExtractionTier
  languages: MaktabLanguage[]
  /** True when extraction quality is suspect (sparse glyphs, low OCR confidence later). */
  needsReview: boolean
}

export interface MaktabOcrPageResult {
  pageIndex: number
  text: string
  confidence?: number
}

export interface MaktabOcrExtractOptions {
  languages: MaktabLanguage[]
  dpi: number
}
