/** Shared PDF buffer caps for Maktab OCR / native inspector IPC (SEC-01). */

export const MAKTAB_MAX_PDF_BYTES = 12 * 1024 * 1024

export function bufferFromMaktabPdfPayload(raw: unknown): ArrayBuffer | null {
  if (raw instanceof ArrayBuffer) return raw
  if (ArrayBuffer.isView(raw)) {
    const view = raw as ArrayBufferView
    if (!(view.buffer instanceof ArrayBuffer)) return null
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
  }
  return null
}

export function assertMaktabPdfBuffer(
  raw: unknown,
  label: string
): ArrayBuffer {
  const buffer = bufferFromMaktabPdfPayload(raw)
  if (!buffer || buffer.byteLength === 0 || buffer.byteLength > MAKTAB_MAX_PDF_BYTES) {
    throw new Error(`Invalid PDF buffer for ${label}`)
  }
  return buffer
}

export function clampMaktabDpi(
  raw: unknown,
  min: number,
  max: number,
  fallback?: number
): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback
  return Math.min(max, Math.max(min, raw))
}
