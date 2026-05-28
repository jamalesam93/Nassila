import { describe, expect, it } from 'vitest'
import {
  extractPartialMeta,
  normalizeDoiFromMeta
} from '../../src/engine/resolver/url'

describe('normalizeDoiFromMeta', () => {
  it('strips doi: prefix from Highwire/dc identifiers', () => {
    expect(normalizeDoiFromMeta('doi:10.1093/ckj/sfae150')).toBe('10.1093/ckj/sfae150')
  })

  it('extracts from doi.org URLs', () => {
    expect(
      normalizeDoiFromMeta('https://doi.org/10.1093/ckj/sfae150')
    ).toBe('10.1093/ckj/sfae150')
  })

  it('accepts bare dois', () => {
    expect(normalizeDoiFromMeta('10.1093/ckj/sfae150')).toBe('10.1093/ckj/sfae150')
  })
})

describe('extractPartialMeta OUP-style HTML', () => {
  const oupHtml = `<!DOCTYPE html><html><head>
<meta name="citation_title" content="Using artificial intelligence to predict mortality in AKI patients"/>
<meta name="citation_doi" content="doi:10.1093/ckj/sfae150"/>
<meta name="citation_author" content="Raina, Rupesh"/>
<meta name="citation_journal_title" content="Clinical Kidney Journal"/>
<meta name="citation_volume" content="17"/>
<meta name="citation_issue" content="6"/>
<meta name="citation_firstpage" content="sfae150"/>
</head><body></body></html>`

  it('parses DOI with doi: prefix from citation_doi', () => {
    const m = extractPartialMeta(
      oupHtml,
      'https://academic.oup.com/ckj/article/17/6/sfae150/7676197'
    )
    expect(m?.DOI).toBe('10.1093/ckj/sfae150')
    expect(m?.['container-title']).toBe('Clinical Kidney Journal')
    expect(m?.volume).toBe('17')
    expect(m?.author?.length).toBeGreaterThan(0)
  })

  it('returns null for Cloudflare challenge markup', () => {
    const cf = `<!DOCTYPE html><html><head><title>Just a moment...</title><script>window._cf_chl_opt={};</script></head><body></body></html>`
    expect(extractPartialMeta(cf, 'https://example.com')).toBeNull()
  })

  it('parses doi on large docs that mention _cf artefacts (publisher HTML must not bail)', () => {
    const rgUrl =
      'https://www.researchgate.net/publication/390285389_Test_Title_With_Underscores'
    const pad = `${' '.repeat(80_000)}window._cf_chl_opt=function(){};/* noise */ `
    const html = `<html><head><title>Publication</title></head><body>${pad}"publicationUid":"390285389","doi":"10.1371/unit.test.rgmeta"</body></html>`
    const m = extractPartialMeta(html, rgUrl)
    expect(m?.DOI).toBe('10.1371/unit.test.rgmeta')
  })

  it('ResearchGate ignores misleading dc.identifier when anchored JSON has the real DOI', () => {
    const url = 'https://www.researchgate.net/publication/555444333_Main_Title'
    const html = `<html><head>
<meta name="dc.identifier" content="doi:10.1681/ASN.GLOBAL.BAD"/>
</head><body>{"uid":"555444333","doi":"10.9876/anchored.real.work"}</body></html>`
    const m = extractPartialMeta(html, url)
    expect(m?.DOI).toBe('10.9876/anchored.real.work')
  })
})
