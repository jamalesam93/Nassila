/**
 * Shared text cleanup for tier A (pdf.js) and tier B (OCR) output.
 */

import type { NativePdfSignals } from '../native-pdf-inspector'
import type { MaktabLanguage } from '../types'

/** BiDi isolates Tesseract often wraps around Latin scraps in Arabic lines. */
const BIDI = String.raw`[\u200E\u200F\u202A-\u202E\u2066-\u2069]*`

export function normalizeExtractedText(text: string): string {
  let out = text
  out = out
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')
  out = out.replace(/([A-Za-z]{2,})-\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/([A-Za-z]{2,})-\s*\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/\n{3,}/g, '\n\n')
  out = out.replace(/[ \t]+\n/g, '\n')
  return out.trim()
}

/** Heuristic: pdf.js warned that very little text was extracted. */
export function embeddedTextLooksSparse(warnings: string[]): boolean {
  return warnings.some((w) => /very little text/i.test(w))
}

/** Broken Arabic ToUnicode / encoding — prefer DOCX over Tesseract. */
export function embeddedArabicLooksReversed(warnings: string[]): boolean {
  return warnings.some((w) => /character-reversed|broken font encoding/i.test(w))
}

/**
 * Share of shown codes the PDF's ToUnicode CMaps failed to map before the text
 * layer stops being trustworthy. Calibrate against real corpora; 2% is the
 * conservative default (a handful of unmapped glyphs is normal in bad fonts).
 */
export const CMAP_GAP_RATIO_WARN = 0.02

export const TEXT_LAYER_INCOMPLETE_WARNING =
  'The PDF text layer is missing character mappings (broken ToUnicode). Extracted text may contain replacement characters — review it before relying on it.'

export const INVISIBLE_TEXT_LAYER_WARNING =
  'The PDF carries an invisible text layer (a fabricated OCR layer). The visible page may not match the extracted text — review it before relying on it.'

/**
 * Warnings derived from native pdf-inspector (>= 1.23) signals.
 * Empty when the text layer mapped cleanly and every page's text is visible.
 */
export function textLayerSignalWarnings(signals: NativePdfSignals | undefined): string[] {
  if (!signals) return []
  const warnings: string[] = []
  if (signals.cmapGapRatio > CMAP_GAP_RATIO_WARN) {
    warnings.push(TEXT_LAYER_INCOMPLETE_WARNING)
  }
  if (signals.pagesWithInvisibleTextLayer.length > 0) {
    warnings.push(INVISIBLE_TEXT_LAYER_WARNING)
  }
  return warnings
}

/** True when tier A produced text but the native engine says it is unreliable. */
export function embeddedTextLayerUnreliable(warnings: readonly string[]): boolean {
  return warnings.some(
    (w) => w === TEXT_LAYER_INCOMPLETE_WARNING || w === INVISIBLE_TEXT_LAYER_WARNING
  )
}

export type ArabicDeferOptions = {
  /** When true, Arabic-heavy (non-reversed) PDFs may escalate to the Paddle Arabic adapter. */
  arabicAdapterAvailable?: boolean
}

/**
 * Prefer DOCX when Arabic ToUnicode is character-reversed (always).
 * Arabic-heavy embedded text also defers unless a Paddle Arabic adapter is available
 * (never re-enable Tesseract `ara` as the primary path).
 */
export function shouldDeferArabicToDocx(
  textSample: string,
  warnings: readonly string[] = [],
  options: ArabicDeferOptions = {}
): boolean {
  if (embeddedArabicLooksReversed([...warnings])) return true
  if (options.arabicAdapterAvailable) return false
  const ara = (textSample.match(/[\u0600-\u06FF]/g) ?? []).length
  const lat = (textSample.match(/[A-Za-z]/g) ?? []).length
  return ara > 200 && ara >= lat
}

/** Reverse-font / no Arabic adapter — prefer DOCX. */
export const ARABIC_OCR_DEFERRED_WARNING =
  'Arabic PDF text looks unreliable for OCR (broken font encoding or no Arabic adapter). Prefer importing the DOCX.'

/**
 * PP-OCR Arabic CTC emits each line in visual (display) order, but the lines
 * themselves are already top-to-bottom. Reverse **per line** so reading order
 * survives; reversing the whole page string scrambles the line order (measured
 * on real books: per-line CER 0.037 vs 0.76 for a whole-string reversal).
 * For mixed AR/Latin lines, keep Latin/digit runs contiguous.
 */
