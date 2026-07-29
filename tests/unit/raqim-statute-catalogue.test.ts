import { describe, expect, it } from 'vitest'
import {
  lookupRaqimCandidates,
  parseEliLegislationUrl
} from '../../src/engine/resolver/raqim-resolve'
import {
  mergeSplitStatuteNumberLines,
  parseLegislationCatalogueUrl,
  parseUsPublicLawTitle,
  parseUkStatuteTitle
} from '../../src/engine/resolver/legislation-catalogue'
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

describe('US federal legislation catalogue', () => {
  it('parses congress.gov public law URLs', () => {
    const parsed = parseLegislationCatalogueUrl('https://www.congress.gov/public-law/117th-congress/58')
    expect(parsed?.provider).toBe('us_federal')
    expect(parsed?.number).toBe('117-58')
    expect(parsed?.canonicalUrl).toContain('congress.gov')
  })

  it('parses Public Law title queries', () => {
    const parsed = parseUsPublicLawTitle('Public Law 117-58')
    expect(parsed?.provider).toBe('us_federal')
    expect(parsed?.number).toBe('117-58')
  })

  it('parses uscode.house.gov section URLs', () => {
    const parsed = parseLegislationCatalogueUrl(
      'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1983'
    )
    expect(parsed?.provider).toBe('us_federal')
    expect(parsed?.title).toContain('42 U.S.C.')
  })
})

describe('UK legislation catalogue', () => {
  it('parses legislation.gov.uk ukpga URLs', () => {
    const parsed = parseLegislationCatalogueUrl('https://www.legislation.gov.uk/ukpga/2024/12')
    expect(parsed?.provider).toBe('uk_legislation')
    expect(parsed?.number).toBe('2024 No. 12')
    expect(parsed?.issuedYear).toBe(2024)
  })

  it('parses UK Act title queries', () => {
    const parsed = parseUkStatuteTitle('UK Act 2024 c. 12')
    expect(parsed?.provider).toBe('uk_legislation')
    expect(parsed?.canonicalUrl).toContain('/ukpga/2024/12')
  })
})

describe('statute line merge', () => {
  it('merges year and number split across lines', () => {
    const merged = mergeSplitStatuteNumberLines([
      'Regulation (EU) 2024',
      '/1689 on artificial intelligence',
      'Other reference'
    ])
    expect(merged[0]).toBe('Regulation (EU) 2024/1689 on artificial intelligence')
    expect(merged[1]).toBe('Other reference')
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

  it('URL lookup on UK legislation returns legislation candidate', async () => {
    const results = await lookupRaqimCandidates({
      item: { id: 'uk-1', type: 'legislation', title: 'Example Act' },
      key: 'https://www.legislation.gov.uk/ukpga/2024/12',
      kind: 'url'
    })
    expect(results[0]?.provider).toBe('uk_legislation')
    expect(results[0]?.item.type).toBe('legislation')
  })
})
