import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CslItem } from '../../src/engine/types'

vi.mock('../../src/engine/resolver/crossref', () => ({
  resolveDoi: vi.fn(),
  searchCrossRef: vi.fn()
}))

vi.mock('../../src/engine/resolver/datacite', () => ({
  isDataCiteDoi: vi.fn(() => false),
  resolveDataCiteDoi: vi.fn(),
  searchDataCite: vi.fn()
}))

import { resolveDoi } from '../../src/engine/resolver/crossref'
import { enhanceCitationsOnline } from '../../src/engine/autocorrect/enhance'

describe('enhanceCitationsOnline reclassifies webpage+DOI from Crossref type', () => {
  beforeEach(() => {
    vi.mocked(resolveDoi).mockResolvedValue({
      id: 'crossref-1',
      type: 'article-journal',
      DOI: '10.1186/s12909-025-07129-3',
      title: 'Registry title',
      'container-title': 'BMC Medical Education'
    } as CslItem)
  })

  it('sets article-journal when Crossref resolves a mis-tagged webpage with full metadata', async () => {
    const item: CslItem = {
      id: 'plain-0',
      type: 'webpage',
      DOI: '10.1186/s12909-025-07129-3',
      URL: 'https://link.springer.com/article/10.1186/s12909-025-07129-3',
      title: 'Local title',
      author: [{ family: 'Smith', given: 'J' }],
      publisher: 'BMC Med Educ'
    }

    const { enhanced, log } = await enhanceCitationsOnline([item])
    expect(enhanced[0]?.type).toBe('article-journal')
    expect(log.some((l) => l.field === 'type' && l.rule === 'reclassify-from-doi')).toBe(true)
  })
})
