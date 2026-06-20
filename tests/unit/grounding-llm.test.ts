import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildGroundingUserPrompt,
  findInvalidSourceQuotes,
  isVerbatimQuoteSubstring,
  parseGroundingJson,
  passageVerdictFromGroundingClaims,
  rollupPassageFromSites
} from '../../src/engine/manuscript/grounding-llm'

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

describe('isVerbatimQuoteSubstring', () => {
  const excerpt = 'Nausea was reported by approximately 30% of patients during the first cycle.'

  it('accepts exact substring', () => {
    expect(isVerbatimQuoteSubstring('approximately 30% of patients', excerpt)).toBe(true)
  })

  it('accepts whitespace-normalized match', () => {
    expect(isVerbatimQuoteSubstring('approximately  30%   of patients', excerpt)).toBe(true)
  })

  it('rejects hallucinated quote', () => {
    expect(isVerbatimQuoteSubstring('invented text not in source', excerpt)).toBe(false)
  })
})

describe('passageVerdictFromGroundingClaims', () => {
  const supportedClaim = {
    claim: 'Around 30% reported nausea',
    verdict: 'supported' as const,
    sourceQuotes: ['approximately 30% of patients']
  }

  it('passes when quotes are valid substrings', () => {
    const excerpt = 'Nausea was reported by approximately 30% of patients during the first cycle.'
    const v = passageVerdictFromGroundingClaims([supportedClaim], 'high', excerpt)
    expect(v.status).toBe('pass')
  })

  it('warns when quote is not a substring of excerpt', () => {
    const excerpt = 'Nausea was reported by approximately 30% of patients during the first cycle.'
    const v = passageVerdictFromGroundingClaims(
      [{ ...supportedClaim, sourceQuotes: ['totally fabricated quote'] }],
      'high',
      excerpt
    )
    expect(v.status).toBe('warn')
    if (v.status === 'warn') {
      expect(v.reasons.some((r) => r.includes('not found in source excerpt'))).toBe(true)
    }
  })

  it('warns when supported claim has no quotes', () => {
    const v = passageVerdictFromGroundingClaims(
      [{ claim: 'x', verdict: 'supported' }],
      'high',
      'some excerpt'
    )
    expect(v.status).toBe('warn')
  })
})

describe('findInvalidSourceQuotes', () => {
  it('returns empty when all quotes valid', () => {
    const excerpt = 'Protocol compliance was high across all study sites.'
    const issues = findInvalidSourceQuotes(
      [{ claim: 'Compliance was high', verdict: 'supported', sourceQuotes: ['Protocol compliance was high'] }],
      excerpt
    )
    expect(issues).toHaveLength(0)
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

describe('buildGroundingUserPrompt', () => {
  const fixture = {
    passage: 'The intervention worked equally well in adults and children (Daniels, 2024).',
    sourceExcerpt: 'Efficacy was demonstrated in adults; pediatric data were not collected.',
    meta: { label: 'abstract' as const }
  }

  const goldenPath = join(__dirname, '../fixtures/grounding_prompt_golden.txt')
  const golden = readFileSync(goldenPath, 'utf8').replace(/\r\n/g, '\n').trimEnd()

  it('matches canonical golden prompt (sync with NassilaT validate_dataset.py)', () => {
    const prompt = buildGroundingUserPrompt(fixture.passage, fixture.sourceExcerpt, fixture.meta)
    expect(prompt).toBe(golden)
  })

  it('includes scope-silence and v1.12 compound guardrails', () => {
    const prompt = buildGroundingUserPrompt(fixture.passage, fixture.sourceExcerpt, fixture.meta)
    expect(prompt).toContain('Scope-silence rule')
    expect(prompt).toContain('split into one claim per subgroup')
    expect(prompt).toContain('evaluate each independently')
    expect(prompt).toContain('receives weak (not supported)')
    expect(prompt).toContain('Approximate passage numbers')
  })

  it('does not forbid supported on compound passages globally', () => {
    const prompt = buildGroundingUserPrompt(fixture.passage, fixture.sourceExcerpt, fixture.meta)
    expect(prompt).not.toContain('never supported when the passage bundles multiple claims')
  })
})
