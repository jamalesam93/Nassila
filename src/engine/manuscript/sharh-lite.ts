import type { AuditReport, CitationFinding, ClaimGroundingRow, ClaimSupportVerdict, L3Coverage } from './types'

export interface FindingClaimBreakdown {
  bibKey: string
  supported: number
  weak: number
  contradicted: number
  notInSource: number
  insufficient: number
  invalidQuotes: number
  auditedClaims: number
  l3Coverage: L3Coverage
  unresolvedIdentity: boolean
  topRationale: string[]
}

export interface SharhLiteSummary {
  supported: number
  weak: number
  contradicted: number
  notInSource: number
  insufficient: number
  unmappedCitations: number
  unresolvedIdentities: number
  invalidQuotes: number
  findingsReviewed: number
  coverageBreakdown: Record<L3Coverage, number>
  passageBuckets: { low: number; medium: number; high: number }
  claimBreakdownByFinding: FindingClaimBreakdown[]
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

function countVerdictInClaimList(claims: ClaimGroundingRow[], verdict: ClaimSupportVerdict): number {
  let n = 0
  for (const claim of claims) {
    if (claim.verdict === verdict) n++
  }
  return n
}

function buildFindingClaimBreakdown(finding: CitationFinding): FindingClaimBreakdown | null {
  const claims: ClaimGroundingRow[] = []
  for (const site of finding.citeSites ?? []) {
    if (site.claimGrounding) claims.push(...site.claimGrounding)
  }
  if (claims.length === 0) return null

  const topRationale: string[] = []
  for (const claim of claims) {
    for (const line of claim.rationale ?? []) {
      if (line.trim() && !topRationale.includes(line.trim())) {
        topRationale.push(line.trim())
      }
      if (topRationale.length >= 3) break
    }
    if (topRationale.length >= 3) break
  }

  return {
    bibKey: finding.bibKey,
    supported: countVerdictInClaimList(claims, 'supported'),
    weak: countVerdictInClaimList(claims, 'weak'),
    contradicted: countVerdictInClaimList(claims, 'contradicted'),
    notInSource: countVerdictInClaimList(claims, 'not_in_source'),
    insufficient: countVerdictInClaimList(claims, 'insufficient_evidence'),
    invalidQuotes: claims.filter((claim) => claim.quoteValidation?.status === 'not_found').length,
    auditedClaims: claims.length,
    l3Coverage: finding.l3Coverage,
    unresolvedIdentity: finding.layers.registry.status === 'fail' || finding.layers.metadata.status === 'fail',
    topRationale
  }
}

function buildPassageBuckets(findings: CitationFinding[]): { low: number; medium: number; high: number } {
  const buckets = { low: 0, medium: 0, high: 0 }
  for (const f of findings) {
    for (const site of f.citeSites ?? []) {
      buckets[site.deterministicBucket] += 1
    }
  }
  return buckets
}

function buildCoverageBreakdown(findings: CitationFinding[]): Record<L3Coverage, number> {
  const breakdown: Record<L3Coverage, number> = {
    full_text_oa_europe_pmc: 0,
    full_text_oa_unpaywall: 0,
    full_text_attached_pdf: 0,
    abstract_only_closed: 0,
    unavailable: 0
  }
  for (const f of findings) {
    // Early-exit findings (parse/offline errors) may not carry an l3Coverage — skip them.
    if (f.l3Coverage) breakdown[f.l3Coverage] += 1
  }
  return breakdown
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

  const claimBreakdownByFinding = findings
    .map((f) => buildFindingClaimBreakdown(f))
    .filter((b): b is FindingClaimBreakdown => b !== null)

  return {
    supported: countClaimVerdict(findings, 'supported'),
    weak: countClaimVerdict(findings, 'weak'),
    contradicted: countClaimVerdict(findings, 'contradicted'),
    notInSource: countClaimVerdict(findings, 'not_in_source'),
    insufficient: countClaimVerdict(findings, 'insufficient_evidence'),
    unmappedCitations: unmapped,
    unresolvedIdentities,
    invalidQuotes,
    findingsReviewed: findings.length,
    coverageBreakdown: buildCoverageBreakdown(findings),
    passageBuckets: buildPassageBuckets(findings),
    claimBreakdownByFinding,
    sourceCoverageLimitations,
    nextActions
  }
}

/** Minimum matched/total citation mapping ratio before a full audit is trustworthy (1.7.0 Preflight+). */
export const PREFLIGHT_MAPPING_COVERAGE_WARN = 0.85
export const PREFLIGHT_MAPPING_COVERAGE_BLOCK = 0.5

export interface PreflightGateResult {
  ok: boolean
  blockers: string[]
  warnings: string[]
  mappingCoverage?: number
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
  const ambiguous = report.citationMapping?.ambiguous ?? 0
  const mappingTotal = matched + unmatched + ambiguous
  const mappingCoverage = mappingTotal > 0 ? matched / mappingTotal : undefined
  if (matched === 0 && report.findings.length > 0) {
    blockers.push('No in-text citations were mapped to bibliography entries')
  } else if (mappingCoverage !== undefined) {
    if (mappingCoverage < PREFLIGHT_MAPPING_COVERAGE_BLOCK) {
      blockers.push(
        `Citation mapping coverage is ${Math.round(mappingCoverage * 100)}% — resolve unmatched citations before submission`
      )
    } else if (unmatched > 0) {
      warnings.push(`${unmatched} unmatched citation(s) were not grounded`)
    }
    if (
      mappingCoverage >= PREFLIGHT_MAPPING_COVERAGE_BLOCK &&
      mappingCoverage < PREFLIGHT_MAPPING_COVERAGE_WARN
    ) {
      warnings.push(
        `Citation mapping coverage is ${Math.round(mappingCoverage * 100)}% — review ambiguous or unmatched cites`
      )
    }
  }
  const abstractOnly = report.findings.filter((f) => f.l3Coverage === 'abstract_only_closed').length
  const unavailable = report.findings.filter((f) => f.l3Coverage === 'unavailable').length
  if (abstractOnly > 0) {
    warnings.push(`${abstractOnly} reference(s) were audited on abstract-only source coverage`)
  }
  if (unavailable > 0) {
    warnings.push(`${unavailable} reference(s) had no source text for grounding`)
  }
  return { ok: blockers.length === 0, blockers, warnings, mappingCoverage }
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
  preflightOk?: boolean
  mappingCoverage?: number
  sourceCoverageLimitations?: string[]
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
  const preflight = evaluateSubmissionPreflight(report)
  return {
    at: new Date().toISOString(),
    appVersion,
    promptContractVersion: report.promptContractVersion,
    findingCount: report.findings.length,
    supportedClaims: summary.supported,
    contradictedClaims: summary.contradicted,
    invalidQuotes: summary.invalidQuotes,
    auditDurationMs,
    failureCategories,
    preflightOk: preflight.ok,
    mappingCoverage: preflight.mappingCoverage,
    sourceCoverageLimitations: summary.sourceCoverageLimitations
  }
}

export interface SubmissionIntegrityBundle {
  exportedAt: string
  appVersion: string
  promptContractVersion?: string
  preflight: PreflightGateResult
  summary: SharhLiteSummary
  diagnostic: QualityLedgerEntry
  provenance: {
    groundingModelId: string
    groundingCheckpoint: string
    groundingRunner: string
    networkStatus: string
    templateId: string
    citationMapping?: AuditReport['citationMapping']
    findingIndex: Array<{
      bibKey: string
      l3Coverage: string
      registryStatus: string
      metadataStatus: string
      passageStatus: string
    }>
  }
}

/** 1.7.0 submission integrity bundle — audit summary + provenance, no manuscript body text. */
export function buildSubmissionIntegrityBundle(
  report: AuditReport,
  appVersion: string,
  auditDurationMs?: number
): SubmissionIntegrityBundle {
  const preflight = evaluateSubmissionPreflight(report)
  const summary = buildSharhLiteSummary(report)
  const diagnostic = buildQualityLedgerEntry(report, appVersion, auditDurationMs)
  return {
    exportedAt: new Date().toISOString(),
    appVersion,
    promptContractVersion: report.promptContractVersion,
    preflight,
    summary,
    diagnostic,
    provenance: {
      groundingModelId: report.grounding.modelId,
      groundingCheckpoint: report.grounding.checkpoint,
      groundingRunner: report.grounding.runner,
      networkStatus: report.networkStatus,
      templateId: report.template.id,
      citationMapping: report.citationMapping,
      findingIndex: report.findings.map((f) => ({
        bibKey: f.bibKey,
        l3Coverage: f.l3Coverage,
        registryStatus: f.layers.registry.status,
        metadataStatus: f.layers.metadata.status,
        passageStatus: f.layers.passage.status
      }))
    }
  }
}
