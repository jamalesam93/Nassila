import type { MaktabOcrBackend } from './types'

/** Placeholder until Tesseract is wired in main process. */
export const unavailableOcrBackend: MaktabOcrBackend = {
  id: 'unavailable',

  isAvailable(): boolean {
    return false
  },

  async extractFromPdf(): Promise<never> {
    throw new Error('OCR backend not configured')
  }
}

let activeBackend: MaktabOcrBackend = unavailableOcrBackend

/** Test hook: inject a mock OCR backend. */
export function setMaktabOcrBackend(backend: MaktabOcrBackend): void {
  activeBackend = backend
}

export function getMaktabOcrBackend(): MaktabOcrBackend {
  return activeBackend
}

export function resetMaktabOcrBackend(): void {
  activeBackend = unavailableOcrBackend
}
