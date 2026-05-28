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

vi.mock('../../src/engine/resolver/pubmed', () => ({
  resolvePmid: vi.fn(),
  findDoiByTitle: vi.fn()
}))

vi.mock('../../src/engine/resolver/url', () => ({
  fetchUrlMetadata: vi.fn(),
  extractSiteName: vi.fn()
}))

import { resolvePmid } from '../../src/engine/resolver/pubmed'
import { enhanceCitationsOnline } from '../../src/engine/autocorrect/enhance'

describe('enhanceCitationsOnline PubMed URL fill', () => {
  beforeEach(() => {
    vi.mocked(resolvePmid).mockResolvedValue({
      id: 'pmid-39534223',
      type: 'article-journal',
      title: 'Drug-induced acute kidney injury: a cohort study on incidence, identification of pathophysiological mechanisms, and prognostic factors',
      author: [
        { family: 'Garcia', given: 'G' },
        { family: 'Pacchini', given: 'VR' }
      ],
      'container-title': 'Frontiers in Medicine',
      DOI: '10.3389/fmed.2024.1459170',
      PMID: '39534223'
    } as CslItem)
  })

  it('resolves PMID from URL and replaces implausible parsed authors', async () => {
    const item: CslItem = {
      id: 'plain-0',
      type: 'webpage',
      URL: 'https://pubmed.ncbi.nlm.nih.gov/39534223/',
      title: 'Front Med (Lausanne)',
      author: [
        { given: 'Drug-induced acute kidney injury: a cohort study on', family: 'incidence' }
      ]
    }

    const { enhanced, log } = await enhanceCitationsOnline([item])
    expect(resolvePmid).toHaveBeenCalledWith('39534223')
    expect(enhanced[0]?.type).toBe('article-journal')
    expect(enhanced[0]?.author?.length).toBeGreaterThanOrEqual(2)
    expect(enhanced[0]?.title).toMatch(/Drug-induced acute kidney injury/i)
    expect(log.some((l) => l.rule === 'reclassify-from-pubmed' || l.rule === 'pubmed-fill')).toBe(true)
  })
})
