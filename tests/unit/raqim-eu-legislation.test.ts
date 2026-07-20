import { describe, expect, it } from 'vitest'
import {
  lookupRaqimCandidates,
  parseEliLegislationUrl
} from '../../src/engine/resolver/raqim-resolve'
import type { CslItem } from '../../src/engine/types'

const euAiAct: CslItem = {
  id: 'row-47',
  type: 'legislation',
  title: 'Regulation (EU) /1689 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act)',
  author: [{ literal: 'European Parliament and Council' }],
  publisher: 'Official Journal of the European Union',
  issued: { 'date-parts': [[2024]] }
}

describe('EU ELI legislation parsing', () => {
  it('parses data.europa.eu ELI regulation URLs', () => {
    const parsed = parseEliLegislationUrl('http://data.europa.eu/eli/reg/2024/1689/oj')
    expect(parsed).toEqual({
      actType: 'reg',
      year: '2024',
      number: '1689',
      canonicalUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj'
    })
  })
})

describe('Raqim EU legislation lookup (runtime)', () => {
  it('URL lookup on ELI should return legislation, not scholarly articles', async () => {
    const results = await lookupRaqimCandidates({
      item: euAiAct,
      key: 'http://data.europa.eu/eli/reg/2024/1689/oj',
      kind: 'url'
    })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('eli')
    expect(results[0].item.type).toBe('legislation')
    expect(results[0].item.number).toBe('2024/1689')
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.8)
  }, 30_000)

  it('title lookup should surface the EU regulation itself', async () => {
    const results = await lookupRaqimCandidates({
      item: euAiAct,
      key: 'Regulation (EU) 2024/1689',
      kind: 'title'
    })
    const legislation = results.find((r) => r.provider === 'eli')
    expect(legislation).toBeDefined()
    expect(legislation?.item.number).toBe('2024/1689')
    expect(legislation?.item.URL).toContain('eur-lex.europa.eu/eli/reg/2024/1689')
  }, 30_000)
})
