// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { buildFindingExplanation, buildSharhHeadline } from '../../src/renderer/utils/sharh-copy'
import type {
  FindingClaimBreakdown,
  SharhLiteSummary
} from '../../src/engine/manuscript/sharh-lite'

function makeT(pluralForms?: Record<string, string>): TFunction {
  return ((key: string, opts?: Record<string, unknown>) => {
    const plural =
      opts && typeof opts.count === 'number' ? (opts.count === 1 ? '_one' : '_other') : ''
    const resolved = pluralForms?.[`${key}${plural}`] ?? pluralForms?.[key] ?? key
    if (!opts) return resolved
    return Object.entries(opts).reduce(
      (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)),
      resolved as string
    )
  }) as unknown as TFunction
}

const en: Record<string, string> = {
  'sharhLite.headlineClaims': '{{supported}} of {{total}} audited claims supported',
  'sharhLite.headlineContradicted': '{{count}} contradicted',
  'sharhLite.headlineWeak': '{{count}} weakly supported',
  'sharhLite.headlineNotInSource': '{{count}} not found in source',
  'sharhLite.headlineInsufficient': '{{count}} with insufficient evidence',
  'sharhLite.headlineUnresolved_one': '{{count}} reference unresolved',
  'sharhLite.headlineUnresolved_other': '{{count}} references unresolved',
  'sharhLite.headlineUnmapped_one': '{{count}} citation unmapped',
  'sharhLite.headlineUnmapped_other': '{{count}} citations unmapped',
  'sharhLite.findingSupported': '{{count}} supported',
  'sharhLite.findingWeak': '{{count}} weakly supported',
  'sharhLite.findingContradicted': '{{count}} contradicted',
  'sharhLite.findingNotInSource': '{{count}} not found in source',
  'sharhLite.findingInsufficient': '{{count}} insufficient evidence',
  'sharhLite.findingQuoteMiss_one': '{{count}} quote not found',
  'sharhLite.findingQuoteMiss_other': '{{count}} quotes not found',
  'sharhLite.findingUnresolved': 'registry identity unresolved',
  'sharhLite.findingCoverage.abstract_only_closed': 'audited on abstract only',
  'sharhLite.findingCoverage.full_text_oa_unpaywall': 'full text from Unpaywall'
}

function baseSummary(overrides: Partial<SharhLiteSummary> = {}): SharhLiteSummary {
  return {
    supported: 2,
    weak: 0,
    contradicted: 1,
    notInSource: 0,
    insufficient: 0,
    unmappedCitations: 0,
    unresolvedIdentities: 0,
    invalidQuotes: 0,
    findingsReviewed: 1,
    coverageBreakdown: {
      full_text_oa_europe_pmc: 0,
      full_text_oa_unpaywall: 1,
      full_text_attached_pdf: 0,
      abstract_only_closed: 0,
      unavailable: 0
    },
    passageBuckets: { low: 0, medium: 1, high: 0 },
    claimBreakdownByFinding: [],
    sourceCoverageLimitations: [],
    nextActions: [],
    ...overrides
  }
}

function baseRow(overrides: Partial<FindingClaimBreakdown> = {}): FindingClaimBreakdown {
  return {
    bibKey: 'b1',
    supported: 2,
    weak: 0,
    contradicted: 1,
    notInSource: 0,
    insufficient: 0,
    invalidQuotes: 0,
    auditedClaims: 3,
    l3Coverage: 'full_text_oa_unpaywall',
    unresolvedIdentity: false,
    topRationale: [],
    ...overrides
  }
}

describe('sharh-copy builders', () => {
  it('builds a headline from claim verdicts and identity notes', () => {
    const t = makeT(en)
    const headline = buildSharhHeadline(t, baseSummary())
    expect(headline).toBe('2 of 3 audited claims supported; 1 contradicted')
  })

  it('adds unresolved and unmapped clauses when present', () => {
    const t = makeT(en)
    const headline = buildSharhHeadline(
      t,
      baseSummary({ supported: 0, contradicted: 0, unresolvedIdentities: 1, unmappedCitations: 2 })
    )
    expect(headline).toBe('1 reference unresolved; 2 citations unmapped')
  })

  it('returns null for a report with no grounded claims and no issues', () => {
    const t = makeT(en)
    expect(
      buildSharhHeadline(
        t,
        baseSummary({ supported: 0, weak: 0, contradicted: 0, notInSource: 0, insufficient: 0 })
      )
    ).toBeNull()
  })

  it('builds a per-finding explanation with localized coverage clause', () => {
    const t = makeT(en)
    const explanation = buildFindingExplanation(t, baseRow())
    expect(explanation).toBe('2 supported · 1 contradicted · full text from Unpaywall')
  })

  it('adds quote-miss and unresolved notes to a finding explanation', () => {
    const t = makeT(en)
    const explanation = buildFindingExplanation(
      t,
      baseRow({
        invalidQuotes: 1,
        unresolvedIdentity: true,
        l3Coverage: 'abstract_only_closed'
      })
    )
    expect(explanation).toBe('2 supported · 1 contradicted · 1 quote not found · registry identity unresolved · audited on abstract only')
  })

  it('handles plural forms for single vs multiple counts', () => {
    const t = makeT(en)
    expect(buildSharhHeadline(t, baseSummary({ unresolvedIdentities: 1, supported: 0, contradicted: 0 }))).toBe(
      '1 reference unresolved'
    )
    expect(
      buildSharhHeadline(t, baseSummary({ unresolvedIdentities: 3, supported: 0, contradicted: 0 }))
    ).toBe('3 references unresolved')
  })
})