import { describe, expect, it } from 'vitest'
import {
  MAKTAB_MAX_PDF_BYTES,
  assertMaktabPdfBuffer,
  bufferFromMaktabPdfPayload,
  clampMaktabDpi
} from '../../src/main/maktab/pdf-buffer-sanitize'

describe('maktab PDF buffer sanitize (native + OCR IPC)', () => {
  it('accepts ArrayBuffer and TypedArray views within the size cap', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const fromView = bufferFromMaktabPdfPayload(bytes)
    expect(fromView).toBeInstanceOf(ArrayBuffer)
    expect(fromView!.byteLength).toBe(4)

    const ok = assertMaktabPdfBuffer(bytes, 'native classify')
    expect(ok.byteLength).toBe(4)
  })

  it('rejects empty, oversized, and non-buffer payloads', () => {
    expect(() => assertMaktabPdfBuffer(new Uint8Array(0), 'OCR')).toThrow(/Invalid PDF buffer/)
    expect(() => assertMaktabPdfBuffer(new Uint8Array(MAKTAB_MAX_PDF_BYTES + 1), 'native extract')).toThrow(
      /Invalid PDF buffer/
    )
    expect(() => assertMaktabPdfBuffer('not-a-buffer', 'OCR')).toThrow(/Invalid PDF buffer/)
    expect(() => assertMaktabPdfBuffer(null, 'native classify')).toThrow(/Invalid PDF buffer/)
  })

  it('clamps DPI for native extract and OCR ranges', () => {
    expect(clampMaktabDpi(50, 72, 400)).toBe(72)
    expect(clampMaktabDpi(900, 72, 400)).toBe(400)
    expect(clampMaktabDpi(200, 72, 400)).toBe(200)
    expect(clampMaktabDpi(undefined, 150, 400, 300)).toBe(300)
    expect(clampMaktabDpi('x', 150, 400)).toBeUndefined()
  })
})
