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
import { ARABIC_OCR_DEFERRED_WARNING } from '../../src/engine/maktab/ocr/post-process'
import {
  buildArabicTextPdf,
  buildEmbeddedTextPdf,
  buildReferencesPdf,
  buildScanPdf,
  buildSparseTextPdf,
  buildTwoColumnPdf,
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
