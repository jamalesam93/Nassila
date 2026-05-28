import { describe, expect, it } from 'vitest'
import { extractDoiFromOxfordAcademicUrl } from '../../src/engine/resolver/url'

describe('extractDoiFromOxfordAcademicUrl', () => {
  it('derives 10.1093 DOI from standard article page', () => {
    expect(
      extractDoiFromOxfordAcademicUrl(
        'https://academic.oup.com/ckj/article/17/6/sfae150/7676197'
      )
    ).toBe('10.1093/ckj/sfae150')
  })

  it('derives same DOI from article-pdf path', () => {
    expect(
      extractDoiFromOxfordAcademicUrl(
        'https://academic.oup.com/ckj/article-pdf/17/6/sfae150/58709952'
      )
    ).toBe('10.1093/ckj/sfae150')
  })

  it('ignores non-OUP hosts', () => {
    expect(extractDoiFromOxfordAcademicUrl('https://www.nature.com/articles/s41586-020-2601-4')).toBeUndefined()
  })
})
