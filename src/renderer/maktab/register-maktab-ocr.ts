import type { MaktabOcrBackend } from '@engine/maktab/ocr/types'
import type { MaktabOcrExtractOptions } from '@engine/maktab/types'

/** Renderer-side OCR backend that delegates to main-process Tesseract. */
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

export async function registerMaktabOcrBackendWhenReady(): Promise<void> {
  if (!window.api?.maktabOcrAvailable) return

  const available = await window.api.maktabOcrAvailable().catch(() => false)
  if (!available) return

  const { setMaktabOcrBackend } = await import('@engine/maktab')
  setMaktabOcrBackend(createIpcMaktabOcrBackend())
}
