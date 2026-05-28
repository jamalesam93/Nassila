import { describe, expect, it } from 'vitest'
import type { CslItem } from '../../src/engine/types'
import type { PredatoryList } from '../../src/shared/predatory'
import { checkPredatory } from '../../src/engine/predatory'

function list(overrides: Partial<PredatoryList> = {}): PredatoryList {
  return {
    version: 'test',
    sourceUrl: 'https://example.invalid',
    updatedAt: '2026-01-01T00:00:00Z',
    publishers: [],
    journals: [],
    ...overrides
  }
}

describe('checkPredatory', () => {
  it('flags ISSN match as predatory', () => {
    const L = list({
      journals: [{ name: 'Journal X', issn: ['1234-5678'], reason: 'test' }]
    })
    const item: CslItem = {
      id: 'a',
      type: 'article-journal',
      title: 'T',
      ISSN: '1234-5678'
    }
    const flags = checkPredatory([item], L)
    expect(flags).toHaveLength(1)
    expect(flags[0]!.tier).toBe('predatory')
    expect(flags[0]!.matchedOn).toBe('issn')
  })

  it('flags normalized journal title exact match', () => {
    const L = list({
      journals: [{ name: 'The Predatory Test Journal!', reason: 'test' }]
    })
    const item: CslItem = {
      id: 'b',
      type: 'article-journal',
      'container-title': 'predatory test journal'
    }
    const flags = checkPredatory([item], L)
    expect(flags).toHaveLength(1)
    expect(flags[0]!.matchedOn).toBe('name')
  })

  it('flags publisher-only list match as suspicious', () => {
    const L = list({
      publishers: [{ name: 'Bad Publisher LLC', reason: 'test' }]
    })
    const item: CslItem = {
      id: 'c',
      type: 'article-journal',
      publisher: 'Bad Publisher LLC'
    }
    const flags = checkPredatory([item], L)
    expect(flags).toHaveLength(1)
    expect(flags[0]!.tier).toBe('suspicious')
    expect(flags[0]!.matchedOn).toBe('publisher')
  })

  it('flags fuzzy journal title as suspicious when similarity is high', () => {
    const L = list({
      journals: [{ name: 'International Journal of Fuzzytestalpha', reason: 'test' }]
    })
    const item: CslItem = {
      id: 'd',
      type: 'article-journal',
      'container-title': 'International Journal of Fuzzytestalph'
    }
    const flags = checkPredatory([item], L)
    expect(flags.length).toBeGreaterThanOrEqual(1)
    expect(flags[0]!.matchedOn).toBe('fuzzy-name')
    expect(flags[0]!.tier).toBe('suspicious')
  })

  it('returns no flags for clean item', () => {
    const L = list({
      journals: [{ name: 'Totally Different Title', reason: 'test' }]
    })
    const item: CslItem = {
      id: 'e',
      type: 'article-journal',
      'container-title': 'Nature'
    }
    expect(checkPredatory([item], L)).toHaveLength(0)
  })
})
