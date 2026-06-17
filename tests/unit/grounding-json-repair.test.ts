import { describe, expect, it } from 'vitest'
import {
  parseGroundingJsonWithRepair,
  repairGroundingJsonText,
  removeTrailingCommas
} from '../../src/engine/manuscript/grounding-json-repair'
import { parseGroundingJson, truncateForGrounding } from '../../src/engine/manuscript/grounding-llm'

describe('grounding-json-repair', () => {
  it('removes trailing commas before ] or }', () => {
    const fixed = removeTrailingCommas('{"claims":[{"claim":"a","verdict":"supported",}]}')
    expect(fixed).toBe('{"claims":[{"claim":"a","verdict":"supported"}]}')
  })

  it('repairs fenced JSON with trailing comma in quotes array', () => {
    const raw = `\`\`\`json
{
  "claims": [{
    "claim": "Higher mortality in the treatment arm",
    "verdict": "supported",
    "sourceQuotes": ["mortality in the treatment group was higher",],
    "rationale": ["ok"]
  }],
  "overallVerdict": "support"
}
\`\`\``
    const result = parseGroundingJsonWithRepair(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.repaired).toBe(true)
    expect(result.parsed.claims).toHaveLength(1)
  })

  it('strips TypeScript optional key markers', () => {
    const repaired = repairGroundingJsonText('{"claims":[{"claim"?: "x", "verdict": "weak"}]}')
    const result = parseGroundingJsonWithRepair(repaired)
    expect(result.ok).toBe(true)
  })
})

describe('parseGroundingJson with repair', () => {
  it('parses minimal valid payload without repair flag', () => {
    const r = parseGroundingJson(
      '{"claims":[{"claim":"Population rose 30%","verdict":"supported","sourceQuotes":["increased by 30%"],"hasNumericClaim":true}]}'
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.repaired).toBeUndefined()
    expect(r.data.claims).toHaveLength(1)
  })

  it('returns error when claims missing after repair', () => {
    const r = parseGroundingJson('{"foo":1}')
    expect(r.ok).toBe(false)
  })
})

describe('truncateForGrounding', () => {
  it('caps long text with ellipsis', () => {
    const long = 'word '.repeat(400).trim()
    const out = truncateForGrounding(long, 50)
    expect(out.length).toBeLessThanOrEqual(50)
    expect(out.endsWith('…')).toBe(true)
  })
})
