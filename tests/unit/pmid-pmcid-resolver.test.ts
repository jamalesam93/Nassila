import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../src/engine/resolver/pubmed', () => ({
  resolvePmid: vi.fn(),
  resolvePmcid: vi.fn(),
  pmcidToPmid: vi.fn()
}))

import { resolvePmid, resolvePmcid } from '../../src/engine/resolver/pubmed'
import { cleanIdentifier, detectIdentifierType, resolveIdentifier } from '../../src/engine/resolver/index'
import type { CslItem } from '../../src/engine/types'

describe('PMID & PMCID Identifier Detection & Resolver', () => {
  beforeEach(() => {
    vi.mocked(resolvePmid).mockReset()
    vi.mocked(resolvePmcid).mockReset()
  })

  it('detects PMID in various user input formats', () => {
    expect(detectIdentifierType('35000000')).toBe('pmid')
    expect(detectIdentifierType('PMID: 35000000')).toBe('pmid')
    expect(detectIdentifierType('PMID 35000000')).toBe('pmid')
    expect(detectIdentifierType('pmid:35000000')).toBe('pmid')
    expect(detectIdentifierType('391234567')).toBe('pmid')
    expect(detectIdentifierType('https://pubmed.ncbi.nlm.nih.gov/35000000/')).toBe('pmid')
    expect(detectIdentifierType('http://www.ncbi.nlm.nih.gov/pubmed/35000000')).toBe('pmid')
  })

  it('detects PMCID in various user input formats', () => {
    expect(detectIdentifierType('PMC1234567')).toBe('pmcid')
    expect(detectIdentifierType('PMC 1234567')).toBe('pmcid')
    expect(detectIdentifierType('PMCID: 1234567')).toBe('pmcid')
    expect(detectIdentifierType('pmcid:PMC1234567')).toBe('pmcid')
    expect(detectIdentifierType('https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/')).toBe('pmcid')
    expect(detectIdentifierType('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/')).toBe('pmcid')
  })

  it('cleans PMID and PMCID strings into canonical API keys', () => {
    expect(cleanIdentifier('PMID: 35000000', 'pmid')).toBe('35000000')
    expect(cleanIdentifier('https://pubmed.ncbi.nlm.nih.gov/35000000/', 'pmid')).toBe('35000000')
    expect(cleanIdentifier('PMC 1234567', 'pmcid')).toBe('PMC1234567')
    expect(cleanIdentifier('PMCID: 1234567', 'pmcid')).toBe('PMC1234567')
    expect(cleanIdentifier('https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/', 'pmcid')).toBe('PMC1234567')
  })

  it('routes PMID and PMCID inputs to resolvePmid and resolvePmcid', async () => {
    vi.mocked(resolvePmid).mockResolvedValue({
      id: 'pmid-35000000',
      type: 'article-journal',
      title: 'Sample PubMed Article',
      PMID: '35000000'
    } as CslItem)

    vi.mocked(resolvePmcid).mockResolvedValue({
      id: 'pmid-35000000',
      type: 'article-journal',
      title: 'Sample PMC Article',
      PMID: '35000000',
      PMCID: 'PMC1234567'
    } as CslItem)

    const itemPmid = await resolveIdentifier('PMID: 35000000')
    expect(resolvePmid).toHaveBeenCalledWith('35000000')
    expect(itemPmid?.title).toBe('Sample PubMed Article')

    const itemPmcid = await resolveIdentifier('PMC 1234567')
    expect(resolvePmcid).toHaveBeenCalledWith('PMC1234567')
    expect(itemPmcid?.PMCID).toBe('PMC1234567')
  })
})
