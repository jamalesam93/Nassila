import { describe, it, expect, beforeEach } from 'vitest'
import {
  extractDocxWithAnydoc,
  isAnydocAvailable,
  resetAnydocLoadCache,
  tryLoadAnydoc
} from '@engine/maktab/anydoc-docx'
import { extractStructuredDocx } from '@engine/maktab/docx-extract'
import { buildDocxFixture } from '../fixtures/maktab-docx-builder'

describe('anydoc DOCX parity', () => {
  beforeEach(() => {
    resetAnydocLoadCache()
  })

  it('soft-load reports availability without throwing', () => {
    const mod = tryLoadAnydoc()
    expect(mod === null || typeof mod.toMarkdownBytes === 'function').toBe(true)
    expect(typeof isAnydocAvailable()).toBe('boolean')
  })

  it('extractDocxWithAnydoc skips cleanly when native binary unavailable', async () => {
    if (!isAnydocAvailable()) {
      expect(await extractDocxWithAnydoc(new ArrayBuffer(8))).toBeNull()
      return
    }

    // Package present — smoke convert a minimal DOCX fixture.
    const bytes = await buildDocxFixture([{ text: 'Anydoc parity paragraph.' }])
    const result = await extractDocxWithAnydoc(bytes)
    expect(result).not.toBeNull()
    expect(result!.text.length).toBeGreaterThan(0)
  })

  it('extractStructuredDocx engine=anydoc falls back to mammoth when missing', async () => {
    const bytes = await buildDocxFixture([{ text: 'Mammoth fallback paragraph.' }])
    if (!isAnydocAvailable()) {
      const result = await extractStructuredDocx(bytes, { engine: 'anydoc' })
      // Mammoth fallback still yields structured text.
      expect(result.text.length).toBeGreaterThan(0)
      expect(result.html.length).toBeGreaterThan(0)
      return
    }

    const result = await extractStructuredDocx(bytes, { engine: 'anydoc' })
    expect(result.text.length).toBeGreaterThan(0)
  })
})
