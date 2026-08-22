import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/engine/network/http', () => ({
  fetchWithPolicy: vi.fn(),
  readJsonResponse: vi.fn(async (response: Response) => response.json())
}))

import { fetchWithPolicy } from '../../src/engine/network/http'
import {
  RAQIM_CANDIDATE_THRESHOLD,
  lookupRaqimCandidates,
  rankRaqimCandidate,
  textSimilarity
} from '../../src/engine/resolver/raqim-resolve'
import type { CslItem } from '../../src/engine/types'

const fetchMock = vi.mocked(fetchWithPolicy)

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

const paperRow: CslItem = {
  id: 'row-paper',
  type: 'article-journal',
  title: 'Attention is all you need',
  author: [{ family: 'Vaswani', given: 'Ashish' }],
  issued: { 'date-parts': [[2017]] }
}

function mockEmptyRegistries(): void {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('api.crossref.org')) {
      return jsonResponse({ message: { items: [] } })
    }
    if (url.includes('api.openalex.org')) {
      return jsonResponse({ results: [] })
    }
    if (url.includes('eutils.ncbi.nlm.nih.gov')) {
      return jsonResponse({ esearchresult: { idlist: [] } })
    }
    if (url.includes('api.datacite.org')) {
      return jsonResponse({ data: [] })
    }
    if (url.includes('huggingface.co/api/')) {
      return jsonResponse([])
    }
    return new Response('{}', { status: 404 })
  })
}

describe('Raqim URL/title lookup fallback (#20)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })
  afterEach(() => {
    fetchMock.mockReset()
  })

  it('searches registries for an unrecognized-host URL row instead of stopping at a grey-web stub', async () => {
    const landingUrl = 'https://journals.example.org/article/attention-transformers'
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('api.crossref.org')) {
        return jsonResponse({
          message: {
            items: [
              {
                DOI: '10.5555/attention.2017',
                type: 'journal-article',
                title: ['Attention is all you need'],
                author: [{ family: 'Vaswani', given: 'Ashish' }],
                'container-title': ['NeurIPS'],
                published: { 'date-parts': [[2017]] }
              }
            ]
          }
        })
      }
      return mockEmptyRegistriesResponse(url)
    })

    const candidates = await lookupRaqimCandidates({ item: paperRow, kind: 'url', key: landingUrl })

    const crossrefHit = candidates.find((candidate) => candidate.provider === 'crossref')
    expect(crossrefHit).toBeDefined()
    expect(crossrefHit?.item.DOI).toBe('10.5555/attention.2017')
    expect(crossrefHit?.confidence).toBeGreaterThanOrEqual(RAQIM_CANDIDATE_THRESHOLD)
    expect(candidates.some((candidate) => candidate.provider === 'grey_web')).toBe(false)
  })

  it('merges recognized-host results with registry title matches instead of suppressing them', async () => {
    const hfUrl = 'https://huggingface.co/QinEmPeRoR93/nassila-sanad-9b'
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'https://huggingface.co/api/models/QinEmPeRoR93/nassila-sanad-9b') {
        return jsonResponse({ id: 'QinEmPeRoR93/nassila-sanad-9b', author: 'QinEmPeRoR93' })
      }
      if (url.includes('api.crossref.org')) {
        return jsonResponse({
          message: {
            items: [
              {
                DOI: '10.5555/sanad.9b',
                type: 'journal-article',
                title: ['Attention is all you need'],
                author: [{ family: 'Vaswani', given: 'Ashish' }],
                published: { 'date-parts': [[2017]] }
              }
            ]
          }
        })
      }
      return mockEmptyRegistriesResponse(url)
    })

    const candidates = await lookupRaqimCandidates({ item: paperRow, kind: 'url', key: hfUrl })

    const providers = new Set(candidates.map((candidate) => candidate.provider))
    expect(providers.has('huggingface')).toBe(true)
    expect(providers.has('crossref')).toBe(true)
    const crossref = candidates.find((candidate) => candidate.provider === 'crossref')
    expect(crossref?.confidence).toBeGreaterThanOrEqual(RAQIM_CANDIDATE_THRESHOLD)
  })

  it('keeps the grey-web catalogue stub as a last resort for URL-only rows with no title', async () => {
    const urlOnlyRow: CslItem = { id: 'row-url', type: 'webpage' }
    mockEmptyRegistries()

    const candidates = await lookupRaqimCandidates({
      item: urlOnlyRow,
      kind: 'url',
      key: 'https://some-organization.example/report'
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0].provider).toBe('grey_web')
    expect(candidates[0].confidence).toBeGreaterThanOrEqual(RAQIM_CANDIDATE_THRESHOLD)
  })

  it('returns no candidates for a garbage title lookup even when registries reply', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('api.crossref.org')) {
        return jsonResponse({
          message: {
            items: [
              {
                DOI: '10.5555/unrelated.2020',
                type: 'journal-article',
                title: ['Completely different quantum chemistry research'],
                author: [{ family: 'Someone' }],
                published: { 'date-parts': [[2020]] }
              }
            ]
          }
        })
      }
      return mockEmptyRegistriesResponse(url)
    })

    const candidates = await lookupRaqimCandidates({
      item: paperRow,
      kind: 'title',
      key: 'zzz qqq xyzzy plugh'
    })

    expect(candidates).toHaveLength(0)
  })
})

describe('Raqim non-exact confidence rebalance (#20)', () => {
  it('lets moderate title similarity (~0.57) clear the candidate threshold', () => {
    const similarScore = textSimilarity(
      'Attention mechanisms transformer models',
      'Attention transformer architectures'
    )
    const candidate = rankRaqimCandidate(paperRow, {
      provider: 'openalex',
      item: {
        id: 'near-miss',
        type: 'article-journal',
        title: 'Attention transformer architectures'
      }
    })
    expect(similarScore).toBeGreaterThan(0.5)
    expect(candidate.confidence).toBeGreaterThanOrEqual(RAQIM_CANDIDATE_THRESHOLD)
  })

  it('still filters weak title similarity (~0.29) even with type alignment', () => {
    const weakScore = textSimilarity(
      'Attention mechanisms in transformers',
      'Attention is all you need'
    )
    const candidate = rankRaqimCandidate(paperRow, {
      provider: 'openalex',
      item: {
        id: 'weak-miss',
        type: 'report',
        title: 'Attention mechanisms in transformers'
      }
    })
    expect(weakScore).toBeLessThan(0.35)
    expect(candidate.confidence).toBeLessThan(RAQIM_CANDIDATE_THRESHOLD)
  })

  it('caps the non-exact base at 0.8 before field bonuses', () => {
    const bare = rankRaqimCandidate(paperRow, {
      provider: 'openalex',
      item: {
        id: 'twin',
        type: 'report',
        title: paperRow.title
      }
    })
    expect(bare.confidence).toBe(0.8)
  })
})

function mockEmptyRegistriesResponse(url: string): Response {
  if (url.includes('api.openalex.org')) {
    return jsonResponse({ results: [] })
  }
  if (url.includes('eutils.ncbi.nlm.nih.gov')) {
    return jsonResponse({ esearchresult: { idlist: [] } })
  }
  if (url.includes('api.datacite.org')) {
    return jsonResponse({ data: [] })
  }
  if (url.includes('huggingface.co/api/')) {
    return jsonResponse([])
  }
  return new Response('{}', { status: 404 })
}
