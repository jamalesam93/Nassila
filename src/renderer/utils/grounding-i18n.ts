import i18n from '../i18n/config'

const PDF_WARNING_SCAN_PREFIX = 'This PDF contains no extractable text'
const PDF_WARNING_LITTLE_PREFIX = 'Very little text was extracted'
const PDF_WARNING_OCR_LOW_PREFIX = 'OCR confidence was low on'
const PDF_WARNING_REVERSED_ARABIC = 'Arabic text from this PDF looks character-reversed'
const PDF_WARNING_ARABIC_OCR_DEFERRED = 'Arabic PDF OCR via Tesseract is disabled'

/** Map engine PDF extraction warnings to localized UI strings. */
export function translatePdfImportWarnings(warnings: string[]): string {
  return warnings
    .map((w) => {
      if (w.startsWith(PDF_WARNING_SCAN_PREFIX)) return i18n.t('manuscriptAudit.pdfWarning.scan')
      if (w.startsWith(PDF_WARNING_LITTLE_PREFIX)) return i18n.t('manuscriptAudit.pdfWarning.littleText')
      if (w.startsWith(PDF_WARNING_OCR_LOW_PREFIX)) return i18n.t('manuscriptAudit.pdfWarning.ocrLowConfidence')
      if (w.startsWith(PDF_WARNING_ARABIC_OCR_DEFERRED))
        return i18n.t('manuscriptAudit.pdfWarning.arabicOcrDeferred')
      if (w.includes(PDF_WARNING_REVERSED_ARABIC)) return i18n.t('manuscriptAudit.pdfWarning.reversedArabic')
      return w
    })
    .join(' · ')
}

export function groundingRepairedNotice(): string {
  return i18n.t('loop.grounding.repairedNotice')
}

export function groundingRetryNotice(): string {
  return i18n.t('loop.grounding.retryNotice')
}

export function groundingOverallUnrelatedNotice(detail: string): string {
  return i18n.t('loop.grounding.overallUnrelated', { detail })
}

export function groundingModelUnrelatedReason(detail: string): string {
  return i18n.t('loop.grounding.modelUnrelatedOverall', { detail })
}

export function groundingModelWeakReason(detail: string): string {
  return i18n.t('loop.grounding.modelWeakOverall', { detail })
}

export function groundingWeakPassageReason(): string {
  return i18n.t('loop.grounding.weakPassageAlignment')
}

export function groundingCheckFailed(message: string): string {
  return i18n.t('loop.grounding.checkFailed', { message })
}

export function groundingInvalidJsonHint(): string {
  return i18n.t('loop.grounding.invalidJson')
}

export function groundingEvidenceSnippet(warning: string | undefined, snippet: string): string {
  return i18n.t('loop.grounding.evidenceSnippet', {
    warning: warning ?? i18n.t('loop.grounding.unparsed'),
    snippet
  })
}

export function joinGroundingParseWarnings(parts: string[]): string | undefined {
  if (parts.length === 0) return undefined
  return parts.join(' ')
}
