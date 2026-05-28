import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CslItem } from '../../src/engine/types'

const BASE_ITEM: CslItem = {
  id: 'base-item',
  type: 'article-journal',
  title: 'Baseline Article'
}

beforeEach(() => {
  vi.resetModules()
})

describe('citation store undo/redo', () => {
  it('recomputes derived state and clears stale mismatches on undo', async () => {
    const { useCitationStore } = await import('../../src/renderer/stores/citation-store')
    const store = useCitationStore.getState()

    store.setCitations([BASE_ITEM], 'batch-operation', 'Seed')
    store.setVerificationMismatches([
      {
        id: 'stale-mismatch',
        citationId: BASE_ITEM.id,
        field: 'title',
        userValue: 'Old',
        canonicalValue: 'New',
        source: 'crossref'
      }
    ])

    store.addCitations([
      {
        id: 'extra-item',
        type: 'article-journal',
        title: 'Second Article'
      }
    ])

    store.undo()

    const afterUndo = useCitationStore.getState()
    expect(afterUndo.citations).toHaveLength(1)
    expect(afterUndo.citations[0]?.id).toBe(BASE_ITEM.id)
    expect(afterUndo.verificationMismatches).toEqual([])
    expect(afterUndo.citationStatuses['extra-item']).toBeUndefined()
    expect(Object.keys(afterUndo.citationStatuses)).toEqual([BASE_ITEM.id])
  })

  it('deleteCitation removes only one row when multiple citations share an id', async () => {
    const { useCitationStore } = await import('../../src/renderer/stores/citation-store')

    useCitationStore.setState({
      citations: [
        { id: 'doi-10-1234-test', type: 'article-journal', title: 'First copy' },
        { id: 'doi-10-1234-test', type: 'article-journal', title: 'Second copy' }
      ]
    })

    useCitationStore.getState().deleteCitation('doi-10-1234-test', 1)

    const afterDelete = useCitationStore.getState()
    expect(afterDelete.citations).toHaveLength(1)
    expect(afterDelete.citations[0]?.title).toBe('First copy')
  })

  it('addCitations assigns unique ids when incoming items collide with existing ids', async () => {
    const { useCitationStore } = await import('../../src/renderer/stores/citation-store')
    const store = useCitationStore.getState()

    store.setCitations([{ id: 'shared-id', type: 'article-journal', title: 'Original' }])
    store.addCitations([{ id: 'shared-id', type: 'article-journal', title: 'Incoming duplicate id' }])

    const ids = useCitationStore.getState().citations.map((c) => c.id)
    expect(ids).toEqual(['shared-id', 'shared-id-2'])
  })

  it('refreshDerivedCitationState flags bundled predatory test journal after updateCitation', async () => {
    const { useCitationStore } = await import('../../src/renderer/stores/citation-store')
    const store = useCitationStore.getState()

    store.clearCitations()
    store.addCitations([
      {
        id: 'pred-row',
        type: 'article-journal',
        title: 'Article',
        'container-title': 'Omics Journal of Testpred'
      }
    ])

    store.updateCitation('pred-row', { title: 'Article (edited)' })

    const after = useCitationStore.getState()
    expect(after.predatoryFlags.some((f) => f.citationId === 'pred-row')).toBe(true)

    store.deleteCitation('pred-row', 0)
    expect(useCitationStore.getState().predatoryFlags.some((f) => f.citationId === 'pred-row')).toBe(false)
  })
})
