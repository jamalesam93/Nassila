import type { LayerVerdict } from './types'

/**
 * Regex-only scan for adversarial content in untrusted source text (attached PDFs,
 * Europe PMC JATS, Unpaywall HTML, registry abstracts) before excerpts reach the
 * grounding LLM. Rule categories ported from NVIDIA/SkillSpector's prompt-injection
 * (P1-P5), anti-refusal (AR1-AR3), and exfiltration (E1-E4) catalogs plus unicode
 * deception. Rules are instruction-framed on purpose: biomedical prose may
 * legitimately mention poison, weapons, or secrets — it should never instruct the
 * reader to ignore its instructions.
 */

export type InjectionSeverity = 'low' | 'medium' | 'high' | 'critical'

export type InjectionCategory = 'prompt_injection' | 'anti_refusal' | 'exfiltration' | 'unicode'

export interface InjectionFinding {
  ruleId: string
  category: InjectionCategory
  severity: InjectionSeverity
  index: number
  snippet: string
}

interface InjectionRule {
  id: string
  category: InjectionCategory
  severity: InjectionSeverity
  pattern: RegExp
}

const RULES: InjectionRule[] = [
  // P1 — Instruction override
  { id: 'p1_ignore_instructions', category: 'prompt_injection', severity: 'high', pattern: /ignore (?:all |any )?(?:the )?(?:previous|prior|earlier|above) instructions?/gi },
  { id: 'p1_disregard_instructions', category: 'prompt_injection', severity: 'high', pattern: /disregard (?:all |any )?(?:the )?(?:previous|prior|above|system|initial) instructions?/gi },
  { id: 'p1_override_instructions', category: 'prompt_injection', severity: 'high', pattern: /(?:override|forget) (?:all |your |the )?(?:system )?(?:instructions|guidelines|rules)/gi },
  // P2 — Hidden instructions (HTML comments, secret directives)
  { id: 'p2_hidden_comment', category: 'prompt_injection', severity: 'high', pattern: /<!--[\s\S]*?(?:ignore|instructions?|must|obey)[\s\S]*?-->/gi },
  { id: 'p2_secret_directive', category: 'prompt_injection', severity: 'high', pattern: /(?:do not|never) (?:tell|reveal|mention) (?:anyone|the user|this instruction)/gi },
  // P3 — Exfiltration commands
  { id: 'p3_exfil_transmit', category: 'exfiltration', severity: 'high', pattern: /(?:send|post|transmit|exfiltrate|leak|upload) (?:the |this |our |entire |full )?(?:conversation|context|chat|prompt|content|data|text) (?:to|via)/gi },
  // P5 — Harmful content (instruction-framed only)
  { id: 'p5_harmful_instruction', category: 'prompt_injection', severity: 'critical', pattern: /(?:your|the) (?:goal|mission|task|purpose) is to .{0,60}(?:harm|kill|injure|poison|attack|destroy)/gi },
  { id: 'p5_cause_harm', category: 'prompt_injection', severity: 'critical', pattern: /(?:cause|inflict) (?:physical|serious|bodily) harm/gi },
  // AR1 — Refusal suppression
  { id: 'ar1_never_refuse', category: 'anti_refusal', severity: 'high', pattern: /(?:never|do not|don'?t) refuse/gi },
  { id: 'ar1_always_comply', category: 'anti_refusal', severity: 'high', pattern: /always (?:comply|answer|obey|follow|agree)/gi },
  // AR2 — Disclaimer suppression
  { id: 'ar2_no_disclaimers', category: 'anti_refusal', severity: 'high', pattern: /(?:no|without) disclaimers?/gi },
  { id: 'ar2_no_warnings', category: 'anti_refusal', severity: 'high', pattern: /(?:do not|never) (?:add|include|mention|use) (?:warnings?|ethical (?:comments?|considerations?)|moraliz)/gi },
  // AR3 — Safety policy nullification
  { id: 'ar3_no_restrictions', category: 'anti_refusal', severity: 'high', pattern: /you have no restrictions/gi },
  { id: 'ar3_ignore_safety', category: 'anti_refusal', severity: 'high', pattern: /(?:ignore|disregard) (?:all |your )?(?:safety|ethics?|guidelines|guardrails?|policies?)/gi },
  { id: 'ar3_do_anything', category: 'anti_refusal', severity: 'high', pattern: /(?:you (?:can|are allowed to|may)) do anything/gi },
  { id: 'ar3_no_rules', category: 'anti_refusal', severity: 'high', pattern: /no rules apply/gi },
  // E2 — Credential/env harvesting
  { id: 'e2_harvest_credentials', category: 'exfiltration', severity: 'high', pattern: /(?:collect|harvest|extract|steal|grab) (?:all |the )?(?:api[_-]?keys?|secrets?|credentials?|passwords?|tokens?)/gi },
  { id: 'e2_env_secrets', category: 'exfiltration', severity: 'high', pattern: /(?:api[_-]?key|secret|password|token)s? (?:from|in) (?:the )?(?:env|environment|config|settings)/gi },
  // E3 — File system enumeration
  { id: 'e3_enumeration', category: 'exfiltration', severity: 'medium', pattern: /(?:scan|list|enumerate) (?:the |all |your )?(?:director|folders?|file system|home director)/gi },
  // E4 — Context leakage
  { id: 'e4_context_leak', category: 'exfiltration', severity: 'high', pattern: /(?:send|share|transmit|upload|forward) (?:this |the |our |entire |full )?(?:conversation|context|chat|session|prompt|log)/gi },
  // Unicode deception
  { id: 'u1_zero_width', category: 'unicode', severity: 'medium', pattern: /(?:\u200B|\u200C|\u200D|\u2060|\uFEFF)/g },
  { id: 'u2_bidi_override', category: 'unicode', severity: 'medium', pattern: /(?:\u202A|\u202B|\u202C|\u202D|\u202E|\u2066|\u2067|\u2068|\u2069)/g }
]

const MAX_FINDINGS_PER_RULE = 10
const MAX_TOTAL_FINDINGS = 100

/** Remove zero-width and bidi-control characters from untrusted text before it enters prompts. */
export function sanitizeSourceText(text: string): string {
  return text.replace(/(?:\u200B|\u200C|\u200D|\u2060|\uFEFF|\u202A|\u202B|\u202C|\u202D|\u202E|\u2066|\u2067|\u2068|\u2069)/g, '')
}

/** Scan untrusted source text for adversarial content indicators. */
export function scanSourceText(text: string): InjectionFinding[] {
  const findings: InjectionFinding[] = []
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0
    let ruleHits = 0
    for (const match of text.matchAll(rule.pattern)) {
      const index = match.index ?? 0
      findings.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        index,
        snippet: contextSnippet(text, index)
      })
      ruleHits += 1
      if (ruleHits >= MAX_FINDINGS_PER_RULE) break
      if (findings.length >= MAX_TOTAL_FINDINGS) return findings
    }
  }
  return findings
}

/** Compact human-readable summary of findings for verdict reasons and evidence text. */
export function summarizeInjectionFindings(findings: InjectionFinding[], max = 4): string {
  const parts = findings.slice(0, max).map((f) => `${f.ruleId} (${f.severity})`)
  const rest = findings.length > max ? ` and ${findings.length - max} more` : ''
  return parts.join(', ') + rest
}

/**
 * Fail-closed guard: a source flagged with adversarial content can never yield a
 * passing verdict. Pass downgrades to warn; existing warn/fail verdicts gain the
 * indicator as an additional reason.
 */
export function guardVerdictAgainstInjection(verdict: LayerVerdict, findings: InjectionFinding[]): LayerVerdict {
  if (findings.length === 0) return verdict
  const message = `Potential adversarial content in source text: ${summarizeInjectionFindings(findings)}`
  if (verdict.status === 'pass') return { status: 'warn', reasons: [message] }
  if (verdict.status === 'warn' || verdict.status === 'fail') {
    return { ...verdict, reasons: [...verdict.reasons, message] }
  }
  return verdict
}

function contextSnippet(text: string, index: number, radius = 28): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + radius + 1)
  return text.slice(start, end).replace(/\s+/g, ' ')
}
