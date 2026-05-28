import { describe, expect, it } from 'vitest'
import {
  citationMatchesSearch,
  matchesOutputFilter,
  isGrayLitType
} from '../../src/renderer/utils/output-filters'
import type { CslItem } from '../../src/engine/types'

const ITEM: CslItem = {
  id: 'a1',
  type: 'article-journal',
  title: 'Neural Networks in Medicine',
  author: [{ family: 'Lee', given: 'J' }]
}

describe('output-filters', () => {
  it('matches search on title and author', () => {
    expect(citationMatchesSearch(ITEM, 'neural')).toBe(true)
    expect(citationMatchesSearch(ITEM, 'lee')).toBe(true)
    expect(citationMatchesSearch(ITEM, 'zzzz')).toBe(false)
  })

  it('filters no-doi excluding gray literature', () => {
    const webpage: CslItem = { id: 'w1', type: 'webpage', title: 'Site' }
    const journal: CslItem = { ...ITEM, DOI: undefined }
    const ctx = {
      issues: [],
      citationStatuses: {},
      predatoryByCitation: {},
      duplicateGroupByCitation: {}
    }
    expect(isGrayLitType('webpage')).toBe(true)
    expect(matchesOutputFilter(webpage, 'no-doi', ctx)).toBe(false)
    expect(matchesOutputFilter(journal, 'no-doi', ctx)).toBe(true)
  })
})
