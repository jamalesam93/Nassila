import { describe, expect, it } from 'vitest'
import { referenceIntegrityRiskFromRegistry } from '../../src/engine/manuscript/integrity-risk'

describe('referenceIntegrityRiskFromRegistry', () => {
  it('maps fail and insufficient_evidence to high_unverified', () => {
    expect(referenceIntegrityRiskFromRegistry({ status: 'fail', reasons: ['x'] })).toBe('high_unverified')
    expect(referenceIntegrityRiskFromRegistry({ status: 'insufficient_evidence', reason: 'x' })).toBe(
      'high_unverified'
    )
  })

  it('maps grey warn to manual_review', () => {
    expect(referenceIntegrityRiskFromRegistry({ status: 'warn', reasons: ['grey'] })).toBe('manual_review')
  })

  it('maps pass to locator_ok', () => {
    expect(referenceIntegrityRiskFromRegistry({ status: 'pass' })).toBe('locator_ok')
  })

  it('maps skipped statuses to skipped', () => {
    expect(referenceIntegrityRiskFromRegistry({ status: 'skipped', reason: 'offline' })).toBe('skipped')
    expect(referenceIntegrityRiskFromRegistry({ status: 'skipped', reason: 'not_applicable' })).toBe('skipped')
  })
})
