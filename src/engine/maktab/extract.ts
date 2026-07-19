import { extractManuscriptFromPdf } from '../manuscript/pdf-extract'
import { MaktabExtractError, MaktabOcrUnavailableError } from './errors'
import { getMaktabOcrBackend } from './ocr/backend'
import { embeddedTextLooksSparse, normalizeExtractedText } from './ocr/post-process'
import {
  MAKTAB_DEFAULT_LANGUAGES,
  type MaktabExtractionOptions,
  type MaktabExtractionResult,
  type MaktabLanguage
} from './types'

const DEFAULT_OCR_DPI = 300

function toResult(
  partial: Omit<MaktabExtractionResult, 'languages'> & { languages?: MaktabLanguage[] },
  languages: MaktabLanguage[]
): MaktabExtractionResult {
  return {
    ...partial,
    text: normalizeExtractedText(partial.text),
    languages: partial.languages ?? languages
  }
}

async function extractEmbeddedTier(
  buffer: ArrayBuffer,
  languages: MaktabLanguage[]
): Promise<MaktabExtractionResult> {
  const embedded = await extractManuscriptFromPdf(buffer)
  const sparse = embeddedTextLooksSparse(embedded.warnings)
  return toResult(
    {
      text: embedded.text,
      pageCount: embedded.pageCount,
      pageBoundaries: embedded.pageBoundaries,
      warnings: embedded.warnings,
      tier: 'embedded_text',
      needsReview: sparse
    },
    languages
  )
}

async function extractOcrTier(
  buffer: ArrayBuffer,
  languages: MaktabLanguage[],
  dpi: number
): Promise<MaktabExtractionResult> {
  const backend = getMaktabOcrBackend()
  if (!backend.isAvailable()) {
    throw new MaktabOcrUnavailableError()
  }
  const result = await backend.extractFromPdf(buffer, { languages, dpi })
  return toResult(result, languages)
}

/**
 * Maktab PDF ingest — tier A (pdf.js) with optional tier B (OCR).
 * Canonical entry for manuscript and bibliography PDF extraction.
 */
export async function extractFromPdf(
  buffer: ArrayBuffer,
  options: MaktabExtractionOptions = {}
): Promise<MaktabExtractionResult> {
  const mode = options.mode ?? 'auto'
  const languages = options.languages ?? [...MAKTAB_DEFAULT_LANGUAGES]
  const dpi = options.ocrDpi ?? DEFAULT_OCR_DPI

  if (mode === 'ocr_preferred') {
    return extractOcrTier(buffer, languages, dpi)
  }

  if (mode === 'embedded_only') {
    try {
      return await extractEmbeddedTier(buffer, languages)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new MaktabExtractError(msg)
    }
  }

  // auto: tier A first; escalate to tier B when sparse or when tier A throws on scans
  try {
    const embedded = await extractEmbeddedTier(buffer, languages)
    if (!embedded.needsReview && embedded.text.length > 0) {
      return embedded
    }
    const backend = getMaktabOcrBackend()
    if (backend.isAvailable()) {
      return extractOcrTier(buffer, languages, dpi)
    }
    return embedded
  } catch (embeddedErr) {
    const backend = getMaktabOcrBackend()
    if (backend.isAvailable()) {
      return extractOcrTier(buffer, languages, dpi)
    }
    const msg =
      embeddedErr instanceof Error ? embeddedErr.message : 'PDF text extraction failed.'
    if (/no extractable text|likely a scan/i.test(msg)) {
      throw new MaktabOcrUnavailableError(
        `${msg} Maktab OCR (Tesseract) is not enabled in this build yet.`
      )
    }
    throw embeddedErr instanceof Error ? new MaktabExtractError(embeddedErr.message) : embeddedErr
  }
}

/** @deprecated Use extractFromPdf — alias for bibliography/manuscript parity. */
export async function extractManuscriptFromPdfMaktab(
  buffer: ArrayBuffer,
  options?: MaktabExtractionOptions
): Promise<MaktabExtractionResult> {
  return extractFromPdf(buffer, options)
}
