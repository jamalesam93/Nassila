import type { ManuscriptAuditPrefsV1 } from '../../shared/manuscript-audit-prefs'

export type SanadSetupTrigger = 'settings' | 'enable'

export function shouldAutoOpenSanadSetup(
  prefs: Pick<ManuscriptAuditPrefsV1, 'sanadSetupDismissed' | 'sanadConnectionTested'>
): boolean {
  if (prefs.sanadSetupDismissed) return false
  if (prefs.sanadConnectionTested) return false
  return true
}
