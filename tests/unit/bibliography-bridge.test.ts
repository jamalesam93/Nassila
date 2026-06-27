import { describe, expect, it } from 'vitest'
import {
  bibEntriesFromCitationLibrary,
  bibKeyFromManuscriptRefCitationId,
  cslItemsFromManuscriptBibEntries,
  isManuscriptRefCitationId,
  manuscriptRefCitationId,
  mergeManuscriptRefsIntoCitations
} from '../../src/engine/manuscript/bibliography-bridge'
import type { CslItem } from '../../src/engine/types'

describe('bibliography-bridge', () => {
  it('round-trips manuscript ref ids and bib keys', () => {
    expect(manuscriptRefCitationId('12')).toBe('manuscript-ref:12')
    expect(bibKeyFromManuscriptRefCitationId('manuscript-ref:12')).toBe('12')
    expect(isManuscriptRefCitationId('plain-0')).toBe(false)
  })

  it('maps bib entries to stable citation ids', () => {
    const items = cslItemsFromManuscriptBibEntries([
      { key: '3', raw: 'Smith J. Paper. 2020.', item: { id: 'plain-2', type: 'article', title: 'Paper' } }
    ])
    expect(items).toHaveLength(1)
    expect(items[0]!.id).toBe('manuscript-ref:3')
    expect(items[0]!.title).toBe('Paper')
  })

  it('replaces prior manuscript-ref rows on merge', () => {
    const existing: CslItem[] = [
      { id: 'manual-1', type: 'article', title: 'Kept' },
      { id: 'manuscript-ref:1', type: 'article', title: 'Old' }
    ]
    const incoming: CslItem[] = [{ id: 'manuscript-ref:1', type: 'article', title: 'New' }]
    const merged = mergeManuscriptRefsIntoCitations(existing, incoming)
    expect(merged.map((c) => c.title)).toEqual(['Kept', 'New'])
  })

  it('builds audit bib entries from the citation library', () => {
    const entries = bibEntriesFromCitationLibrary([
      { id: 'manuscript-ref:7', type: 'article', title: 'Seventh', DOI: '10.1234/seventh' },
      { id: 'other', type: 'article', title: 'Fallback index' }
    ])
    expect(entries[0]!.key).toBe('7')
    expect(entries[1]!.key).toBe('2')
    expect(entries[0]!.item?.title).toBe('Seventh')
  })
})
