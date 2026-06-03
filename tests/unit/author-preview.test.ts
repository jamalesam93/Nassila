import { describe, expect, it } from 'vitest'
import { authorPreviewLimits } from '../../src/renderer/utils/author-preview'

describe('authorPreviewLimits', () => {
  it('uses 6 authors before et al. for Vancouver', () => {
    expect(authorPreviewLimits('vancouver')).toEqual({ maxShown: 6, etAlThreshold: 7 })
  })

  it('defaults to 3 authors before et al.', () => {
    expect(authorPreviewLimits('apa')).toEqual({ maxShown: 3, etAlThreshold: 4 })
    expect(authorPreviewLimits(null)).toEqual({ maxShown: 3, etAlThreshold: 4 })
  })
})
