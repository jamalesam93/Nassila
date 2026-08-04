import type { TFunction } from 'i18next'
import type {
  FindingClaimBreakdown,
  SharhLiteSummary
} from '../../engine/manuscript/sharh-lite'

/**
 * Localized Sharh copy builders — deterministic, pure, no LLM.
 * The engine emits structured aggregates; these turn them into sentences
 * through i18n so Arabic gets its own approved wording.
 */

export function buildSharhHeadline(t: TFunction, summary: SharhLiteSummary): string | null {
  const auditedClaims =
    summary.supported +
    summary.weak +
    summary.contradicted +
    summary.notInSource +
    summary.insufficient
  const clauses: string[] = []
  if (auditedClaims > 0) {
    clauses.push(t('sharhLite.headlineClaims', { supported: summary.supported, total: auditedClaims }))
    pushCounted(t, clauses, 'sharhLite.headlineContradicted', summary.contradicted)
    pushCounted(t, clauses, 'sharhLite.headlineWeak', summary.weak)
    pushCounted(t, clauses, 'sharhLite.headlineNotInSource', summary.notInSource)
    pushCounted(t, clauses, 'sharhLite.headlineInsufficient', summary.insufficient)
  }
  pushCounted(t, clauses, 'sharhLite.headlineUnresolved', summary.unresolvedIdentities)
  pushCounted(t, clauses, 'sharhLite.headlineUnmapped', summary.unmappedCitations)
  if (clauses.length === 0) return null
  return clauses.join('; ')
}

export function buildFindingExplanation(t: TFunction, row: FindingClaimBreakdown): string {
  const units: string[] = []
  pushCounted(t, units, 'sharhLite.findingSupported', row.supported)
  pushCounted(t, units, 'sharhLite.findingWeak', row.weak)
  pushCounted(t, units, 'sharhLite.findingContradicted', row.contradicted)
  pushCounted(t, units, 'sharhLite.findingNotInSource', row.notInSource)
  pushCounted(t, units, 'sharhLite.findingInsufficient', row.insufficient)
  pushCounted(t, units, 'sharhLite.findingQuoteMiss', row.invalidQuotes)
  if (row.unresolvedIdentity) units.push(t('sharhLite.findingUnresolved'))
  units.push(t(`sharhLite.findingCoverage.${row.l3Coverage}`))
  return units.join(' · ')
}

function pushCounted(t: TFunction, target: string[], key: string, count: number): void {
  if (count > 0) target.push(t(key, { count }))
}