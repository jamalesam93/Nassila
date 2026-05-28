import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../src/engine/network/http', () => ({
  fetchWithPolicy: vi.fn(),
  readJsonResponse: vi.fn(async (response: Response) => response.json())
}))

import { fetchWithPolicy } from '../../src/engine/network/http'
import { resolvePmid, pmcidToPmid } from '../../src/engine/resolver/pubmed'

const fetchMock = vi.mocked(fetchWithPolicy)

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('resolvePmid DOI extraction', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })
  afterEach(() => {
    fetchMock.mockReset()
  })

  it('reads DOI from articleids array (typical esummary response)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      result: {
        '39534223': {
          uid: '39534223',
          title: 'Drug-induced acute kidney injury',
          authors: [{ name: 'Garcia G', authtype: 'Author' }],
          source: 'Front Med (Lausanne)',
          fulljournalname: 'Frontiers in Medicine',
          volume: '11',
          issue: '',
          pages: '1459170',
          pubdate: '2024 Oct 29',
          sortpubdate: '2024/10/29 00:00',
          articleids: [
            { idtype: 'pubmed', value: '39534223' },
            { idtype: 'doi', value: '10.3389/fmed.2024.1459170' },
            { idtype: 'pmc', value: 'PMC11554514' }
          ]
        }
      }
    }))

    const item = await resolvePmid('39534223')
    expect(item?.DOI).toBe('10.3389/fmed.2024.1459170')
    expect(item?.PMCID).toBe('PMC11554514')
    expect(item?.issued?.['date-parts']?.[0]?.[0]).toBe(2024)
  })

  it('falls back to elocationid when articleids has no doi entry', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      result: {
        '12345': {
          uid: '12345',
          title: 'Title',
          authors: [],
          source: 'J',
          fulljournalname: 'J',
          volume: '1',
          issue: '',
          pages: '',
          pubdate: '2020',
          sortpubdate: '2020/01/01 00:00',
          elocationid: 'doi: 10.1000/test.2020.001'
        }
      }
    }))

    const item = await resolvePmid('12345')
    expect(item?.DOI).toBe('10.1000/test.2020.001')
  })
})

describe('pmcidToPmid', () => {
  beforeEach(() => fetchMock.mockReset())
  afterEach(() => fetchMock.mockReset())

  it('returns PMID from elink response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      linksets: [
        {
          dbfrom: 'pmc',
          ids: ['9435983'],
          linksetdbs: [{ dbto: 'pubmed', linkname: 'pmc_pubmed', links: ['36103253'] }]
        }
      ]
    }))
    expect(await pmcidToPmid('PMC9435983')).toBe('36103253')
  })

  it('returns null when elink has no linkset', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ linksets: [{ linksetdbs: [] }] }))
    expect(await pmcidToPmid('PMC9999999999')).toBeNull()
  })

  it('rejects non-numeric PMCIDs', async () => {
    expect(await pmcidToPmid('PMCfoo')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
