import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  NATIVE_PDF_INSPECTOR_ENGINE_ID,
  computeCmapGapRatio,
  mapNativeSignals,
  processPdfNative,
  type NativePdfInspectorExtraction,
  type NativePdfInspectorModule
} from '@engine/maktab/native-pdf-inspector'
import {
  resetMaktabNativePdfBackend,
  setMaktabNativePdfBackend
} from '@engine/maktab/native-backend'
import { resetMaktabOcrBackend } from '@engine/maktab/ocr/backend'
import {
  ARABIC_MISENCODED_WARNING,
  CMAP_GAP_RATIO_WARN,
  INVISIBLE_TEXT_LAYER_WARNING,
  TEXT_LAYER_INCOMPLETE_WARNING,
  embeddedTextLayerUnreliable,
  textLayerSignalWarnings
} from '@engine/maktab/ocr/post-process'
import { extractManuscriptFromPdf } from '@engine/manuscript/pdf-extract'
import { extractFromPdf } from '@engine/maktab/extract'

function nativeExtraction(
  overrides: Partial<NativePdfInspectorExtraction> = {}
): NativePdfInspectorExtraction {
  return {
    text: 'body text',
    pageCount: 1,
    pageBoundaries: [{ page: 1, start: 0, end: 9 }],
    warnings: [],
    provenance: {
      engineId: NATIVE_PDF_INSPECTOR_ENGINE_ID,
      confidence: 0.9,
      pagesRoutedToOcr: [],
      pagesWithTables: [],
      warnings: []
    },
    ...overrides
  }
}

