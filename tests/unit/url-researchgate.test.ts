import { describe, expect, it } from 'vitest'
import {
  titleHintFromResearchGateUrl,
  tryResearchGateDoiFromHtml
} from '../../src/engine/resolver/url'

describe('ResearchGate URL helpers', () => {
  it('extracts title hint from publication URL slug', () => {
    expect(
      titleHintFromResearchGateUrl(
        'https://www.researchgate.net/publication/375381178_A_systematic_review_of_artificial_intelligence_algorithms_for_predicting_acute_kidney_injury'
      )
    ).toMatch(/systematic review.*acute kidney injury/i)
  })

  it('pulls DOI from JSON-ish fragments when meta tags are absent', () => {
    const html = '{"@type":"ScholarlyArticle","doi":"10.1234/xyz.2024.001"}'
    expect(tryResearchGateDoiFromHtml(html)).toBe('10.1234/xyz.2024.001')
    expect(
      tryResearchGateDoiFromHtml(
        '<div data-doi="10.3389/fmed.2024.1459170" class="x">'
      )
    ).toBe('10.3389/fmed.2024.1459170')
  })

  it('anchors DOI to publication id instead of grabbing an unrelated doi first', () => {
    const url =
      'https://www.researchgate.net/publication/999888777_Post_About_ML_AKI_Classification'
    const wrongLead = '{"doi":"10.1681/ASN.WRONG.BAD"},' + 'x'.repeat(25_000)
    const anchored = `"publicationUID":"999888777","x":{"doi":"10.9876/correct.article.id"}`
    const html = `<html><body>${wrongLead}${anchored}</body></html>`
    expect(tryResearchGateDoiFromHtml(html, url)).toBe('10.9876/correct.article.id')
  })

  it('scans full HTML for publication id (id may appear after a large script prelude)', () => {
    const url = 'https://www.researchgate.net/publication/888999000_Late_Json'
    const prelude = 'y'.repeat(450_000)
    const json = `, "publicationUID":"888999000", "link":"https://doi.org/10.7765/unit.late.doi"`
    expect(tryResearchGateDoiFromHtml(prelude + json, url)).toBe('10.7765/unit.late.doi')
  })
})
