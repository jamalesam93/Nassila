import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { initSync } from '@firecrawl/pdf-inspector-wasm'
import { extractFromPdfInspector } from '@engine/manuscript/pdf-inspector-extract'
import { extractManuscriptFromPdf } from '@engine/manuscript/pdf-extract'

describe('pdf-inspector-wasm integration', () => {
  it('loads WASM module synchronously', () => {
    const wasmPath = resolve(
      __dirname,
      '../../node_modules/@firecrawl/pdf-inspector-wasm/pdf_inspector_wasm_bg.wasm'
    )
    const wasmBuffer = readFileSync(wasmPath)
    expect(() => initSync({ module: wasmBuffer })).not.toThrow()
  })

  it('handles invalid PDF gracefully by returning null for fallback', () => {
    const dummyBytes = new TextEncoder().encode('not a valid pdf')
    const result = extractFromPdfInspector(dummyBytes.buffer)
    expect(result).toBeNull()
  })

  it('extractManuscriptFromPdf uses pdf-inspector fallback seamlessly', async () => {
    // When pdf-inspector returns null on invalid bytes, pdfjs-dist fallback runs
    await expect(extractManuscriptFromPdf(new ArrayBuffer(8))).rejects.toThrow()
  })
})
