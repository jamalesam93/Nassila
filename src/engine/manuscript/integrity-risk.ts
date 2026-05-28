import type { LayerVerdict } from './types'

/** User-facing grouping for citation “could not be verified in registries”. */
export type ReferenceIntegrityRisk =
  | 'high_unverified'
  | 'manual_review'
  | 'locator_ok'
  | 'skipped'

export function referenceIntegrityRiskFromRegistry(registry: LayerVerdict): ReferenceIntegrityRisk {
  switch (registry.status) {
    case 'fail':
    case 'insufficient_evidence':
      return 'high_unverified'
    case 'warn':
      return 'manual_review'
    case 'pass':
      return 'locator_ok'
    default:
      return 'skipped'
  }
}
