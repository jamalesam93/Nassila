import type { MaktabOcrBackend } from '@engine/maktab/ocr/types'
import type { MaktabOcrExtractOptions } from '@engine/maktab/types'
import type { MaktabNativePdfBackend } from '@engine/maktab/native-backend'

/** Renderer-side OCR backend that delegates to main-process Tesseract / Arabic Paddle. */
export function createIpcMaktabOcrBackend(): MaktabOcrBackend {
  return {
    id: 'tesseract-main',

    isAvailable(): boolean {
      return Boolean(window.api?.maktabOcrAvailable)
    },

    async extractFromPdf(buffer: ArrayBuffer, options: MaktabOcrExtractOptions) {
      if (!window.api?.maktabOcrExtract) {
        throw new Error('Maktab OCR IPC is not available')
      }
      return window.api.maktabOcrExtract(buffer, options)
    }
  }
}

/** Renderer-side native pdf-inspector backend (main-process napi). */
export function createIpcNativePdfBackend(): MaktabNativePdfBackend {
  return {
    id: 'firecrawl-pdf-inspector-native-ipc',

    isAvailable(): boolean {
      return Boolean(window.api?.maktabNativeAvailable)
    },

    async classify(buffer: ArrayBuffer) {
      if (!window.api?.maktabNativeClassify) return null
      return window.api.maktabNativeClassify(buffer)
    },

    async extract(buffer: ArrayBuffer, options) {
      if (!window.api?.maktabNativeExtract) return null
      return window.api.maktabNativeExtract(buffer, options)
    }
  }
}

export async function registerMaktabOcrBackendWhenReady(): Promise<void> {
  if (!window.api?.maktabOcrAvailable) return

  const available = await window.api.maktabOcrAvailable().catch(() => false)
  if (!available) return

  const { setMaktabOcrBackend } = await import('@engine/maktab')
  setMaktabOcrBackend(createIpcMaktabOcrBackend())
}

export async function registerMaktabNativePdfBackendWhenReady(): Promise<void> {
  if (!window.api?.maktabNativeAvailable) return

  const available = await window.api.maktabNativeAvailable().catch(() => false)
  if (!available) return

  const { setMaktabNativePdfBackend } = await import('@engine/maktab/native-backend')
  setMaktabNativePdfBackend(createIpcNativePdfBackend())
}

/**
 * Register Paddle Arabic adapter when the main-process ONNX pack is available.
 * Lifts Arabic-heavy DOCX deferral; OCR extract routes `ara` to PP-OCRv5 in main.
 */
export async function registerArabicRecognizerAdapterWhenReady(): Promise<void> {
  if (!window.api?.maktabArabicOcrAvailable) return

  const available = await window.api.maktabArabicOcrAvailable().catch(() => false)
  if (!available) return

  const { createCandidateArabicAdapter, setArabicRecognizerAdapter } = await import(
    '@engine/maktab/ocr/arabic-adapter'
  )

  setArabicRecognizerAdapter(
    createCandidateArabicAdapter({
      id: 'paddleocr-arabic-ppocrv5',
      revision: '2026.09-v5-onnx',
      runner: async (pageImage) => {
        if (!window.api?.maktabArabicOcrRecognize) {
          return { text: '', confidence: 0, needsReview: true }
        }
        const copy = new Uint8Array(pageImage.bytes)
        return window.api.maktabArabicOcrRecognize({
          bytes: copy.buffer,
          width: pageImage.width,
          height: pageImage.height,
          dpi: pageImage.dpi
        })
      }
    })
  )
}
