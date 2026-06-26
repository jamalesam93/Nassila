import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CslItem } from '../../src/engine/types'

const resolveIdentifier = vi.fn()
const resolveOpenAlexDoi = vi.fn()
const resolveOpenAlexPmid = vi.fn()
const resolvePubMedByDoi = vi.fn()
const resolvePmid = vi.fn()
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
  resolvePmid: (...args: unknown[]) => resolvePmid(...args)
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
})