export function logicalOrderArabicOcrText(pred: string): string {
  if (!pred) return pred
  return pred
    .split(/\r?\n/)
    .map((line) => logicalOrderArabicLine(line))
    .join('\n')
}

function logicalOrderArabicLine(pred: string): string {
  if (!pred) return pred
  const arabic = (pred.match(/[\u0600-\u06FF]/g) ?? []).length
  if (arabic === 0) return pred
  const latin = (pred.match(/[A-Za-z]/g) ?? []).length

  // Pure / Arabic-heavy line: full reverse recovers logical reading order.
  if (latin === 0 || arabic >= latin * 2) {
    return [...pred].reverse().join('')
  }

  const latinOrDigitRun = /[a-zA-Z0-9 :*./%+-]/
  const out: string[] = []
  let cur = ''
  for (const c of pred) {
    if (!latinOrDigitRun.test(c)) {
      if (cur) {
        out.push(cur)
        cur = ''
      }
      out.push(c)
    } else {
      cur += c
    }
  }
  if (cur) out.push(cur)
  return out.reverse().join('')
}

/** OCR language packs — Latin Tesseract by default; include `ara` only when Arabic adapter is live. */
export function chooseOcrLanguages(
  textSample: string,
  fallback: readonly MaktabLanguage[] = ['eng', 'fra'],
  options: ArabicDeferOptions = {}
): MaktabLanguage[] {
  const latinOnly = fallback.filter((l) => l === 'eng' || l === 'fra')
  const base: MaktabLanguage[] = latinOnly.length > 0 ? [...latinOnly] : ['eng', 'fra']
  if (!options.arabicAdapterAvailable) return base
  const ara = (textSample.match(/[\u0600-\u06FF]/g) ?? []).length
  if (ara > 40) {
    return base.includes('ara') ? base : [...base, 'ara']
  }
  return base
}

/**
 * Tesseract eng+ara invents short Latin scraps inside Arabic (Its3, Sle, SW),
 * often wrapped in LTR/RTL marks (U+200E etc.). Strip those; keep longer English.
 */
export function stripSpuriousLatinInArabic(text: string): string {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  let out = text
  // Latin scrap (1–5 letters + optional digits) between Arabic, with optional BiDi marks
  const scrap = String.raw`${BIDI}[A-Za-z]{1,5}\d{0,2}${BIDI}`
  out = out.replace(new RegExp(String.raw`([\u0600-\u06FF])\s*${scrap}\s*(?=[\u0600-\u06FF])`, 'g'), '$1 ')
  out = out.replace(new RegExp(String.raw`([\u0600-\u06FF])\s+${scrap}(?=\s*[\u0600-\u06FF]|$)`, 'gm'), '$1')
  out = out.replace(new RegExp(String.raw`(?:^|\n)\s*${scrap}\s+(?=[\u0600-\u06FF])`, 'gm'), '\n')
  // Standalone BiDi-wrapped scrap mid-line after Arabic dash/space
  out = out.replace(new RegExp(String.raw`([—\-\s])${scrap}(\s)`, 'g'), '$1$2')
  out = out.replace(/ {2,}/g, ' ')
  out = out.replace(/\n{3,}/g, '\n\n')
  // Drop leftover isolated BiDi marks
  out = out.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]+/g, '')
  return out
}

/**
 * Digits glued to Arabic letters (e.g. 77515آ221مر) are almost always OCR confusions.
 * Keeps spaced years/numbers like "2020" or "في 2015".
 */
export function stripSpuriousDigitNoiseInArabic(text: string): string {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  let out = text
  out = out.replace(/\d{2,}(?=[\u0600-\u06FF])/g, '')
  out = out.replace(/(?<=[\u0600-\u06FF])\d{2,}/g, '')
  // Long standalone digit blobs that are not years (19xx/20xx)
  out = out.replace(/(^|[\s،,;:/\-—])(?!(?:19|20)\d{2}\b)\d{4,}(?=[\s،,;:./\-—]|$)/gm, '$1')
  out = out.replace(/ {2,}/g, ' ')
  out = out.replace(/\n{3,}/g, '\n\n')
  return out
}

/** Split `text` into page slices using Maktab pageBoundaries. */
export function pagesFromBoundaries(
  text: string,
  boundaries: Array<{ page: number; start: number; end: number }> | undefined
): string[] {
  if (!boundaries?.length) return text ? [text] : []
  return boundaries.map((b) => text.slice(b.start, b.end))
}

