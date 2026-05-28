import { describe, it, expect } from 'vitest'
import { sortCitations } from '../../src/engine/sorter/index'
import type { CslItem } from '../../src/engine/types'

describe('sortCitations', () => {
  const items: CslItem[] = [
    { id: 'c', type: 'article-journal', author: [{ family: 'Charlie', given: 'C.' }], issued: { 'date-parts': [[2020]] } },
    { id: 'a', type: 'article-journal', author: [{ family: 'Alpha', given: 'A.' }], issued: { 'date-parts': [[2022]] } },
    { id: 'b', type: 'article-journal', author: [{ family: 'Bravo', given: 'B.' }], issued: { 'date-parts': [[2021]] } }
  ]

  it('sorts by author-date', () => {
    const sorted = sortCitations(items, 'author-date')
    expect(sorted[0].id).toBe('a')
    expect(sorted[1].id).toBe('b')
    expect(sorted[2].id).toBe('c')
  })

  it('sorts by date', () => {
    const sorted = sortCitations(items, 'date')
    expect(sorted[0].id).toBe('c')
    expect(sorted[1].id).toBe('b')
    expect(sorted[2].id).toBe('a')
  })

  it('sorts by title', () => {
    const itemsWithTitles: CslItem[] = [
      { id: 'z', type: 'article-journal', title: 'Zebra Studies' },
      { id: 'a', type: 'article-journal', title: 'Alpha Research' },
      { id: 'm', type: 'article-journal', title: 'Machine Learning' }
    ]
    const sorted = sortCitations(itemsWithTitles, 'title')
    expect(sorted[0].id).toBe('a')
    expect(sorted[1].id).toBe('m')
    expect(sorted[2].id).toBe('z')
  })

  it('preserves order for appearance mode', () => {
    const sorted = sortCitations(items, 'appearance')
    expect(sorted[0].id).toBe('c')
    expect(sorted[1].id).toBe('a')
    expect(sorted[2].id).toBe('b')
  })
})
