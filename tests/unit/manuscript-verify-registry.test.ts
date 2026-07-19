import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CslItem } from '../../src/engine/types'

const resolveIdentifier = vi.fn()
const resolveOpenAlexDoi = vi.fn()
const resolveOpenAlexPmid = vi.fn()
const resolvePubMedByDoi = vi.fn()
const resolvePmid = vi.fn()
const pmcidToPmid = vi.fn()
const isDataCiteDoi = vi.fn()
const resolveDataCiteDoi = vi.fn()
const searchOpenAlex = vi.fn()

vi.mock('../../src/engine/resolver', () => ({
  resolveIdentifier: (...args: unknown[]) => resolveIdentifier(...args)
}))

vi.mock('../../src/engine/resolver/openalex', () => ({
  resolveOpenAlexDoi: (...args: unknown[]) => resolveOpenAlexDoi(...args),
  resolveOpenAlexPmid: (...args: unknown[]) => resolveOpenAlexPmid(...args),
  searchOpenAlex: (...args: unknown[]) => searchOpenAlex(...args)
}))

vi.mock('../../src/engine/resolver/pubmed', () => ({
  resolvePubMedByDoi: (...args: unknown[]) => resolvePubMedByDoi(...args),
  resolvePmid: (...args: unknown[]) => resolvePmid(...args),
  pmcidToPmid: (...args: unknown[]) => pmcidToPmid(...args)
}))

vi.mock('../../src/engine/resolver/datacite', () => ({
  isDataCiteDoi: (...args: unknown[]) => isDataCiteDoi(...args),
  resolveDataCiteDoi: (...args: unknown[]) => resolveDataCiteDoi(...args)
}))

vi.mock('../../src/engine/resolver/crossref', () => ({
  searchCrossRef: vi.fn().mockResolvedValue([])
}))

import { resolveRegistry } from '../../src/engine/manuscript/verify'

function item(partial: Partial<CslItem> & { id: string }): CslItem {
  return {
    type: 'article-journal',
    id: partial.id,
    title: partial.title ?? 'Example study',
    ...partial
  }
}

describe('resolveRegistry multi-registry fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchOpenAlex.mockResolvedValue([])
    isDataCiteDoi.mockReturnValue(false)
  })

  it('falls back from Crossref miss to OpenAlex DOI lookup', async () => {
    resolveIdentifier.mockResolvedValue(null)
    resolveOpenAlexDoi.mockResolvedValue(item({ id: 'oa-1', DOI: '10.1234/oa' }))

    const result = await resolveRegistry(item({ id: 'u1', DOI: '10.1234/oa' }))

    expect(result.l1.status).toBe('pass')
    expect(result.source).toBe('openalex')
    expect(resolveOpenAlexDoi).toHaveBeenCalledWith('10.1234/oa')
  })

  it('falls back from Crossref and OpenAlex miss to PubMed DOI lookup', async () => {
    resolveIdentifier.mockResolvedValue(null)
    resolveOpenAlexDoi.mockResolvedValue(null)
    resolvePubMedByDoi.mockResolvedValue(item({ id: 'pm-1', DOI: '10.1234/pm', PMID: '12345678' }))

    const result = await resolveRegistry(item({ id: 'u2', DOI: '10.1234/pm' }))

    expect(result.l1.status).toBe('pass')
    expect(result.source).toBe('pubmed')
    expect(resolvePubMedByDoi).toHaveBeenCalledWith('10.1234/pm')
  })

  it('tries PMID when DOI resolution fails but PMID is present', async () => {
    resolveIdentifier.mockResolvedValue(null)
    resolveOpenAlexDoi.mockResolvedValue(null)
    resolvePubMedByDoi.mockResolvedValue(null)
    resolvePmid.mockResolvedValue(item({ id: 'pm-2', PMID: '87654321' }))

    const result = await resolveRegistry(item({ id: 'u3', DOI: '10.bad/doi', PMID: '87654321' }))

    expect(result.l1.status).toBe('pass')
    expect(result.source).toBe('pubmed')
    expect(resolvePmid).toHaveBeenCalled()
  })

  it('falls back from PubMed miss to OpenAlex PMID lookup', async () => {
    resolvePmid.mockResolvedValue(null)
    resolveOpenAlexPmid.mockResolvedValue(item({ id: 'oa-pm', PMID: '11223344' }))

    const result = await resolveRegistry(item({ id: 'u4', PMID: '11223344' }))

    expect(result.l1.status).toBe('pass')
    expect(result.source).toBe('openalex')
    expect(resolveOpenAlexPmid).toHaveBeenCalledWith('11223344')
  })

  it('maps PMCID to PMID and resolves PubMed in L1', async () => {
    pmcidToPmid.mockResolvedValue('41680725')
    resolvePmid.mockResolvedValue(item({
      id: 'pmc-pubmed',
      PMID: '41680725',
      title: 'Canonical PubMed title for PMC12919426'
    }))

    const result = await resolveRegistry(item({
      id: 'pmc-only',
      PMCID: 'PMC12919426',
      URL: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12919426/'
    }))

    expect(result).toMatchObject({ source: 'pubmed', l1: { status: 'pass' } })
    expect(pmcidToPmid).toHaveBeenCalledWith('PMC12919426')
    expect(resolvePmid).toHaveBeenCalledWith('41680725')
  })

  it('uses DataCite for arXiv DOI without upgrading preprint identity', async () => {
    isDataCiteDoi.mockReturnValue(true)
    resolveDataCiteDoi.mockResolvedValue(item({
      id: 'datacite-arxiv',
      type: 'article',
      DOI: '10.48550/arXiv.2507.19530',
      version: 'v2',
      genre: 'Preprint'
    }))

    const result = await resolveRegistry(item({
      id: 'arxiv',
      type: 'article',
      DOI: '10.48550/arXiv.2507.19530',
      version: 'v2',
      genre: 'Preprint'
    }))

    expect(result.source).toBe('datacite')
    expect(result.canonical).toMatchObject({
      type: 'article',
      DOI: '10.48550/arXiv.2507.19530',
      version: 'v2'
    })
    expect(resolveIdentifier).not.toHaveBeenCalled()
  })
})
