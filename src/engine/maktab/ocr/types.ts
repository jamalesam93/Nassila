import type { MaktabOcrExtractOptions, MaktabExtractionResult } from '../types'

/** Pluggable on-device OCR backend (Tesseract implementation planned). */
export interface MaktabOcrBackend {
  readonly id: string
  isAvailable(): boolean
  extractFromPdf(buffer: ArrayBuffer, options: MaktabOcrExtractOptions): Promise<MaktabExtractionResult>
}
