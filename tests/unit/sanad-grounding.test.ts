import { describe, expect, it } from 'vitest'
import {
  applySanadClaimGuardrails,
  claimVerdictI18nKey,
  layerVerdictI18nKey
} from '../../src/renderer/utils/sanad-grounding'
import { passageVerdictFromGroundingClaims } from '../../src/engine/manuscript/grounding-llm'

describe('sanad-grounding helpers', () => {
  it('maps claim verdicts to i18n keys', () => {
    expect(claimVerdictI18nKey('supported')).toBe('sanad.claimVerdict.supported')
    expect(claimVerdictI18nKey('contradicted')).toBe('sanad.claimVerdict.contradicted')
  })

  it('maps layer verdicts to i18n keys', () => {
    expect(layerVerdictI18nKey({ status: 'pass' })).toBe('sanad.verdict.pass')
    expect(layerVerdictI18nKey({ status: 'fail', reasons: ['x'] })).toBe('sanad.verdict.fail')
    expect(layerVerdictI18nKey({ status: 'warn', reasons: ['x'] })).toBe('sanad.verdict.warn')
    expect(layerVerdictI18nKey({ status: 'insufficient_evidence', reason: 'x' })).toBe(
      'sanad.verdict.insufficient'
    )
  })
})

describe('applySanadClaimGuardrails', () => {
  const excerpt = 'Nausea was reported by approximately 30% of patients during the first cycle.'

  it('downgrades supported claims whose quote is not in the excerpt', () => {
    const out = applySanadClaimGuardrails(
      [
        {
          claim: 'Around 30% reported nausea',
          verdict: 'supported',
          sourceQuotes: ['totally fabricated quote']
        }
      ],
      excerpt
    )
    expect(out[0].verdict).toBe('weak')
    expect(out[0].quoteValidation?.status).toBe('not_found')
  })

  it('keeps valid supported quotes and rolls mixed claims to warn', () => {
    const claims = applySanadClaimGuardrails(
      [
        {
          claim: 'Around 30% reported nausea',
          verdict: 'supported',
          sourceQuotes: ['approximately 30% of patients']
        },
        {
          claim: 'Mortality doubled overnight',
          verdict: 'not_in_source',
          sourceQuotes: []
        }
      ],
      excerpt
    )
    expect(claims).toHaveLength(2)
    expect(claims[0].verdict).toBe('supported')
    expect(claims[0].quoteValidation?.status).toBe('found')
    const v = passageVerdictFromGroundingClaims(claims, 'high', excerpt)
    expect(v.status).toBe('warn')
  })
})
