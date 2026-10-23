import { describe, expect, it } from 'vitest'
import {
  fixMissingClaimObjectClose,
  parseGroundingJsonWithRepair,
  repairGroundingJsonText,
  removeTrailingCommas,
  stripQwenThinkingTraces
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

/** Shape of a real FT-7 failure (l3v1-ft1-332-numeric_overclaim-0003-0093): the `}` closing claim 1 is dropped. Keep in sync with NassilaT training/tests/unit/test_json_repair.py. */
const MISSING_CLAIM_CLOSE_RAW =
  '{"claims": [{"claim": "Rate rose to 0.6 from 0.45.", "verdict": "contradicted", "sourceQuotes": ["Rate rose to 0.6 from 0.3."], "rationale": ["The passage conflicts with the source."], ' +
  '{"claim": "Filler improves conductivity.", "verdict": "supported", "sourceQuotes": ["Filler improves conductivity."], "rationale": ["Supported."]}], "overallVerdict": "contradicted"} <|im_end|>'

describe('fixMissingClaimObjectClose', () => {
  it('inserts the dropped } between claim objects', () => {
    const fixed = fixMissingClaimObjectClose('{"claims":[{"claim":"a","rationale":["x"], {"claim":"b"}]}')
    expect(fixed).toBe('{"claims":[{"claim":"a","rationale":["x"]}, {"claim":"b"}]}')
  })

  it('recovers the real failure shape and keeps both claims', () => {
    const result = parseGroundingJsonWithRepair(MISSING_CLAIM_CLOSE_RAW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.repaired).toBe(true)
    expect(result.parsed.claims).toHaveLength(2)
  })

  it('leaves valid multi-claim output untouched', () => {
    const valid = '{"claims":[{"claim":"a","rationale":["x"]}, {"claim":"b","rationale":["y"]}]}'
    expect(fixMissingClaimObjectClose(valid)).toBe(valid)
  })
})

describe('stripQwenThinkingTraces', () => {
  const cleanJson = '{"claims":[{"claim":"Rate rose 30%","verdict":"supported","sourceQuotes":["rose 30%"]}],"overallVerdict":"support"}'

  it('parses thinking-wrapped JSON identically to clean JSON', () => {
    const thinking = ` thinking
The passage claims the mortality rate rose. Note the source uses "{" and "}" in quotes and a stray comma, too.
 response

${cleanJson}`
    const stripped = stripQwenThinkingTraces(thinking)
    expect(stripped).toBe(cleanJson)
    const result = parseGroundingJsonWithRepair(thinking)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.parsed.claims).toHaveLength(1)
      expect(result.parsed.overallVerdict).toBe('support')
    }
  })

  it('leaves clean output byte-identical', () => {
    expect(stripQwenThinkingTraces(cleanJson)).toBe(cleanJson)
  })

  it('strips the <|start_thinking|> variant', () => {
    const wrapped = `<|start_thinking|>
The model reasons here with {braces} and "quotes".
<|end_thinking|>
${cleanJson}`
    expect(stripQwenThinkingTraces(wrapped)).toBe(cleanJson)
  })

  it('handles the 4B-format trace (same template family)', () => {
    const trace = ` thinking
Brief reasoning without the trailing blank line.
 response
${cleanJson}`
    const result = parseGroundingJsonWithRepair(trace)
    expect(result.ok).toBe(true)
  })

  it('fails gracefully on a truncated JSON payload (no crash)', () => {
    const truncated = ` thinking
long reasoning that gets cut off
 response

{"claims":[{"claim":"cut`
    const result = parseGroundingJsonWithRepair(truncated)
    expect(result.ok).toBe(false)
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
