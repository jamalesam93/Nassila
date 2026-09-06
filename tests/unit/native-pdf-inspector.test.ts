import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  mapNativeOcrResult,
  mapNativeClassification,
  processPdfNative,
  classifyPdfNative,
  resetNativePdfInspectorLoadCache,
  NATIVE_PDF_INSPECTOR_ENGINE_ID,
  type NativePdfInspectorModule
} from '@engine/maktab/native-pdf-inspector'
import {
  getMaktabNativePdfBackend,
  resetMaktabNativePdfBackend,
  setMaktabNativePdfBackend,
  unavailableNativePdfBackend
} from '@engine/maktab/native-backend'
import { extractManuscriptFromPdf } from '@engine/manuscript/pdf-extract'
import {
  getArabicRecognizerAdapter,
  resetArabicRecognizerAdapter,
  unavailableArabicAdapter
} from '@engine/maktab/ocr/arabic-adapter'

describe('native pdf-inspector wrapper', () => {
  beforeEach(() => {
    resetNativePdfInspectorLoadCache()
    resetMaktabNativePdfBackend()
  })

  it('maps classification + OCR results with provenance fields', () => {
    const classification = mapNativeClassification({
      pdfType: 'Mixed',
      pageCount: 3,
      pagesNeedingOcr: [1, 2],
      confidence: 0.8
    })
    expect(classification.pagesNeedingOcr).toEqual([1, 2])

    const mapped = mapNativeOcrResult({
      markdown: 'Hello world',
      pageCount: 2,
      pagesRoutedToOcr: [2],
      pagesWithTables: [1],
      pages: [
        {
          pageNumber: 1,
          markdown: 'Hello',
          provenance: { ocrConfidence: 0.9, warnings: [] }
        },
        {
          pageNumber: 2,
          markdown: 'world',
          provenance: { ocrConfidence: 0.7, warnings: ['blur'], hostedRecommended: true }
        }
      ],
      processingTimeMs: 12
    })

    expect(mapped.provenance.engineId).toBe(NATIVE_PDF_INSPECTOR_ENGINE_ID)
    expect(mapped.provenance.pagesRoutedToOcr).toEqual([2])
    expect(mapped.provenance.pagesWithTables).toEqual([1])
    expect(mapped.text).toContain('Hello')
    expect(mapped.warnings.some((w) => /routed 1 page/i.test(w))).toBe(true)
    expect(mapped.warnings.some((w) => /review recommended/i.test(w))).toBe(true)
  })

  it('degrades to null when native module is missing', async () => {
    expect(await processPdfNative(new Uint8Array([1, 2, 3]), {}, null)).toBeNull()
    expect(await classifyPdfNative(new Uint8Array([1, 2, 3]), null)).toBeNull()
  })

  it('degrades when injected module throws', async () => {
    const failing: NativePdfInspectorModule = {
      classifyPdf: () => {
        throw new Error('dll missing')
      },
      processPdfWithOcr: async () => {
        throw new Error('onnx missing')
      },
      OcrMode: { Auto: 'Auto' }
    }
    expect(await classifyPdfNative(new ArrayBuffer(4), failing)).toBeNull()
    expect(await processPdfNative(new ArrayBuffer(4), {}, failing)).toBeNull()
  })

  it('default native backend is unavailable (WASM/pdf.js path kept)', async () => {
    expect(getMaktabNativePdfBackend()).toBe(unavailableNativePdfBackend)
    expect(await unavailableNativePdfBackend.isAvailable()).toBe(false)
    expect(await unavailableNativePdfBackend.extract(new ArrayBuffer(4))).toBeNull()
  })

  it('extractManuscriptFromPdf engine=pdfjs skips native backend', async () => {
    const extractSpy = vi.fn(async () => null)
    setMaktabNativePdfBackend({
      id: 'spy',
      isAvailable: () => true,
      classify: async () => null,
      extract: extractSpy
    })

    await expect(
      extractManuscriptFromPdf(new ArrayBuffer(8), { engine: 'pdfjs' })
    ).rejects.toThrow()
    expect(extractSpy).not.toHaveBeenCalled()
  })

  it('extractManuscriptFromPdf tries native first when registered', async () => {
    setMaktabNativePdfBackend({
      id: 'spy',
      isAvailable: () => true,
      classify: async () => null,
      extract: async () => ({
        text: 'native text',
        pageCount: 1,
        pageBoundaries: [{ page: 1, start: 0, end: 11 }],
        warnings: [],
        provenance: {
          engineId: NATIVE_PDF_INSPECTOR_ENGINE_ID,
          confidence: 0.95,
          pagesRoutedToOcr: [],
          pagesWithTables: [],
          warnings: []
        }
      })
    })

    const result = await extractManuscriptFromPdf(new ArrayBuffer(8), { engine: 'native' })
    expect(result.text).toBe('native text')
    expect(result.pageCount).toBe(1)
  })
})

describe('arabic recognizer adapter', () => {
  beforeEach(() => {
    resetArabicRecognizerAdapter()
  })

  it('defaults to unavailable (no ara / no DOCX lift)', async () => {
    const adapter = getArabicRecognizerAdapter()
    expect(adapter).toBe(unavailableArabicAdapter)
    expect(adapter.isAvailable()).toBe(false)
    const result = await adapter.recognize({ bytes: new Uint8Array([0]) })
    expect(result.text).toBe('')
    expect(result.needsReview).toBe(true)
  })
})
