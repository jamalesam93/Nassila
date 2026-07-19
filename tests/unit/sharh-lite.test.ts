import { describe, expect, it } from 'vitest'
import {
  buildQualityLedgerEntry,
  buildSharhLiteSummary,
  evaluateSubmissionPreflight
} from '../../src/engine/manuscript/sharh-lite'
import type { AuditReport, CitationFinding } from '../../src/engine/manuscript/types'

function emptyFinding(overrides: Partial<CitationFinding> = {}): CitationFinding {
  return {
    bibKey: 'b1',
    inTextSpans: [],
    referenceIntegrityRisk: 'locator_ok',
    layers: {
      registry: { status: 'pass' },
      metadata: { status: 'pass' },
      passage: { status: 'pass' }
    },
    l3Coverage: 'full_text_oa_unpaywall',
    evidence: [],
    greyTags: [],
    userAction: { kind: 'none' },
    ...overrides
  }
}

function baseReport(findings: CitationFinding[]): AuditReport {
  return {
    manuscript: { wordCount: 10, sourceFormat: 'paste' },
    template: { id: 'imrad', name: 'IMRAD', strict: false },
    grounding: { enabled: true, modelId: 'x', checkpoint: 'S12', runner: 'lmstudio' },
    citationMapping: { matched: 1, ambiguous: 0, unmatched: 0 },
    findings,
    checklist: [],
    sources: [],
    generatedAt: new Date().toISOString(),
    appVersion: '1.3.0',
    promptContractVersion: 'sanad-grounding-v1',
    networkStatus: 'online'
  }
}

describe('sharh-lite + preflight', () => {
  it('summarizes claim verdicts and next actions', () => {
    const report = baseReport([
      emptyFinding({
        citeSites: [
          {
            inTextSpan: { start: 0, end: 1, raw: '1' },
            passageWindow: 'x',
            deterministicScore: 0.5,
            deterministicBucket: 'medium',
            matchedTermsSample: [],
            passageVerdict: { status: 'pass' },
            claimGrounding: [
              {
                claim: 'a',
                verdict: 'supported',
                quoteValidation: { status: 'found', checkedQuotes: 1, matchedQuotes: 1 }
              },
              {
                claim: 'b',
                verdict: 'contradicted',
                quoteValidation: { status: 'not_found', checkedQuotes: 1, matchedQuotes: 0 }
              }
            ]
          }
        ]
      })
    ])
    const summary = buildSharhLiteSummary(report)
    expect(summary.supported).toBe(1)
    expect(summary.contradicted).toBe(1)
    expect(summary.invalidQuotes).toBe(1)
    expect(summary.nextActions.some((a) => /contradicted/i.test(a))).toBe(true)
  })

  it('blocks preflight on unresolved identity', () => {
    const report = baseReport([
      emptyFinding({
        layers: {
          registry: { status: 'fail', reasons: ['bad'] },
          metadata: { status: 'pass' },
          passage: { status: 'skipped', reason: 'offline' }
        }
      })
    ])
    const gate = evaluateSubmissionPreflight(report)
    expect(gate.ok).toBe(false)
    expect(gate.blockers.length).toBeGreaterThan(0)
  })

  it('builds quality ledger without manuscript text', () => {
    const report = baseReport([emptyFinding()])
    const entry = buildQualityLedgerEntry(report, '1.3.0', 1200)
    expect(entry.appVersion).toBe('1.3.0')
    expect(entry.findingCount).toBe(1)
    expect(JSON.stringify(entry)).not.toMatch(/Hello|manuscript body/i)
  })
})