const MIN_OCR_PAGE_CONFIDENCE = 78
const MAX_OCR_PAGE_DIGIT_RATIO = 0.08

/**
 * Keep high-confidence OCR pages; fall back to embedded text when OCR is weak.
 * Broken ToUnicode Arabic PDFs often OCR the title well and garble dense body pages.
 */
export function mergeOcrWithEmbeddedPages(input: {
  ocrText: string
  ocrBoundaries?: Array<{ page: number; start: number; end: number }>
  ocrConfidences?: number[]
  embeddedText: string
  embeddedBoundaries?: Array<{ page: number; start: number; end: number }>
}): {
  text: string
  pageBoundaries: Array<{ page: number; start: number; end: number }>
  ocrPagesUsed: number
  embeddedPagesUsed: number
  pageDecisions: Array<{ page: number; source: 'ocr' | 'embedded'; confidence: number | null; digitRatio: number }>
} {
  const ocrPages = pagesFromBoundaries(input.ocrText, input.ocrBoundaries)
  const embPages = pagesFromBoundaries(input.embeddedText, input.embeddedBoundaries)
  const pageCount = Math.max(ocrPages.length, embPages.length, 1)
  const chosen: string[] = []
  const pageDecisions: Array<{
    page: number
    source: 'ocr' | 'embedded'
    confidence: number | null
    digitRatio: number
  }> = []
  let ocrPagesUsed = 0
  let embeddedPagesUsed = 0

  for (let i = 0; i < pageCount; i++) {
    const ocrPage = ocrPages[i] ?? ''
    const embPage = embPages[i] ?? ''
    const confidence =
      input.ocrConfidences && typeof input.ocrConfidences[i] === 'number'
        ? input.ocrConfidences[i]!
        : null
    const digits = (ocrPage.match(/\d/g) ?? []).length
    const digitRatio = ocrPage.length > 0 ? digits / ocrPage.length : 1
    const ocrOk =
      ocrPage.trim().length > 0 &&
      confidence !== null &&
      confidence >= MIN_OCR_PAGE_CONFIDENCE &&
      digitRatio <= MAX_OCR_PAGE_DIGIT_RATIO

    if (ocrOk) {
      chosen.push(ocrPage)
      ocrPagesUsed++
      pageDecisions.push({ page: i + 1, source: 'ocr', confidence, digitRatio })
    } else if (embPage.trim().length > 0) {
      chosen.push(embPage)
      embeddedPagesUsed++
      pageDecisions.push({ page: i + 1, source: 'embedded', confidence, digitRatio })
    } else if (ocrPage.trim().length > 0) {
      chosen.push(ocrPage)
      ocrPagesUsed++
      pageDecisions.push({ page: i + 1, source: 'ocr', confidence, digitRatio })
    } else {
      chosen.push('')
      pageDecisions.push({ page: i + 1, source: 'embedded', confidence, digitRatio })
    }
  }

  const text = chosen.filter((p) => p.length > 0).join('\n\n')
  let offset = 0
  const pageBoundaries = chosen
    .map((pageText, index) => {
      if (!pageText) return null
      const boundary = { page: index + 1, start: offset, end: offset + pageText.length }
      offset = boundary.end + 2
      return boundary
    })
    .filter((b): b is { page: number; start: number; end: number } => b !== null)

  return { text, pageBoundaries, ocrPagesUsed, embeddedPagesUsed, pageDecisions }
}

/** Metrics for bilingual OCR noise near Arabic (includes BiDi-wrapped scraps). */
export function countSpuriousLatinNearArabic(text: string): { count: number; samples: string[] } {
  const samples: string[] = []
  const scrap = String.raw`${BIDI}([A-Za-z]{1,5}\d{0,2})${BIDI}`
  const patterns = [
    new RegExp(String.raw`[\u0600-\u06FF]\s*${scrap}\s*[\u0600-\u06FF]`, 'g'),
    new RegExp(String.raw`(?:^|\n)\s*${scrap}\s+(?=[\u0600-\u06FF])`, 'gm'),
    new RegExp(String.raw`[\u0600-\u06FF]\s+${scrap}\s*$`, 'gm'),
    new RegExp(String.raw`[—\-\s]${scrap}(?=\s)`, 'g')
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m[1]) samples.push(m[1])
    }
  }
  return { count: samples.length, samples: samples.slice(0, 25) }
}
