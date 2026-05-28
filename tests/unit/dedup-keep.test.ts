import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CslItem } from '../../src/engine/types'

beforeEach(() => {
  vi.resetModules()
})

describe('keepDuplicateCitation', () => {
  it('merges fields into keeper and removes sibling duplicate rows', async () => {
    const { useCitationStore } = await import('../../src/renderer/stores/citation-store')
    const store = useCitationStore.getState()

    const a: CslItem = {
      id: 'dup-a',
      type: 'article-journal',
      title: 'Shared Title',
      author: [{ family: 'Smith', given: 'A' }]
    }
    const b: CslItem = {
      id: 'dup-b',
      type: 'article-journal',
      title: 'Shared Title',
      DOI: '10.1000/merged',
      author: [{ family: 'Smith', given: 'A' }]
    }

    store.setCitations([a, b])
    store.refreshDuplicatesAndPredatory()

    expect(useCitationStore.getState().duplicates.length).toBeGreaterThan(0)

    store.keepDuplicateCitation('dup-a', 0)

    const after = useCitationStore.getState()
    expect(after.citations).toHaveLength(1)
    expect(after.citations[0]?.id).toBe('dup-a')
    expect(after.citations[0]?.DOI).toBe('10.1000/merged')
    expect(after.duplicates).toHaveLength(0)
  })
})
