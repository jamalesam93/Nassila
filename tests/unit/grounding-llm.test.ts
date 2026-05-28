import { describe, expect, it } from 'vitest'
import { parseGroundingJson, rollupPassageFromSites } from '../../src/engine/manuscript/grounding-llm'

describe('parseGroundingJson', () => {
  it('parses minimal valid payload', () => {
    const r = parseGroundingJson(
      '{"claims":[{"claim":"Population rose 30%","verdict":"supported","sourceQuotes":["increased by 30%"],"hasNumericClaim":true}]}'
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.claims).toHaveLength(1)
    expect(r.data.claims[0].verdict).toBe('supported')
  })

  it('returns error when claims missing', () => {
    const r = parseGroundingJson('{"foo":1}')
    expect(r.ok).toBe(false)
  })
})

describe('rollupPassageFromSites', () => {
  it('prioritizes fail over warn', () => {
    const v = rollupPassageFromSites([
      { passageVerdict: { status: 'pass' } },
      { passageVerdict: { status: 'fail', reasons: ['a'] } }
    ])
    expect(v.status).toBe('fail')
  })

  it('warns when any site warns', () => {
    const v = rollupPassageFromSites([
      { passageVerdict: { status: 'pass' } },
      { passageVerdict: { status: 'warn', reasons: ['weak'] } }
    ])
    expect(v.status).toBe('warn')
  })

  it('handles all pass', () => {
    expect(rollupPassageFromSites([{ passageVerdict: { status: 'pass' } }]).status).toBe('pass')
  })
})
