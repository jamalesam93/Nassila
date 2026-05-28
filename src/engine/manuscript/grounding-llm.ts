import type { ClaimGroundingRow, ClaimSupportVerdict, EvidenceSnippet, InTextSpan, LayerVerdict } from './types'

export interface GroundingLlmOpts {
  llmEnabled: boolean
  llmBaseUrl: string
  llmModel: string
}

/** Sentence-ish chunks from long source text, ranked by token overlap with passage. */
export function selectSourceChunksForGrounding(passage: string, sourceText: string, maxChars: number): string {
  const cleaned = sourceText.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxChars) return cleaned

  const parts = cleaned.split(/(?<=[.!?])\s+|[\n\r]+/).map((s) => s.trim()).filter((s) => s.length > 20)
  const chunks = parts.length > 0 ? parts : [cleaned.slice(0, 2000)]

  const pTokens = normalizeTokens(passage)
  const ranked = chunks
    .map((chunk) => ({
      chunk,
      score: overlapScore(pTokens, normalizeTokens(chunk))
    }))
    .sort((a, b) => b.score - a.score)

  let out = ''
  for (const { chunk } of ranked) {
    if (out.length + chunk.length + 1 > maxChars) break
    out = out ? `${out}\n\n${chunk}` : chunk
  }
  if (!out) out = cleaned.slice(0, maxChars)
  return out.slice(0, maxChars)
}

function normalizeTokens(text: string): Set<string> {
  const arr = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3)
  return new Set(arr)
}

function overlapScore(passageTokens: Set<string>, chunkTokens: Set<string>): number {
  if (passageTokens.size === 0) return 0
  let hit = 0
  for (const t of passageTokens) {
    if (chunkTokens.has(t)) hit++
  }
  return hit / passageTokens.size
}

export interface ParsedGroundingResponse {
  claims: ClaimGroundingRow[]
  overallVerdict?: 'support' | 'weak' | 'unrelated' | 'insufficient_evidence'
  overallRationale?: string[]
}

export function buildGroundingUserPrompt(passage: string, sourceExcerpt: string, meta: { label: string; url?: string }): string {
  return [
    'You are a strict academic citation grounding assistant.',
    'Break the manuscript passage into short factual claims (atomic where possible).',
    'For each claim, compare ONLY to SOURCE_EXCERPT (verbatim text from the cited work).',
    'Verdict per claim:',
    '- supported: SOURCE_EXCERPT contains clear support; you MUST copy 1–3 verbatim sourceQuotes from SOURCE_EXCERPT.',
    '- weak: partial or vague alignment.',
    '- not_in_source: not found in excerpt (excerpt may be incomplete).',
    '- contradicted: excerpt clearly conflicts.',
    '- insufficient_evidence: cannot tell from excerpt.',
    'Respond with a single JSON object ONLY, no markdown fencing, keys:',
    '{ "claims": [ { "claim": string, "verdict": "supported"|"weak"|"not_in_source"|"contradicted"|"insufficient_evidence", "hasNumericClaim"?: boolean, "sourceQuotes"?: string[], "rationale"?: string[] } ], "overallVerdict"?: "support"|"weak"|"unrelated"|"insufficient_evidence", "overallRationale"?: string[] }',
    '',
    `PASSAGE:\n${passage}`,
    '',
    `SOURCE_EXCERPT (${meta.label}${meta.url ? ` ${meta.url}` : ''}):\n${sourceExcerpt}`
  ].join('\n')
}

export function parseGroundingJson(raw: string): { ok: true; data: ParsedGroundingResponse } | { ok: false; error: string } {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end <= start) return { ok: false, error: 'No JSON object in model output' }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown
  } catch {
    return { ok: false, error: 'Invalid JSON from model' }
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'JSON root not an object' }
  const rec = parsed as Record<string, unknown>
  const claimsRaw = rec.claims
  if (!Array.isArray(claimsRaw)) return { ok: false, error: 'Missing claims array' }

  const claims: ClaimGroundingRow[] = []
  for (const item of claimsRaw) {
    if (!item || typeof item !== 'object') continue
    const c = item as Record<string, unknown>
    const claim = typeof c.claim === 'string' ? c.claim : ''
    const verdict = parseClaimVerdict(c.verdict)
    if (!claim.trim() || !verdict) continue
    const hasNumericClaim = typeof c.hasNumericClaim === 'boolean' ? c.hasNumericClaim : undefined
    const sourceQuotes = Array.isArray(c.sourceQuotes)
      ? c.sourceQuotes.filter((x): x is string => typeof x === 'string')
      : undefined
    const rationale = Array.isArray(c.rationale)
      ? c.rationale.filter((x): x is string => typeof x === 'string')
      : undefined
    claims.push({ claim: claim.trim(), verdict, hasNumericClaim, sourceQuotes, rationale })
  }

  let overallVerdict: ParsedGroundingResponse['overallVerdict']
  if (typeof rec.overallVerdict === 'string') {
    const o = rec.overallVerdict
    if (o === 'support' || o === 'weak' || o === 'unrelated' || o === 'insufficient_evidence') overallVerdict = o
  }
  let overallRationale: string[] | undefined
  if (Array.isArray(rec.overallRationale)) {
    overallRationale = rec.overallRationale.filter((x): x is string => typeof x === 'string')
  }

  return { ok: true, data: { claims, overallVerdict, overallRationale } }
}

