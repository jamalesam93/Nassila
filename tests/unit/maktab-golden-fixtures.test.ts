/**
 * Maktab golden fixtures — real hand-built PDFs through the real extraction
 * engines (no committed binaries, no Tesseract in unit tests).
 * Tier-B OCR content is covered by `scripts/probe-ocr-golden.mjs` (packaged CI).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(async () => {
  await import('../smoke/setup-pdfjs-node')
})

import {
  extractFromPdf,
  MaktabOcrUnavailableError,
  resetMaktabOcrBackend,
  setMaktabOcrBackend,
  type MaktabOcrBackend
} from '@engine/maktab'
import { findReferencesBoundary, segmentManuscriptText } from '@engine/manuscript/segments'
import {
  ARABIC_OCR_DEFERRED_WARNING,
  countSpuriousLatinNearArabic,
  stripSpuriousDigitNoiseInArabic,
  stripSpuriousLatinInArabic
} from '../../src/engine/maktab/ocr/post-process'
import {
  CandidatePaddleOcrArabicAdapter,
  computeCer,
  computeKeywordRecall,
  computeLevenshteinDistance,
  createArabicMaktabOcrBackend,
  resetArabicRecognizerAdapter,
  setArabicRecognizerAdapter,
  type ArabicPageImage
} from '../../src/engine/maktab/ocr/arabic-adapter'
import {
  buildArabicTextPdf,
  buildEmbeddedTextPdf,
  buildReferencesPdf,
  buildScanPdf,
  buildSparseTextPdf,
  buildTwoColumnPdf,
  buildAlignedTwoColumnPdf,
  GOLDEN_EMBEDDED_TEXT,
  GOLDEN_REVERSED_ARABIC_TEXT
} from '../fixtures/maktab-pdf-builder'

function mockOcrBackend(): { backend: MaktabOcrBackend; extractSpy: ReturnType<typeof vi.fn> } {
  const extractSpy = vi.fn(
    async (
      _buffer: ArrayBuffer,
      opts?: { languages: string[]; dpi: number }
    ): Promise<{
      text: string
      pageCount: number
      warnings: string[]
      tier: 'ocr'
      languages: string[]
      needsReview: boolean
    }> => ({
      text: 'OCR recovered golden fixture text.',
      pageCount: 1,
      warnings: [],
      tier: 'ocr',
      languages: opts?.languages ?? ['eng', 'fra'],
      needsReview: false
    })
  )
  return { backend: { id: 'test-ocr', isAvailable: () => true, extractFromPdf: extractSpy }, extractSpy }
}

describe('maktab golden fixtures — embedded text (tier A)', () => {
  beforeEach(() => {
    resetMaktabOcrBackend()
    vi.restoreAllMocks()
  })

  it('extracts embedded text with content and page boundaries (default engine)', async () => {
    const pdf = buildEmbeddedTextPdf([GOLDEN_EMBEDDED_TEXT])
    const result = await extractFromPdf(pdf, { mode: 'auto' })

    expect(result.tier).toBe('embedded_text')
    expect(result.pageCount).toBe(1)
    expect(result.text).toContain('golden manuscript sentence')
    expect(result.needsReview).toBe(false)
    expect(result.pageBoundaries).toHaveLength(1)
    expect(result.pageBoundaries![0]!.start).toBe(0)
    expect(result.pageBoundaries![0]!.end).toBe(result.text.length)
  })

  it('keeps multi-page boundaries contiguous (pinned pdfjs)', async () => {
    const pageTwoText =
      'Second golden manuscript page verifies that contiguous page boundaries stay ' +
      'aligned across the break, with enough wrapped glyphs on this page to avoid ' +
      'the sparse-text warning and keep extraction on the embedded tier cleanly.'
    const pdf = buildEmbeddedTextPdf([GOLDEN_EMBEDDED_TEXT, pageTwoText])
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    expect(result.tier).toBe('embedded_text')
    expect(result.pageCount).toBe(2)
    expect(result.text).toContain('golden manuscript sentence')
    expect(result.text).toContain('Second golden manuscript page')
    expect(result.pageBoundaries).toHaveLength(2)
    expect(result.pageBoundaries![0]!.page).toBe(1)
    expect(result.pageBoundaries![1]!.page).toBe(2)
    expect(result.pageBoundaries![0]!.end).toBeLessThanOrEqual(result.pageBoundaries![1]!.start)
    expect(result.pageBoundaries![1]!.end).toBe(result.text.length)
  })

  it('ocr_preferred keeps good embedded text without calling OCR (pinned pdfjs)', async () => {
    const pdf = buildEmbeddedTextPdf([GOLDEN_EMBEDDED_TEXT])
    const { backend, extractSpy } = mockOcrBackend()
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(pdf, { mode: 'ocr_preferred', engine: 'pdfjs' })

    expect(result.tier).toBe('embedded_text')
    expect(extractSpy).not.toHaveBeenCalled()
  })
})

describe('maktab golden fixtures — sparse and scan routing', () => {
  beforeEach(() => {
    resetMaktabOcrBackend()
    vi.restoreAllMocks()
  })

  it('sparse glyph PDF escalates to OCR when backend is available (pinned pdfjs)', async () => {
    const pdf = buildSparseTextPdf()
    const { backend, extractSpy } = mockOcrBackend()
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    expect(result.tier).toBe('ocr')
    expect(result.text).toContain('OCR recovered')
    expect(extractSpy).toHaveBeenCalledTimes(1)
  })

  it('sparse glyph PDF stays embedded with needsReview when OCR is unavailable (pinned pdfjs)', async () => {
    const pdf = buildSparseTextPdf()

    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    expect(result.tier).toBe('embedded_text')
    expect(result.needsReview).toBe(true)
    expect(result.warnings.some((w) => /very little text/i.test(w))).toBe(true)
  })

  it('image-only scan PDF rejects with MaktabOcrUnavailableError when no OCR backend', async () => {
    const pdf = buildScanPdf()
    await expect(extractFromPdf(pdf, { mode: 'auto' })).rejects.toBeInstanceOf(
      MaktabOcrUnavailableError
    )
  })

  it('image-only scan PDF rejects without backend on the pinned pdfjs engine', async () => {
    const pdf = buildScanPdf()
    await expect(extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })).rejects.toBeInstanceOf(
      MaktabOcrUnavailableError
    )
  })

  it('image-only scan PDF extracts via the OCR backend', async () => {
    const pdf = buildScanPdf()
    const { backend, extractSpy } = mockOcrBackend()
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    expect(result.tier).toBe('ocr')
    expect(result.text).toContain('OCR recovered')
    expect(extractSpy).toHaveBeenCalledTimes(1)
  })
})

describe('maktab golden fixtures — reading order', () => {
  beforeEach(() => {
    resetMaktabOcrBackend()
    vi.restoreAllMocks()
  })

  it('two-column page reads left column before right column (pinned pdfjs)', async () => {
    const pdf = buildTwoColumnPdf()
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    const firstLeft = result.text.indexOf('L01')
    const lastLeft = result.text.indexOf('L12')
    const firstRight = result.text.indexOf('R01')
    expect(firstLeft).toBeGreaterThanOrEqual(0)
    expect(firstRight).toBeGreaterThanOrEqual(0)
    expect(firstLeft).toBeLessThan(firstRight)
    expect(lastLeft).toBeLessThan(firstRight)
  })

  it('two-column page reads left column before right column (pinned inspector)', async () => {
    const pdf = buildTwoColumnPdf()
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'inspector' })

    const firstLeft = result.text.indexOf('L01')
    const lastLeft = result.text.indexOf('L12')
    const firstRight = result.text.indexOf('R01')
    expect(firstLeft).toBeGreaterThanOrEqual(0)
    expect(firstRight).toBeGreaterThanOrEqual(0)
    expect(firstLeft).toBeLessThan(firstRight)
    expect(lastLeft).toBeLessThan(firstRight)
  })

  it('aligned-baseline two-column page does not merge left and right on one line (pdfjs)', async () => {
    const pdf = buildAlignedTwoColumnPdf()
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    expect(result.text).toContain('L01 first column sentence')
    expect(result.text).toContain('R01 second column sentence')
    expect(result.text).not.toMatch(/L01 first column sentence\s*R01 second column sentence/)
    expect(result.text).not.toMatch(/R01 second column sentence\s*L01 first column sentence/)

    const firstLeft = result.text.indexOf('L01')
    const lastLeft = result.text.indexOf('L12')
    const firstRight = result.text.indexOf('R01')
    expect(firstLeft).toBeLessThan(firstRight)
    expect(lastLeft).toBeLessThan(firstRight)
  })

  it('aligned-baseline two-column page preserves left-before-right order (inspector)', async () => {
    const pdf = buildAlignedTwoColumnPdf()
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'inspector' })

    const firstLeft = result.text.indexOf('L01')
    const lastLeft = result.text.indexOf('L12')
    const firstRight = result.text.indexOf('R01')
    expect(firstLeft).toBeGreaterThanOrEqual(0)
    expect(firstRight).toBeGreaterThanOrEqual(0)
    expect(firstLeft).toBeLessThan(firstRight)
    expect(lastLeft).toBeLessThan(firstRight)
    expect(result.text).not.toMatch(/L01 first column sentence\s*R01 second column sentence/)
  })
})

describe('maktab golden fixtures — segmentation and Arabic policy', () => {
  beforeEach(() => {
    resetMaktabOcrBackend()
    vi.restoreAllMocks()
  })

  it('references-section PDF segments into body and bibliography (pinned pdfjs)', async () => {
    const pdf = buildReferencesPdf()
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    const boundary = findReferencesBoundary(result.text)
    expect(boundary).not.toBeNull()
    expect(boundary!.kind).toBe('header')

    const segments = segmentManuscriptText(result.text)
    expect(segments.referencesText).toContain('Smith')
    expect(segments.bodyText).toContain('antimicrobial resistance')
  })

  it('Arabic-dominant PDF stays embedded without calling OCR (pinned pdfjs)', async () => {
    const pdf = buildArabicTextPdf(GOLDEN_REVERSED_ARABIC_TEXT)
    const { backend, extractSpy } = mockOcrBackend()
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    expect(result.text).toMatch(/[\u0600-\u06FF]/)
    expect(result.tier).toBe('embedded_text')
    expect(result.needsReview).toBe(false)
    expect(result.warnings).not.toContain(ARABIC_OCR_DEFERRED_WARNING)
    expect(extractSpy).not.toHaveBeenCalled()
  })
})

describe('maktab golden fixtures — Arabic OCR adapter candidate (Tiers A–F)', () => {
  beforeEach(() => {
    resetMaktabOcrBackend()
    resetArabicRecognizerAdapter()
    vi.restoreAllMocks()
  })

  // Tier A: Embedded Arabic text stays embedded without invoking OCR
  it('Tier A: embedded Arabic text stays embedded without invoking OCR backend', async () => {
    const pdf = buildArabicTextPdf(GOLDEN_REVERSED_ARABIC_TEXT)
    const { backend, extractSpy } = mockOcrBackend()
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })
    expect(result.tier).toBe('embedded_text')
    expect(result.text).toMatch(/[\u0600-\u06FF]/)
    expect(result.needsReview).toBe(false)
    expect(extractSpy).not.toHaveBeenCalled()
  })

  // Tier B: Synthetic Arabic scan routed to adapter; verify CER and Keyword Recall >= 95%
  it('Tier B: synthetic Arabic scan routes to adapter with CER < 0.05 and Keyword Recall >= 95%', async () => {
    const scanPdf = buildScanPdf()
    const goldenTokens = [
      'مقاومة مضادات الميكروبات',
      'المستشفيات',
      'المراقبة'
    ] as const

    const goldText =
      'دراسة ميدانية حول مقاومة مضادات الميكروبات في المستشفيات وأهمية المراقبة المستمرة لمكافحة العدوى.'

    const candidateAdapter = new CandidatePaddleOcrArabicAdapter({
      id: 'paddleocr-arabic-ppocrv5',
      revision: '2026.09-v5',
      runner: async () => ({
        text: 'دراسة ميدانية حول مقاومة مضادات الميكروبات في المستشفيات وأهمية المراقبة المستمرة لمكافحة العدوى.',
        confidence: 0.96,
        needsReview: false
      })
    })

    const backend = createArabicMaktabOcrBackend(candidateAdapter)
    setMaktabOcrBackend(backend)
    setArabicRecognizerAdapter(candidateAdapter)

    const result = await extractFromPdf(scanPdf, { mode: 'auto' })

    expect(result.tier).toBe('ocr')
    expect(result.needsReview).toBe(false)
    expect(result.text).toContain('مقاومة مضادات الميكروبات')

    // Verify Keyword Recall >= 95% on golden tokens
    const kr = computeKeywordRecall(result.text, goldenTokens)
    expect(kr.recall).toBeGreaterThanOrEqual(0.95)
    expect(kr.matched).toEqual(expect.arrayContaining([...goldenTokens]))
    expect(kr.missing).toHaveLength(0)

    // Verify Character Error Rate (CER) and distance
    expect(computeLevenshteinDistance(goldText, result.text)).toBe(0)
    const cer = computeCer(goldText, result.text)
    expect(cer).toBeLessThan(0.05)
  })

  // Tier C: Mixed Arabic/Latin references (scripts preserved without BiDi corruption or glued digits)
  it('Tier C: mixed Arabic/Latin references preserved without BiDi corruption or glued digits', async () => {
    const scanPdf = buildScanPdf()
    const rawHypothesis =
      'أكدت دراسة سريرية حول مقاومة مضادات الميكروبات في المستشفيات ' +
      '\u200EIts3\u200E (Williams, 2024; DOI: 10.1016/j.jiph.2024.01.005) ' +
      '77515آ221مر المنشورة في عام 2024.'

    const candidateAdapter = new CandidatePaddleOcrArabicAdapter({
      runner: async () => ({
        text: rawHypothesis,
        confidence: 0.92,
        needsReview: false
      })
    })

    const backend = createArabicMaktabOcrBackend(candidateAdapter)
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(scanPdf, { mode: 'auto' })

    // Scripts preserved
    expect(result.text).toMatch(/[\u0600-\u06FF]/)
    expect(result.text).toMatch(/[A-Za-z]/)

    // Latin references preserved cleanly
    expect(result.text).toContain('Williams, 2024')
    expect(result.text).toContain('DOI: 10.1016/j.jiph.2024.01.005')
    expect(result.text).toContain('عام 2024')

    // Arabic tokens preserved
    expect(result.text).toContain('مقاومة مضادات الميكروبات')
    expect(result.text).toContain('المستشفيات')

    // No corrupted BiDi isolate marks (U+200E, U+200F, U+202A-U+202E)
    expect(result.text).not.toMatch(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/)

    // Glued digit noise stripped
    expect(result.text).not.toMatch(/77515/)

    // Zero spurious Latin scraps remaining
    const metrics = countSpuriousLatinNearArabic(result.text)
    expect(metrics.count).toBe(0)
  })

  // Tier D: Two-column Arabic page reading order (right column before left column)
  it('Tier D: two-column Arabic page preserves right-to-left column reading order', async () => {
    const scanPdf = buildScanPdf()

    // Right column precedes left column in Arabic visual RTL flow
    const candidateAdapter = new CandidatePaddleOcrArabicAdapter({
      runner: async () => {
        const rightColumn = [
          'العمود_الأيمن_1: استراتيجيات الترصد الوبائي لمقاومة مضادات الميكروبات.',
          'العمود_الأيمن_2: تفعيل برامج ضبط العدوى وتدريب الكوادر في المستشفيات.'
        ].join('\n')

        const leftColumn = [
          'العمود_الأيسر_1: المؤشرات المخبرية ومعدلات الحساسية الحيوية للمضادات.',
          'العمود_الأيسر_2: التحليل الإحصائي لنتائج المراقبة الوبائية الدورية.'
        ].join('\n')

        return {
          text: `${rightColumn}\n\n${leftColumn}`,
          confidence: 0.93,
          needsReview: false
        }
      }
    })

    const backend = createArabicMaktabOcrBackend(candidateAdapter)
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(scanPdf, { mode: 'auto' })

    const firstRight = result.text.indexOf('العمود_الأيمن_1')
    const lastRight = result.text.indexOf('العمود_الأيمن_2')
    const firstLeft = result.text.indexOf('العمود_الأيسر_1')
    const lastLeft = result.text.indexOf('العمود_الأيسر_2')

    expect(firstRight).toBeGreaterThanOrEqual(0)
    expect(firstLeft).toBeGreaterThanOrEqual(0)
    // Right column MUST appear before Left column in RTL layout
    expect(firstRight).toBeLessThan(firstLeft)
    expect(lastRight).toBeLessThan(firstLeft)
    expect(firstLeft).toBeLessThan(lastLeft)
  })

  // Tier E: Low-res / degraded scan produces honest needsReview: true
  it('Tier E: low-res / degraded scan produces honest needsReview: true rather than false confidence', async () => {
    const scanPdf = buildScanPdf()

    const candidateAdapter = new CandidatePaddleOcrArabicAdapter({
      minDpi: 150,
      minConfidence: 0.78,
      runner: async (img: ArabicPageImage) => {
        const isDegradedDpi = Boolean(img.dpi && img.dpi < 150)
        return {
          text: 'نص مشوش غير واضح من مسح منخفض الجودة',
          confidence: isDegradedDpi ? 0.42 : 0.90,
          needsReview: isDegradedDpi
        }
      }
    })

    const backend = createArabicMaktabOcrBackend(candidateAdapter)
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(scanPdf, { mode: 'auto', ocrDpi: 72 })

    expect(result.tier).toBe('ocr')
    expect(result.needsReview).toBe(true)
    expect(result.pageConfidences?.[0]).toBeLessThan(0.78)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  // Tier F: Table + caption deterministic extraction
  it('Tier F: table and caption regions extract deterministically with structured cell content', async () => {
    const scanPdf = buildScanPdf()
    const tableOcrText = [
      'جدول 1: معدلات مقاومة الميكروبات للمضادات الحيوية في المستشفيات (2020-2024)',
      '| الميكروب | المضاد الحيوي | نسبة المقاومة (%) | عدد العينات |',
      '| المكورات العنقودية الذهبية | فانكومايسين | 2.5% | 450 |',
      '| الزائفة الزنجارية | ميروبينيم | 28.4% | 320 |',
      '| الكلبسيلة الرئوية | سيفترياكسون | 45.1% | 510 |'
    ].join('\n')

    const candidateAdapter = new CandidatePaddleOcrArabicAdapter({
      runner: async () => ({
        text: tableOcrText,
        confidence: 0.95,
        needsReview: false
      })
    })

    const backend = createArabicMaktabOcrBackend(candidateAdapter)
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(scanPdf, { mode: 'auto' })

    // Caption tokens present
    expect(result.text).toContain('جدول 1')
    expect(result.text).toContain('مقاومة الميكروبات')
    expect(result.text).toContain('المستشفيات')

    // Table headers and cells present
    expect(result.text).toContain('الميكروب')
    expect(result.text).toContain('المضاد الحيوي')
    expect(result.text).toContain('نسبة المقاومة (%)')
    expect(result.text).toContain('المكورات العنقودية الذهبية')
    expect(result.text).toContain('فانكومايسين')
    expect(result.text).toContain('2.5%')
    expect(result.text).toContain('الكلبسيلة الرئوية')
    expect(result.text).toContain('سيفترياكسون')
    expect(result.text).toContain('45.1%')
  })
})

describe('maktab golden fixtures — strict negative control (0 false-Arabic in Latin goldens)', () => {
  beforeEach(() => {
    resetMaktabOcrBackend()
    resetArabicRecognizerAdapter()
    vi.restoreAllMocks()
  })

  it('Latin embedded golden fixture produces exactly 0 false-positive Arabic characters', async () => {
    const pdf = buildEmbeddedTextPdf([GOLDEN_EMBEDDED_TEXT])
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    const arabicMatches = result.text.match(/[\u0600-\u06FF]/g) ?? []
    expect(arabicMatches).toHaveLength(0)
    expect(result.text).not.toMatch(/[\u0600-\u06FF]/)
  })

  it('Latin scan OCR golden fixture produces exactly 0 false-positive Arabic characters', async () => {
    const pdf = buildScanPdf()
    const { backend } = mockOcrBackend()
    setMaktabOcrBackend(backend)

    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })
    expect(result.tier).toBe('ocr')

    const arabicMatches = result.text.match(/[\u0600-\u06FF]/g) ?? []
    expect(arabicMatches).toHaveLength(0)
    expect(result.text).not.toMatch(/[\u0600-\u06FF]/)
  })

  it('Latin references golden fixture produces exactly 0 false-positive Arabic characters', async () => {
    const pdf = buildReferencesPdf()
    const result = await extractFromPdf(pdf, { mode: 'auto', engine: 'pdfjs' })

    const arabicMatches = result.text.match(/[\u0600-\u06FF]/g) ?? []
    expect(arabicMatches).toHaveLength(0)
    expect(result.text).not.toMatch(/[\u0600-\u06FF]/)
  })
})

describe('maktab post-processing filters — Arabic OCR cleanup', () => {
  it('stripSpuriousLatinInArabic removes 1-5 character scraps and BiDi marks while preserving legitimate English', () => {
    const noisyInput =
      'تقرير حول \u200EIts3\u200E مقاومة مضادات الميكروبات Sle في المستشفيات ' +
      'وفق معايير International Health Organization المنشورة في Geneva.'

    const cleaned = stripSpuriousLatinInArabic(noisyInput)

    // Hallucination scraps and BiDi marks removed
    expect(cleaned).not.toContain('Its3')
    expect(cleaned).not.toContain('Sle')
    expect(cleaned).not.toMatch(/[\u200E\u200F\u202A-\u202E]/)

    // Legitimate English words preserved
    expect(cleaned).toContain('International Health Organization')
    expect(cleaned).toContain('Geneva')
    expect(cleaned).toContain('مقاومة مضادات الميكروبات')
  })

  it('stripSpuriousDigitNoiseInArabic removes glued digits while preserving 4-digit years', () => {
    const noisyInput =
      'بيانات 77515آ221مر الترصد الوبائي لعام 2024 ومقارنتها بعام 2019 مع رمز 9876543 عشوائي.'

    const cleaned = stripSpuriousDigitNoiseInArabic(noisyInput)

    // Glued digit artifacts removed
    expect(cleaned).not.toMatch(/77515/)
    expect(cleaned).not.toMatch(/9876543/)

    // Valid 4-digit years preserved
    expect(cleaned).toContain('2024')
    expect(cleaned).toContain('2019')
    expect(cleaned).toContain('الترصد الوبائي')
  })

  it('countSpuriousLatinNearArabic counts scraps before cleanup and reports 0 after cleanup', () => {
    const noisyText = 'التقرير \u200ESW\u200E الطبي في \u200EIts3\u200E المستشفى'
    const beforeMetrics = countSpuriousLatinNearArabic(noisyText)
    expect(beforeMetrics.count).toBeGreaterThan(0)
    expect(beforeMetrics.samples.length).toBeGreaterThan(0)

    const cleanedText = stripSpuriousLatinInArabic(noisyText)
    const afterMetrics = countSpuriousLatinNearArabic(cleanedText)
    expect(afterMetrics.count).toBe(0)
    expect(afterMetrics.samples).toHaveLength(0)
  })
})

