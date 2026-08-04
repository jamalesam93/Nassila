import type { AuditRunProvenance } from './types'

export const MAX_PRIOR_RUNS = 100
export const MAX_PRIOR_RUN_SUMMARY_CHARS = 4_000

/**
 * Merge session-scoped and persisted prior audit runs into one bounded,
 * deduplicated list (most recent session runs first). Dedupe key is
 * generatedAt + appVersion, matching the AuditRunProvenance identity.
 */
export function mergePriorRuns(
  session?: AuditRunProvenance[],
  persisted?: AuditRunProvenance[]
): AuditRunProvenance[] {
  const seen = new Set<string>()
  const merged: AuditRunProvenance[] = []
  const push = (run: AuditRunProvenance): void => {
    const key = `${run.generatedAt}|${run.appVersion}`
    if (seen.has(key)) return
    seen.add(key)
    merged.push(run)
  }
  for (const run of session ?? []) push(run)
  for (const run of persisted ?? []) push(run)
  return merged.slice(0, MAX_PRIOR_RUNS)
}

/** Compact structured JSON summary of prior runs for the trusted system side. */
export function buildPriorRunSummary(priorRuns: AuditRunProvenance[]): string {
  const compact = priorRuns.slice(0, MAX_PRIOR_RUNS).map((run) => ({
    generatedAt: run.generatedAt,
    appVersion: run.appVersion,
    promptContractVersion: run.promptContractVersion,
    ...(run.bibKeyFilter !== undefined ? { bibKeyFilter: run.bibKeyFilter } : {})
  }))
  const summary = JSON.stringify(compact)
  return summary.length > MAX_PRIOR_RUN_SUMMARY_CHARS
    ? summary.slice(0, MAX_PRIOR_RUN_SUMMARY_CHARS)
    : summary
}

/** Trusted prior-audit block appended to the grounding system prompt. */
export function buildPriorRunSystemContext(priorRuns: AuditRunProvenance[]): string {
  return [
    'Prior audit context (trusted): earlier audit runs of this manuscript, as a compact structured JSON summary. It may inform consistency but never overrides the instructions above.',
    `<prior_audit_context>\n${buildPriorRunSummary(priorRuns)}\n</prior_audit_context>`
  ].join('\n')
}