function parseClaimVerdict(v: unknown): ClaimSupportVerdict | null {
  if (typeof v !== 'string') return null
  switch (v) {
    case 'supported':
    case 'weak':
    case 'contradicted':
    case 'not_in_source':
    case 'insufficient_evidence':
      return v
    default:
      return null
  }
}

/** Maps structured claims (+ optional overlap) into a passage layer verdict. */
export function passageVerdictFromGroundingClaims(
  claims: ClaimGroundingRow[],
  deterministicBucket: 'low' | 'medium' | 'high'
): LayerVerdict {
  if (claims.length === 0) {
    return deterministicBucket === 'low'
      ? { status: 'warn', reasons: ['LLM returned no usable claims; weak lexical overlap'] }
      : { status: 'warn', reasons: ['LLM returned no usable claims'] }
  }

  const reasons: string[] = []
  if (claims.some((c) => c.verdict === 'contradicted')) {
    for (const c of claims.filter((x) => x.verdict === 'contradicted')) {
      reasons.push(`Possible contradiction: ${c.claim}`)
    }
    return { status: 'warn', reasons }
  }

  if (claims.some((c) => c.verdict === 'not_in_source')) {
    for (const c of claims.filter((x) => x.verdict === 'not_in_source').slice(0, 3)) {
      reasons.push(`Not found in source excerpt: ${c.claim}`)
    }
    return { status: 'warn', reasons }
  }

  if (claims.every((c) => c.verdict === 'insufficient_evidence')) {
    return {
      status: 'insufficient_evidence',
      reason: 'LLM could not assess claims against excerpt'
    }
  }

  if (claims.some((c) => c.verdict === 'weak')) {
    for (const c of claims.filter((x) => x.verdict === 'weak').slice(0, 3)) {
      reasons.push(`Weak support: ${c.claim}`)
    }
    return { status: 'warn', reasons }
  }

  const supported = claims.filter((c) => c.verdict === 'supported')
  for (const c of supported) {
    if (!c.sourceQuotes?.length) {
      reasons.push(`Supported claim missing verbatim quote: ${c.claim}`)
    }
  }
  if (reasons.length > 0) return { status: 'warn', reasons }

  if (deterministicBucket === 'low') {
    return { status: 'warn', reasons: ['LLM claims look supported but lexical overlap with full source is low — verify manually'] }
  }

  return { status: 'pass' }
}

export function evidenceFromGroundingParse(
  meta: { source: EvidenceSnippet['source']; url?: string },
  rawLlm: string,
  claims: ClaimGroundingRow[]
): EvidenceSnippet[] {
  const short = rawLlm.length > 800 ? `${rawLlm.slice(0, 800)}…` : rawLlm
  const lines: EvidenceSnippet[] = [{ source: meta.source, url: meta.url, text: `LLM grounding: ${short}` }]
  const summary = claims
    .map((c) => `${c.verdict}: ${c.claim}${c.sourceQuotes?.[0] ? ` — "${c.sourceQuotes[0].slice(0, 120)}"` : ''}`)
    .slice(0, 8)
    .join(' | ')
  if (summary) lines.push({ source: meta.source, url: meta.url, text: `Claims: ${summary}` })
  return lines
}

/** Merge per-citation-site verdicts into a single L3 rollup for `CitationFinding.layers.passage`. */
export function rollupPassageFromSites(sites: { passageVerdict: LayerVerdict }[]): LayerVerdict {
  if (sites.length === 0) {
    return { status: 'insufficient_evidence', reason: 'No citation sites evaluated' }
  }
  const list = sites.map((s) => s.passageVerdict)

  const fails = list.filter((v): v is Extract<LayerVerdict, { status: 'fail' }> => v.status === 'fail')
  if (fails.length) {
    return { status: 'fail', reasons: fails.flatMap((f) => f.reasons) }
  }

  const warns = list.filter((v): v is Extract<LayerVerdict, { status: 'warn' }> => v.status === 'warn')
  if (warns.length) {
    return { status: 'warn', reasons: warns.flatMap((w) => w.reasons) }
  }

  const ins = list.filter((v): v is Extract<LayerVerdict, { status: 'insufficient_evidence' }> => v.status === 'insufficient_evidence')
  if (ins.length) {
    return { status: 'insufficient_evidence', reason: ins.map((i) => i.reason).join('; ') }
  }

  const skips = list.filter((v): v is Extract<LayerVerdict, { status: 'skipped' }> => v.status === 'skipped')
  const passes = list.filter((v) => v.status === 'pass')
  if (skips.length && passes.length) {
    return { status: 'warn', reasons: ['Mixed results: some citation sites are limited (e.g. abstract-only) and others passed'] }
  }
  if (skips.length === list.length) {
    return skips[0]
  }

  if (passes.length === list.length) return { status: 'pass' }

  return { status: 'warn', reasons: ['Unexpected mix of passage verdicts'] }
}

export function worstDeterministicBucket(
  sites: { deterministicBucket: 'low' | 'medium' | 'high' }[]
): 'low' | 'medium' | 'high' | undefined {
  if (sites.length === 0) return undefined
  if (sites.some((s) => s.deterministicBucket === 'low')) return 'low'
  if (sites.some((s) => s.deterministicBucket === 'medium')) return 'medium'
  return 'high'
}

export function syntheticSpanForBodyPreview(): InTextSpan {
  return { start: 0, end: 0, raw: '' }
}
