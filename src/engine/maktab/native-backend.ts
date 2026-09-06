/**
 * Injectable native pdf-inspector backend (main IPC or node soft-load).
 * Keeps `@firecrawl/pdf-inspector` out of the renderer bundle.
 */

import type {
  NativePdfClassification,
  NativePdfInspectorExtraction,
  NativeExtractOptions
} from './native-pdf-inspector'

export interface MaktabNativePdfBackend {
  id: string
  isAvailable(): boolean | Promise<boolean>
  classify(buffer: ArrayBuffer): Promise<NativePdfClassification | null>
  extract(
    buffer: ArrayBuffer,
    options?: NativeExtractOptions
  ): Promise<NativePdfInspectorExtraction | null>
}

export const unavailableNativePdfBackend: MaktabNativePdfBackend = {
  id: 'unavailable',
  isAvailable: () => false,
  async classify() {
    return null
  },
  async extract() {
    return null
  }
}

let activeBackend: MaktabNativePdfBackend = unavailableNativePdfBackend

export function setMaktabNativePdfBackend(backend: MaktabNativePdfBackend): void {
  activeBackend = backend
}

export function getMaktabNativePdfBackend(): MaktabNativePdfBackend {
  return activeBackend
}

export function resetMaktabNativePdfBackend(): void {
  activeBackend = unavailableNativePdfBackend
}
