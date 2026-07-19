import { describe, it, expect, vi } from 'vitest'
import { fullTextFromOaPdfBytes } from '@engine/manuscript/oa-pdf-grounding'

describe('fullTextFromOaPdfBytes', () => {
  it('returns full_text when Maktab extraction yields text', async () => {
    const extract = vi.fn().mockResolvedValue({
      text: 'Results showed significant improvement in outcomes.',
      pageCount: 4,
      warnings: [],
      tier: 'embedded_text',
      languages: ['eng'],
      needsReview: false
    })

    const result = await fullTextFromOaPdfBytes(new ArrayBuffer(16), 'https://example.org/paper.pdf', extract)

    expect(result).toEqual({
      kind: 'full_text',
      text: 'Results showed significant improvement in outcomes.',
      coverage: 'full_text_oa_unpaywall',
      snippetSource: 'unpaywall',
      url: 'https://example.org/paper.pdf',
      extractionTier: 'pdf_embedded_text'
    })
    expect(extract).toHaveBeenCalledWith(expect.any(ArrayBuffer), { mode: 'auto' })
  })

  it('returns null for empty buffer', async () => {
    const extract = vi.fn()
    expect(await fullTextFromOaPdfBytes(new ArrayBuffer(0), 'https://x', extract)).toBeNull()
    expect(extract).not.toHaveBeenCalled()
  })

  it('returns null when extraction yields no text', async () => {
    const extract = vi.fn().mockResolvedValue({
      text: '   ',
      pageCount: 1,
      warnings: [],
      tier: 'embedded_text',
      languages: ['eng'],
      needsReview: true
    })

    expect(await fullTextFromOaPdfBytes(new ArrayBuffer(8), 'https://x', extract)).toBeNull()
  })
})
