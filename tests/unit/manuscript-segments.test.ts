import { describe, expect, it } from 'vitest'
import { findReferencesBoundary, segmentManuscriptText } from '../../src/engine/manuscript/segments'

describe('segmentManuscriptText', () => {
  it('splits on a References heading', () => {
    const text = `Body with a cite (Smith, 2020).

References
Smith J. Example paper. Journal. 2020.`
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Smith J.')
    expect(seg.bodyText).toContain('Body with')
  })

  it('splits on numbered bibliography without a heading (mid-list numbers)', () => {
    const text = `Introduction with a cite (Franke, 2024).

53. Franke M. Example title. Journal Name. 2024. https://doi.org/10.1234/example.1
54. Smith J. Another paper. Other Journal. 2023. https://doi.org/10.1234/example.2
55. Jones A. Third paper. Third Journal. 2022. https://doi.org/10.1234/example.3
56. Lee B. Fourth paper. Fourth Journal. 2021. https://doi.org/10.1234/example.4`
    const boundary = findReferencesBoundary(text)
    expect(boundary?.kind).toBe('numbered')
    const seg = segmentManuscriptText(text)
    expect(seg.referencesText).toContain('Franke M.')
    expect(seg.bodyText).toContain('Introduction')
    expect(seg.bodyText).not.toContain('Franke M.')
  })

  it('accepts References with trailing colon', () => {
    const text = `Body text.

References:
Doe J. Paper. 2021.`
    expect(findReferencesBoundary(text)?.kind).toBe('header')
  })
})
