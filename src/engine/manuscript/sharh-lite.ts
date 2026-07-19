import type { AuditReport, CitationFinding, ClaimSupportVerdict } from './types'

export interface SharhLiteSummary {
  supported: number
  weak: number
  contradicted: number
  notInSource: number
  insufficient: number
  unmappedCitations: number
  unresolvedIdentities: number
  invalidQuotes: number
  sourceCoverageLimitations: string[]
  nextActions: string[]
}

function countClaimVerdict(findings: CitationFinding[], verdict: ClaimSupportVerdict): number {
  let n = 0
  for (const f of findings) {
    for (const site of f.citeSites ?? []) {
      for (const claim of site.claimGrounding ?? []) {
        if (claim.verdict === verdict) n++
      }
    }
  }
  return n
}

function countInvalidQuotes(findings: CitationFinding[]): number {
  let n = 0
  for (const f of findings) {
    for (const site of f.citeSites ?? []) {
      for (const claim of site.claimGrounding ?? []) {
        if (claim.quoteValidation?.status === 'not_found') n++
      }
    }
  }
  return n
}

/** Deterministic Sharh-lite summary — no LLM. */
export function buildSharhLiteSummary(report: AuditReport): SharhLiteSummary {
  const findings = report.findings
  const unresolvedIdentities = findings.filter(
    (f) => f.layers.registry.status === 'fail' || f.layers.metadata.status === 'fail'
  ).length
  const unmapped = report.citationMapping?.unmatched ?? 0
  const sourceCoverageLimitations: string[] = []
  const abstractOnly = findings.filter((f) => f.l3Coverage === 'abstract_only_closed').length
  const unavailable = findings.filter((f) => f.l3Coverage === 'unavailable').length
  if (abstractOnly > 0) {
    sourceCoverageLimitations.push(`${abstractOnly} reference(s) audited on abstract-only coverage`)
  }
  if (unavailable > 0) {
    sourceCoverageLimitations.push(`${unavailable} reference(s) had no source text`)
  }

  const nextActions: string[] = []
  if (unmapped > 0) nextActions.push('Map unmatched in-text citations to bibliography entries')
  if (unresolvedIdentities > 0) nextActions.push('Resolve registry identity conflicts in Bibliography')
  const invalidQuotes = countInvalidQuotes(findings)
  if (invalidQuotes > 0) nextActions.push('Review claims with missing or invalid source quotes')
  if (countClaimVerdict(findings, 'contradicted') > 0) {
    nextActions.push('Review contradicted claims before submission')
  }
  if (nextActions.length === 0) nextActions.push('Export corrected bibliography and audit report')

  return {
    supported: countClaimVerdict(findings, 'supported'),
    weak: countClaimVerdict(findings, 'weak'),
    contradicted: countClaimVerdict(findings, 'contradicted'),
    notInSource: countClaimVerdict(findings, 'not_in_source'),
    insufficient: countClaimVerdict(findings, 'insufficient_evidence'),
    unmappedCitations: unmapped,
    unresolvedIdentities,
    invalidQuotes,
    sourceCoverageLimitations,
    nextActions
  }
}

export interface PreflightGateResult {
  ok: boolean
  blockers: string[]
  warnings: string[]
}

/** Submission preflight — unresolved identity + mapping coverage. */
export function evaluateSubmissionPreflight(report: AuditReport | null): PreflightGateResult {
  if (!report) {
    return { ok: false, blockers: ['No audit report yet'], warnings: [] }
  }
  const blockers: string[] = []
  const warnings: string[] = []
  const unresolved = report.findings.filter(
    (f) => f.layers.registry.status === 'fail' || f.layers.metadata.status === 'fail'
  ).length
  if (unresolved > 0) {
    blockers.push(`${unresolved} reference(s) have unresolved registry/metadata identity conflicts`)
  }
  const unmatched = report.citationMapping?.unmatched ?? 0
  const matched = report.citationMapping?.matched ?? 0
  if (matched === 0 && report.findings.length > 0) {
    blockers.push('No in-text citations were mapped to bibliography entries')
  } else if (unmatched > 0) {
    warnings.push(`${unmatched} unmatched citation(s) were not grounded`)
  }
  return { ok: blockers.length === 0, blockers, warnings }
}

/** Opt-in local quality ledger aggregates — no manuscript text. */
export interface QualityLedgerEntry {
  at: string
  appVersion: string
  promptContractVersion?: string
  findingCount: number
  supportedClaims: number
  contradictedClaims: number
  invalidQuotes: number
  auditDurationMs?: number
  failureCategories: string[]
}

export function buildQualityLedgerEntry(
  report: AuditReport,
  appVersion: string,
  auditDurationMs?: number
): QualityLedgerEntry {
  const summary = buildSharhLiteSummary(report)
  const failureCategories: string[] = []
  if (summary.contradicted > 0) failureCategories.push('contradicted_claims')
  if (summary.invalidQuotes > 0) failureCategories.push('invalid_quotes')
  if (summary.unresolvedIdentities > 0) failureCategories.push('unresolved_identity')
  if (summary.unmappedCitations > 0) failureCategories.push('unmapped_citations')
  return {
    at: new Date().toISOString(),
    appVersion,
    promptContractVersion: report.promptContractVersion,
    findingCount: report.findings.length,
    supportedClaims: summary.supported,
    contradictedClaims: summary.contradicted,
    invalidQuotes: summary.invalidQuotes,
    auditDurationMs,
    failureCategories
  }
}
