import {
  buildGroundingUserPrompt,
  GROUNDING_EXCERPT_MAX_CHARS,
  GROUNDING_PASSAGE_MAX_CHARS,
  parseGroundingJson,
  passageVerdictFromGroundingClaims,
  truncateForGrounding
} from '../../engine/manuscript/grounding-llm'
import type { ClaimGroundingRow, LayerVerdict } from '../../engine/manuscript/types'
import { scorePassageAgainstSource } from '../../engine/relevance/deterministic'
import { findPresetByBaseUrl } from '../components/ManuscriptAudit/llm-presets'
import { ensureLlmKeyReady } from './llm-config-utils'

const GROUNDING_LLM_RETRY_ATTEMPTS = 2

export type SanadGroundingResult =
  | {
      kind: 'ok'
      claims: ClaimGroundingRow[]
      verdict: LayerVerdict
      raw: string
      repaired: boolean
      warnings: string[]
      overallVerdict?: string
      overallRationale?: string[]
    }
  | { kind: 'parse_error'; raw: string; error: string }
  | { kind: 'disabled' }
  | { kind: 'encryption_blocked' }
  | { kind: 'error'; message: string }

export type SanadLlmConfig = {
  enabled: boolean
  baseUrl: string
  model: string
}

export function claimVerdictI18nKey(verdict: ClaimGroundingRow['verdict']): string {
  return `sanad.claimVerdict.${verdict}`
}

export function layerVerdictI18nKey(verdict: LayerVerdict): string {
  switch (verdict.status) {
    case 'pass':
      return 'sanad.verdict.pass'
    case 'fail':
      return 'sanad.verdict.fail'
    case 'warn':
      return 'sanad.verdict.warn'
    case 'insufficient_evidence':
      return 'sanad.verdict.insufficient'
    case 'skipped':
      return 'sanad.verdict.skipped'
    default:
      return 'sanad.verdict.unknown'
  }
}

export async function runSanadGrounding(params: {
  passage: string
  sourceExcerpt: string
  llm: SanadLlmConfig
  label?: string
  url?: string
}): Promise<SanadGroundingResult> {
  const { passage, sourceExcerpt, llm, label, url } = params

  if (!llm.enabled || !window.api) return { kind: 'disabled' }

  const encryption = await window.api.isEncryptionAvailable().catch(() => false)
  if (!encryption) return { kind: 'encryption_blocked' }

  const cappedPassage = truncateForGrounding(passage, GROUNDING_PASSAGE_MAX_CHARS)
  const cappedExcerpt = truncateForGrounding(sourceExcerpt, GROUNDING_EXCERPT_MAX_CHARS)

  let lastRaw = ''
  let lastParseError = 'Invalid JSON from model'

  try {
    const presetId = findPresetByBaseUrl(llm.baseUrl)?.id ?? 'custom'
    await ensureLlmKeyReady(presetId, llm.baseUrl)

    for (let attempt = 0; attempt < GROUNDING_LLM_RETRY_ATTEMPTS; attempt++) {
      const content = await window.api.llmChat(
        { baseUrl: llm.baseUrl, model: llm.model },
        [
          {
            role: 'user',
            content: buildGroundingUserPrompt(cappedPassage, cappedExcerpt, { label, url })
          }
        ]
      )
      lastRaw = content
      const parsed = parseGroundingJson(content)
      if (!parsed.ok) {
        lastParseError = parsed.error
        continue
      }

      const scored = scorePassageAgainstSource(passage, sourceExcerpt)
      let verdict = passageVerdictFromGroundingClaims(parsed.data.claims, scored.bucket, cappedExcerpt)

      const warnings: string[] = []
      if (parsed.repaired) warnings.push('repaired')
      if (attempt > 0) warnings.push('retry')

      if (parsed.data.overallVerdict === 'unrelated') {
        if (verdict.status === 'pass') {
          verdict = {
            status: 'warn',
            reasons: [
              `Model flagged unrelated overall: ${(parsed.data.overallRationale ?? []).join('; ') || '(no rationale)'}`
            ]
          }
        } else if (verdict.status === 'warn') {
          warnings.push(`overall_unrelated:${(parsed.data.overallRationale ?? []).join('; ')}`)
        }
      } else if (parsed.data.overallVerdict === 'weak' && verdict.status === 'pass') {
        verdict = {
          status: 'warn',
          reasons: [`Model overall weak: ${(parsed.data.overallRationale ?? []).join('; ') || '(no rationale)'}`]
        }
      }

      return {
        kind: 'ok',
        claims: parsed.data.claims,
        verdict,
        raw: content,
        repaired: parsed.repaired,
        warnings,
        overallVerdict: parsed.data.overallVerdict,
        overallRationale: parsed.data.overallRationale
      }
    }

    return { kind: 'parse_error', raw: lastRaw, error: lastParseError }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { kind: 'error', message }
  }
}
