import { describe, expect, it } from 'vitest'
import {
  RAQIM_CANDIDATE_THRESHOLD,
  rankRaqimCandidate,
  textSimilarity
} from '../../src/engine/resolver/raqim-resolve'
import { sanitizeRaqimLookupRequest } from '../../src/shared/raqim-resolve-ipc'
import type { CslItem } from '../../src/engine/types'

const query: CslItem = {
  id: 'row-1',
  type: 'article-journal',
  title: 'Attention is all you need',
  author: [{ family: 'Vaswani', given: 'Ashish' }],
  issued: { 'date-parts': [[2017]] }
}

describe('Raqim candidate ranking', () => {
  it('ranks matching title, author, year, and type above a near miss', () => {
    const strong = rankRaqimCandidate(query, {
      provider: 'crossref',
      item: {
        ...query,
        id: 'candidate-1',
        DOI: '10.5555/3295222.3295349'
      }
    })
    const weak = rankRaqimCandidate(query, {
      provider: 'openalex',
      item: {
        id: 'candidate-2',
        type: 'report',
        title: 'Attention mechanisms for image recognition',
        author: [{ family: 'Other' }],
        issued: { 'date-parts': [[2024]] }
      }
    })

    expect(strong.confidence).toBeGreaterThan(weak.confidence)
    expect(strong.confidence).toBeGreaterThanOrEqual(RAQIM_CANDIDATE_THRESHOLD)
    expect(strong.matchedFields).toEqual(expect.arrayContaining(['title', 'author', 'year', 'type']))
    expect(weak.mismatchReasons).toEqual(expect.arrayContaining(['title', 'year', 'author', 'type']))
  })

  it('gives exact identifier resolution enough confidence for manual review', () => {
    const candidate = rankRaqimCandidate(query, {
      provider: 'datacite',
      exact: true,
      item: {
        id: 'dataset-1',
        type: 'dataset',
        title: 'A separately titled dataset',
        DOI: '10.5281/zenodo.123'
      }
    })

    expect(candidate.confidence).toBeGreaterThanOrEqual(RAQIM_CANDIDATE_THRESHOLD)
  })

  it('uses token overlap without punctuation sensitivity', () => {
    expect(textSimilarity('Gemma: Open Models', 'Gemma — open models!')).toBe(1)
  })
})

describe('Raqim lookup IPC sanitizer', () => {
  it('accepts and trims a supported lookup request', () => {
    const result = sanitizeRaqimLookupRequest({
      item: query,
      kind: 'doi',
      key: ' 10.5281/zenodo.123 '
    })
    expect(result?.kind).toBe('doi')
    expect(result?.key).toBe('10.5281/zenodo.123')
    expect(result?.item.id).toBe('row-1')
  })

  it('caps lookup keys and rejects malformed requests', () => {
    const result = sanitizeRaqimLookupRequest({
      item: query,
      kind: 'title',
      key: 'x'.repeat(600)
    })
    expect(result?.key).toHaveLength(500)
    expect(sanitizeRaqimLookupRequest({ item: query, kind: 'isbn', key: '123' })).toBeNull()
    expect(sanitizeRaqimLookupRequest({ item: {}, key: 'title' })).toBeNull()
    expect(sanitizeRaqimLookupRequest({ item: query, key: '   ' })).toBeNull()
  })
})
