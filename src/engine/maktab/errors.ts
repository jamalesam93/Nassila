export class MaktabOcrUnavailableError extends Error {
  readonly code = 'maktab_ocr_unavailable' as const

  constructor(message?: string) {
    super(
      message ??
        'OCR is not available in this build. Scanned PDFs need the Maktab OCR backend (Tesseract). ' +
          'Use a text-based PDF or run OCR externally (e.g. ocrmypdf) and re-import.'
    )
    this.name = 'MaktabOcrUnavailableError'
  }
}

export class MaktabExtractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MaktabExtractError'
  }
}
