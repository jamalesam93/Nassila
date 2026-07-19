import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CslItem } from '../../src/engine/types'

const resolveDoi = vi.fn()
const resolvePmid = vi.fn()
const pmcidToPmid = vi.fn()

vi.mock('../../src/engine/resolver/crossref', () => ({
  resolveDoi: (...args: unknown[]) => resolveDoi(...args),
  searchCrossRef: vi.fn().mockResolvedValue([])
}))

vi.mock('../../src/engine/resolver/datacite', () => ({
  isDataCiteDoi: vi.fn(() => false),
  resolveDataCiteDoi: vi.fn(),
  searchDataCite: vi.fn().mockResolvedValue([])
}))

vi.mock('../../src/engine/resolver/openalex', () => ({
  searchOpenAlex: vi.fn().mockResolvedValue([])
}))

vi.mock('../../src/engine/resolver/pubmed', () => ({
  resolvePmid: (...args: unknown[]) => resolvePmid(...args),
  pmcidToPmid: (...args: unknown[]) => pmcidToPmid(...args),
  findDoiByTitle: vi.fn().mockResolvedValue(null)
}))

vi.mock('../../src/engine/resolver/url', () => ({
  fetchUrlMetadata: vi.fn().mockResolvedValue(null),
  extractDoiFromOxfordAcademicUrl: vi.fn(),
  extractSiteName: vi.fn(),
  titleHintFromResearchGateUrl: vi.fn()
}))

import { enhanceCitationsOnline } from '../../src/engine/autocorrect/enhance'

describe('Raqim registry repair identity guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reclassifies a DOI-resolved Crossref book-chapter and fills LNCS volume', async () => {
    resolveDoi.mockResolvedValue({
      id: 'crossref-chapter',
      type: 'chapter',
      title: 'Calibrating Noise to Sensitivity in Private Data Analysis',
      DOI: '10.1007/11681878_14',
      'container-title': 'Theory of Cryptography',
      volume: '3876',
      publisher: 'Springer'
    } satisfies CslItem)

    const input: CslItem = {
      id: 'dwork',
      type: 'article-journal',
      title: 'Calibrating Noise to Sensitivity in Private Data Analysis',
      DOI: '10.1007/11681878_14',
      URL: 'https://link.springer.com/chapter/10.1007/11681878_14'
    }
    const { enhanced } = await enhanceCitationsOnline([input])

    expect(enhanced[0]).toMatchObject({
      type: 'chapter',
      volume: '3876',
      'container-title': 'Theory of Cryptography'
    })
  })

  it('repairs implausible DeLong title and authors from an explicit PMCID/PMID path', async () => {
    pmcidToPmid.mockResolvedValue('3203132')
    resolvePmid.mockResolvedValue({
      id: 'pmid-3203132',
      type: 'article-journal',
      title: 'Comparing the areas under two or more correlated receiver operating characteristic curves: a nonparametric approach',
      author: [
        { family: 'DeLong', given: 'E R' },
        { family: 'DeLong', given: 'D M' },
        { family: 'Clarke-Pearson', given: 'D L' }
      ],
      PMID: '3203132',
      volume: '44',
      page: '837-845'
    } satisfies CslItem)

    const input: CslItem = {
      id: 'delong',
      type: 'article-journal',
      title: 'R., et al',
      author: [{ given: 'Comparing the areas under two or more correlated curves', family: 'analysis' }],
      PMCID: 'PMC12919426'
    }
    const { enhanced } = await enhanceCitationsOnline([input])

    expect(enhanced[0]?.title).toMatch(/^Comparing the areas/i)
    expect(enhanced[0]?.author?.[0]?.family).toBe('DeLong')
  })

  it('applies no registry metadata when DOI and plausible title conflict', async () => {
    resolveDoi.mockResolvedValue({
      id: 'wrong-nature-record',
      type: 'article-journal',
      title: 'Different registry title',
      author: [{ family: 'Different', given: 'A' }],
      DOI: '10.1038/s41598-024-00001-1',
      volume: '14',
      page: '999'
    } satisfies CslItem)

    const input: CslItem = {
      id: 'nature-conflict',
      type: 'article-journal',
      title: 'User-supplied npj article title',
      author: [{ family: 'Local', given: 'A' }],
      DOI: '10.1038/s41598-024-00001-1'
    }
    const { enhanced, log } = await enhanceCitationsOnline([input])

    expect(enhanced[0]).toBe(input)
    expect(log).toEqual([])
  })
})
