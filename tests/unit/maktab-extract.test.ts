import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  extractFromPdf,
  MaktabOcrUnavailableError,
  resetMaktabOcrBackend,
  setMaktabOcrBackend,
  type MaktabOcrBackend
} from '@engine/maktab'
import * as pdfExtract from '@engine/manuscript/pdf-extract'

describe('maktab extractFromPdf', () => {
  beforeEach(() => {
    resetMaktabOcrBackend()
    vi.restoreAllMocks()
  })

  it('returns embedded_text tier when pdf.js extraction succeeds', async () => {
    vi.spyOn(pdfExtract, 'extractManuscriptFromPdf').mockResolvedValue({
      text: 'Introduction\n\nMethods and results follow.',
      pageCount: 2,
      warnings: []
    })

    const result = await extractFromPdf(new ArrayBuffer(8), { mode: 'auto' })

    expect(result.tier).toBe('embedded_text')
    expect(result.pageCount).toBe(2)
    expect(result.needsReview).toBe(false)
    expect(result.languages).toEqual(['eng', 'fra', 'ara'])
    expect(result.text).toContain('Introduction')
  })

  it('flags needsReview when embedded warnings report sparse text', async () => {
    vi.spyOn(pdfExtract, 'extractManuscriptFromPdf').mockResolvedValue({
      text: 'tiny',
      pageCount: 1,
      warnings: ['Very little text was extracted. The PDF may be partially scanned.']
    })

    const result = await extractFromPdf(new ArrayBuffer(8), { mode: 'auto' })

    expect(result.tier).toBe('embedded_text')
    expect(result.needsReview).toBe(true)
  })

  it('uses OCR tier when backend is available and embedded fails', async () => {
    vi.spyOn(pdfExtract, 'extractManuscriptFromPdf').mockRejectedValue(
      new Error('This PDF contains no extractable text — it is likely a scan.')
    )

    const mockBackend: MaktabOcrBackend = {
      id: 'test-ocr',
      isAvailable: () => true,
      extractFromPdf: async () => ({
        text: 'OCR recovered manuscript text.',
        pageCount: 1,
        warnings: [],
        tier: 'ocr',
        languages: ['eng'],
        needsReview: false
      })
    }
    setMaktabOcrBackend(mockBackend)

    const result = await extractFromPdf(new ArrayBuffer(8), { mode: 'auto' })

    expect(result.tier).toBe('ocr')
    expect(result.text).toContain('OCR recovered')
  })

  it('throws MaktabOcrUnavailableError for scans when OCR backend is not configured', async () => {
    vi.spyOn(pdfExtract, 'extractManuscriptFromPdf').mockRejectedValue(
      new Error('This PDF contains no extractable text — it is likely a scan.')
    )

    await expect(extractFromPdf(new ArrayBuffer(8), { mode: 'auto' })).rejects.toBeInstanceOf(
      MaktabOcrUnavailableError
    )
  })

  it('ocr_preferred calls backend when available', async () => {
    const pdfSpy = vi.spyOn(pdfExtract, 'extractManuscriptFromPdf')

    const mockBackend: MaktabOcrBackend = {
      id: 'test-ocr',
      isAvailable: () => true,
      extractFromPdf: async () => ({
        text: 'Direct OCR path.',
        pageCount: 3,
        warnings: [],
        tier: 'ocr',
        languages: ['eng', 'fra', 'ara'],
        needsReview: false
      })
    }
    setMaktabOcrBackend(mockBackend)

    const result = await extractFromPdf(new ArrayBuffer(8), { mode: 'ocr_preferred', ocrDpi: 200 })

    expect(result.tier).toBe('ocr')
    expect(pdfSpy).not.toHaveBeenCalled()
  })
})

describe('ouroboros loop stages', () => {
  it('lists Maktab as partial extract stage', async () => {
    const { OUROBOROS_LOOP_STAGES, OUROBOROS_LOOP_STAGE_IDS } = await import(
      '../../src/shared/ouroboros-loop-stages'
    )
    const maktab = OUROBOROS_LOOP_STAGES.find((s) => s.id === OUROBOROS_LOOP_STAGE_IDS.maktabExtract)
    expect(maktab?.workerCodename).toBe('Maktab')
    expect(maktab?.status).toBe('partial')
    expect(maktab?.taskId).toBe('doc_extract')
  })
})
