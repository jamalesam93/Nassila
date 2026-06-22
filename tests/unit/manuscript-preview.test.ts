import { describe, expect, it } from 'vitest'
import { previewManuscript } from '../../src/renderer/utils/manuscript-preview'

describe('manuscript-preview', () => {
  it('returns empty for blank input', () => {
    expect(previewManuscript('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('requires a references section', () => {
    const body = 'Introduction only. No bibliography here.'
    expect(previewManuscript(body)).toEqual({ ok: false, reason: 'no_references' })
  })

  it('counts in-text citations when references exist', () => {
    const text = `Body with a cite (Smith, 2020).

References
Smith J. Example paper. Journal. 2020.`
    const out = previewManuscript(text)
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.inTextCitationCount).toBeGreaterThanOrEqual(1)
      expect(out.wordCount).toBeGreaterThan(0)
    }
  })
})
