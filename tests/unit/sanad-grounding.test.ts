import { describe, expect, it } from 'vitest'
import {
  claimVerdictI18nKey,
  layerVerdictI18nKey
} from '../../src/renderer/utils/sanad-grounding'

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
