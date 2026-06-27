import { describe, expect, it } from 'vitest'
import { previewManuscript } from '../../src/renderer/utils/manuscript-preview'

describe('previewManuscript bibliography bridge', () => {
  const body = `Introduction with cite [1] and another [2].`
  const refs = `[1] First A. Journal. 2020. https://doi.org/10.1234/a
[2] Second B. Journal. 2021. https://doi.org/10.1234/b
[3] Third C. Journal. 2022. https://doi.org/10.1234/c`
  const text = `${body}\n\nReferences\n${refs}`

  it('requires embedded references by default', () => {
    const noRefs = previewManuscript('Body only [1].')
    expect(noRefs.ok).toBe(false)
    if (!noRefs.ok) expect(noRefs.reason).toBe('no_references')
  })

  it('accepts embedded references', () => {
    const preview = previewManuscript(text)
    expect(preview.ok).toBe(true)
    if (preview.ok) expect(preview.referenceSource).toBe('embedded')
  })

  it('allows bibliography source when library has rows and body has cites', () => {
    const bodyOnly = previewManuscript(body, { auditReferenceSource: 'bibliography', bibliographyCount: 3 })
    expect(bodyOnly.ok).toBe(true)
    if (bodyOnly.ok) expect(bodyOnly.referenceSource).toBe('bibliography')

    const noCites = previewManuscript('Body without cites.', {
      auditReferenceSource: 'bibliography',
      bibliographyCount: 3
    })
    expect(noCites.ok).toBe(false)
    if (!noCites.ok) expect(noCites.reason).toBe('no_intext_cites')
  })
})
