import { describe, it, expect } from 'vitest'
import { findDuplicates, computeSimilarity, mergeItems } from '../../src/engine/dedup/index'
import type { CslItem } from '../../src/engine/types'

describe('dedup', () => {
  it('detects duplicates by DOI', () => {
    const items: CslItem[] = [
      { id: 'a', type: 'article-journal', title: 'Test Article', DOI: '10.1234/test' },
      { id: 'b', type: 'article-journal', title: 'Test Article', DOI: '10.1234/test' }
    ]
    const groups = findDuplicates(items)
    expect(groups.length).toBe(1)
    expect(groups[0].items.length).toBe(2)
  })

  it('detects duplicates by similar title', () => {
    const items: CslItem[] = [
      { id: 'a', type: 'article-journal', title: 'A Study of Machine Learning Methods' },
      { id: 'b', type: 'article-journal', title: 'A Study of Machine Learning Methods in 2024' },
      { id: 'c', type: 'article-journal', title: 'Something Completely Different' }
    ]
    const sim = computeSimilarity(items[0], items[1])
    expect(sim).toBeGreaterThan(0.6)

    const simDiff = computeSimilarity(items[0], items[2])
    expect(simDiff).toBeLessThan(0.5)
  })

  it('merges items keeping most complete record', () => {
    const items: CslItem[] = [
      { id: 'a', type: 'article-journal', title: 'Test', DOI: '10.1234/test' },
      { id: 'b', type: 'article-journal', title: 'Test', volume: '45', page: '112-128' }
    ]
    const merged = mergeItems(items)
    expect(merged.DOI).toBe('10.1234/test')
    expect(merged.volume).toBe('45')
    expect(merged.page).toBe('112-128')
  })
})
