import { useCallback, useEffect, useRef } from 'react'
import type { ManuscriptAuditPrefsV1 } from '../../shared/manuscript-audit-prefs'
import { useShellStore } from '../stores/shell-store'
import { shouldAutoOpenSanadSetup } from '../utils/sanad-setup-prompt'

let sessionPromptUsed = false

export function resetSanadSetupSessionPromptForTests(): void {
  sessionPromptUsed = false
}

export function useSanadSetupPrompt() {
  const openSanadSetup = useShellStore((s) => s.openSanadSetup)
  const promptedRef = useRef(false)

  const maybeOpenSanadSetup = useCallback(async () => {
    if (sessionPromptUsed || promptedRef.current) return

    let prefs: ManuscriptAuditPrefsV1 = { version: 1 }
    try {
      prefs = ((await window.api?.loadManuscriptAuditPrefs()) ?? { version: 1 }) as ManuscriptAuditPrefsV1
    } catch {
      /* use defaults */
    }

    if (!shouldAutoOpenSanadSetup(prefs)) return

    sessionPromptUsed = true
    promptedRef.current = true
    openSanadSetup()
  }, [openSanadSetup])

  return { maybeOpenSanadSetup }
}

/** Persist dismiss / connection-tested flags (merged with existing prefs). */
export async function patchSanadSetupPrefs(
  patch: Partial<Pick<ManuscriptAuditPrefsV1, 'sanadSetupDismissed' | 'sanadConnectionTested'>>
): Promise<void> {
  const existing = ((await window.api?.loadManuscriptAuditPrefs()) ?? { version: 1 }) as ManuscriptAuditPrefsV1
  await window.api?.saveManuscriptAuditPrefs({ ...existing, version: 1, ...patch })
}

export function useSanadSetupPrefsLoader(onLoaded: (prefs: ManuscriptAuditPrefsV1) => void) {
  useEffect(() => {
    let cancelled = false
    void window.api
      ?.loadManuscriptAuditPrefs()
      .then((prefs) => {
        if (!cancelled) onLoaded((prefs ?? { version: 1 }) as ManuscriptAuditPrefsV1)
      })
      .catch(() => {
        if (!cancelled) onLoaded({ version: 1 })
      })
    return () => {
      cancelled = true
    }
  }, [onLoaded])
}
