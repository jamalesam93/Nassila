import { extractManuscriptFromPdf } from '../manuscript/pdf-extract'
import { MaktabExtractError, MaktabOcrUnavailableError } from './errors'
import { getMaktabOcrBackend } from './ocr/backend'
import {
  ARABIC_OCR_DEFERRED_WARNING,
  chooseOcrLanguages,
  embeddedArabicLooksReversed,
  embeddedTextLooksSparse,
  mergeOcrWithEmbeddedPages,
  normalizeExtractedText,
  shouldDeferArabicToDocx,
  stripSpuriousDigitNoiseInArabic,
  stripSpuriousLatinInArabic
} from './ocr/post-process'
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

function withArabicOcrDeferred(embedded: MaktabExtractionResult): MaktabExtractionResult {
  const warnings = embedded.warnings.includes(ARABIC_OCR_DEFERRED_WARNING)
    ? embedded.warnings
    : [...embedded.warnings, ARABIC_OCR_DEFERRED_WARNING]
  return {
    ...embedded,
    warnings,
    needsReview: true
  }
}

async function extractEmbeddedTier(
  buffer: ArrayBuffer,
  languages: MaktabLanguage[]
): Promise<MaktabExtractionResult> {
  const embedded = await extractManuscriptFromPdf(buffer)
  const sparse = embeddedTextLooksSparse(embedded.warnings)
  const reversedArabic = embeddedArabicLooksReversed(embedded.warnings)
  return toResult(
    {
      text: embedded.text,
      pageCount: embedded.pageCount,
      pageBoundaries: embedded.pageBoundaries,
      warnings: embedded.warnings,
      tier: 'embedded_text',
      // Sparse Latin may escalate to Tesseract; Arabic-heavy / reversed stays embedded (DOCX).
      needsReview: sparse || reversedArabic
    },
    languages
  )
}

async function extractOcrTier(
  buffer: ArrayBuffer,
  languages: MaktabLanguage[],
  dpi: number,
  textHint = '',
  embedded: MaktabExtractionResult | null = null
): Promise<MaktabExtractionResult> {
  const backend = getMaktabOcrBackend()
  if (!backend.isAvailable()) {
    throw new MaktabOcrUnavailableError()
  }
  const ocrLanguages = chooseOcrLanguages(textHint, languages)
  // Always copy — upstream pdf.js may have detached the caller's ArrayBuffer.
  const pdfBytes = buffer.slice(0)
  const result = await backend.extractFromPdf(pdfBytes, { languages: ocrLanguages, dpi })
  let text = stripSpuriousDigitNoiseInArabic(stripSpuriousLatinInArabic(result.text ?? ''))
  let pageBoundaries = result.pageBoundaries
  let tier: MaktabExtractionResult['tier'] = 'ocr'
  const warnings = [...(result.warnings ?? [])]
  let needsReview = Boolean(result.needsReview)

  if (embedded?.text && embedded.pageBoundaries?.length && result.pageConfidences?.length) {
    const mergeMeta = mergeOcrWithEmbeddedPages({
      ocrText: text,
      ocrBoundaries: result.pageBoundaries,
      ocrConfidences: result.pageConfidences,
      embeddedText: embedded.text,
      embeddedBoundaries: embedded.pageBoundaries
    })
    text = stripSpuriousDigitNoiseInArabic(stripSpuriousLatinInArabic(mergeMeta.text))
    pageBoundaries = mergeMeta.pageBoundaries
    if (mergeMeta.embeddedPagesUsed > 0) {
      warnings.push(
        `OCR confidence was low on ${mergeMeta.embeddedPagesUsed} page(s); kept embedded text there. For best Arabic fidelity, import the DOCX.`
      )
      needsReview = true
    }
    if (mergeMeta.ocrPagesUsed === 0 && mergeMeta.embeddedPagesUsed > 0) {
      tier = 'embedded_text'
    }
  }

  return toResult(
    {
      ...result,
      text,
      pageBoundaries,
      warnings,
      tier,
      needsReview,
      pageConfidences: result.pageConfidences
    },
    ocrLanguages
  )
}

/**
 * Maktab PDF ingest — tier A (pdf.js) with optional tier B (OCR).
 * Canonical entry for manuscript and bibliography PDF extraction.
 *
 * Arabic Tesseract is deferred: character-reversed / Arabic-dominant PDFs keep
 * embedded text and warn to prefer DOCX until LLM/vision OCR ships.
 */
export async function extractFromPdf(
  buffer: ArrayBuffer,
  options: MaktabExtractionOptions = {}
): Promise<MaktabExtractionResult> {
  const mode = options.mode ?? 'auto'
  const languages = options.languages ?? [...MAKTAB_DEFAULT_LANGUAGES]
  const dpi = options.ocrDpi ?? DEFAULT_OCR_DPI

  if (mode === 'ocr_preferred') {
    // Prefer OCR for Latin scans, but use embedded when it is already good.
    let embedded: MaktabExtractionResult | null = null
    try {
      embedded = await extractEmbeddedTier(buffer, languages)
    } catch {
      embedded = null
    }
    if (embedded && !embedded.needsReview && embedded.text.length > 0) {
      return embedded
    }
    if (embedded && shouldDeferArabicToDocx(embedded.text, embedded.warnings)) {
      return withArabicOcrDeferred(embedded)
    }
    return extractOcrTier(buffer, languages, dpi, embedded?.text ?? '', embedded)
  }

  if (mode === 'embedded_only') {
    try {
      return await extractEmbeddedTier(buffer, languages)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new MaktabExtractError(msg)
    }
  }

  // auto: tier A first; escalate to tier B for sparse Latin / true scans — not Arabic Tesseract
  try {
    const embedded = await extractEmbeddedTier(buffer, languages)
    if (!embedded.needsReview && embedded.text.length > 0) {
      return embedded
    }
    if (shouldDeferArabicToDocx(embedded.text, embedded.warnings)) {
      return withArabicOcrDeferred(embedded)
    }
    const backend = getMaktabOcrBackend()
    if (backend.isAvailable()) {
      return extractOcrTier(buffer, languages, dpi, embedded.text, embedded)
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