describe('native pdf-inspector signals', () => {
  beforeEach(() => {
    resetMaktabNativePdfBackend()
    resetMaktabOcrBackend()
  })

  it('computes the unmapped-code ratio and ignores clean fonts', () => {
    expect(computeCmapGapRatio([])).toBe(0)
    expect(
      computeCmapGapRatio([
        { font: 'A', codes: 100, interpolated: 5, unmapped: 0 },
        { font: 'B', codes: 100, interpolated: 0, unmapped: 3 }
      ])
    ).toBeCloseTo(0.015)
  })

  it('normalizes pages, invisible layers and document info', () => {
    const signals = mapNativeSignals({
      cmapGaps: [{ font: 'ABCDEF+Arial', codes: 40, interpolated: 0, unmapped: 4 }],
      hasEncodingIssues: true,
      pagesNeedingOcr: [2, 5],
      ocrReasonsByPage: [
        { page: 2, reasons: ['invisible_text_layer'] },
        { page: 5, reasons: ['vector_text'] }
      ],
      documentInfo: { title: 'Thèse', author: '', creator: 'Word' }
    })

    expect(signals.pagesNeedingOcr).toEqual([2, 5])
    expect(signals.pagesWithInvisibleTextLayer).toEqual([2])
    expect(signals.hasEncodingIssues).toBe(true)
    expect(signals.cmapGapRatio).toBeCloseTo(0.1)
    expect(signals.documentInfo).toEqual({ title: 'Thèse', creator: 'Word' })
  })

  it('emits warnings only past the ratio gate or for an invisible layer', () => {
    expect(textLayerSignalWarnings(undefined)).toEqual([])
    expect(
      textLayerSignalWarnings({
        cmapGaps: [],
        cmapGapRatio: CMAP_GAP_RATIO_WARN / 2,
        hasEncodingIssues: false,
        pagesNeedingOcr: [],
        pagesWithInvisibleTextLayer: []
      })
    ).toEqual([])
    expect(
      textLayerSignalWarnings({
        cmapGaps: [],
        cmapGapRatio: CMAP_GAP_RATIO_WARN * 2,
        hasEncodingIssues: false,
        pagesNeedingOcr: [],
        pagesWithInvisibleTextLayer: [3]
      })
    ).toEqual([TEXT_LAYER_INCOMPLETE_WARNING, INVISIBLE_TEXT_LAYER_WARNING])
    expect(embeddedTextLayerUnreliable([TEXT_LAYER_INCOMPLETE_WARNING])).toBe(true)
    expect(embeddedTextLayerUnreliable(['very little text was extracted'])).toBe(false)
  })

  it('text-only path uses processPdfAsync and keeps cmap gaps + doc info', async () => {
    const ocrSpy = vi.fn()
    const mod: NativePdfInspectorModule = {
      classifyPdf: () => ({
        pdfType: 'TextBased',
        pageCount: 2,
        pagesNeedingOcr: [],
        confidence: 0.95
      }),
      processPdfAsync: async () => ({
        markdown: '<!-- Page 1 -->\nAlpha\n<!-- Page 2 -->\nBeta',
        pageCount: 2,
        pagesNeedingOcr: [],
        hasEncodingIssues: false,
        cmapGaps: [{ font: 'ABCDEF+Arial', codes: 1000, interpolated: 2, unmapped: 0 }],
        title: 'A Thesis'
      }),
      processPdfWithOcr: ocrSpy,
      OcrMode: { Auto: 'Auto' }
    }

    const mapped = await processPdfNative(new ArrayBuffer(4), {}, mod)

    expect(ocrSpy).not.toHaveBeenCalled()
    expect(mapped?.text).toContain('Alpha')
    expect(mapped?.text).toContain('Beta')
    expect(mapped?.pageBoundaries).toHaveLength(2)
    expect(mapped?.signals?.cmapGapRatio).toBe(0)
    expect(mapped?.signals?.documentInfo?.title).toBe('A Thesis')
  })

  it('OCR path maps invisible_text_layer reasons', async () => {
    const mod: NativePdfInspectorModule = {
      classifyPdf: () => ({
        pdfType: 'Scanned',
        pageCount: 1,
        pagesNeedingOcr: [0],
        confidence: 0.8
      }),
      processPdfWithOcr: async () => ({
        markdown: '<!-- Page 1 -->\nScan text',
        pageCount: 1,
        pagesRoutedToOcr: [1],
        ocrReasonsByPage: [{ page: 1, reasons: ['invisible_text_layer'] }],
        pages: [
          { pageNumber: 1, markdown: 'Scan text', provenance: { ocrConfidence: 0.8, warnings: [] } }
        ]
      }),
      OcrMode: { Auto: 'Auto' }
    }

    const mapped = await processPdfNative(new ArrayBuffer(4), {}, mod)

    expect(mapped?.signals?.pagesWithInvisibleTextLayer).toEqual([1])
    expect(mapped?.signals?.pagesNeedingOcr).toEqual([1])
  })

  it('extractManuscriptFromPdf surfaces signal warnings and keeps the signals', async () => {
    const signals = mapNativeSignals({
      cmapGaps: [{ font: 'X', codes: 100, interpolated: 0, unmapped: 10 }]
    })
    setMaktabNativePdfBackend({
      id: 'spy',
      isAvailable: () => true,
      classify: async () => null,
      extract: async () =>
        nativeExtraction({
          text: 'damaged \uFFFD text',
          signals
        })
    })

    const result = await extractManuscriptFromPdf(new ArrayBuffer(8), { engine: 'native' })

    expect(result.warnings).toContain(TEXT_LAYER_INCOMPLETE_WARNING)
    expect(result.signals?.cmapGapRatio).toBeCloseTo(0.1)
  })

  it('extractFromPdf marks a fabricated text layer for review', async () => {
    const signals = mapNativeSignals({ ocrReasonsByPage: [{ page: 1, reasons: ['invisible_text_layer'] }] })
    setMaktabNativePdfBackend({
      id: 'spy',
      isAvailable: () => true,
      classify: async () => null,
      extract: async () => nativeExtraction({ text: 'hidden layer text', signals })
    })

    const result = await extractFromPdf(new ArrayBuffer(8), { engine: 'native' })

    // No OCR backend registered → stays embedded but honestly flagged.
    expect(result.tier).toBe('embedded_text')
    expect(result.needsReview).toBe(true)
    expect(result.warnings).toContain(INVISIBLE_TEXT_LAYER_WARNING)
  })

  it('extractFromPdf flags a legacy-encoded Arabic layer for review', async () => {
    const mojibake =
      'u01uمقدمهبػعؾاختقارالعؼدياوالؿعرفهالعؾؿقهاماالؼصقدهاففقالزيديهالعؼديهبقصػفاكسؼامذهب'.repeat(10)
    setMaktabNativePdfBackend({
      id: 'spy',
      isAvailable: () => true,
      classify: async () => null,
      extract: async () =>
        nativeExtraction({
          text: mojibake,
          signals: mapNativeSignals({})
        })
    })

    const result = await extractFromPdf(new ArrayBuffer(8), { engine: 'native' })

    expect(result.needsReview).toBe(true)
    expect(result.warnings).toContain(ARABIC_MISENCODED_WARNING)
  })
})
