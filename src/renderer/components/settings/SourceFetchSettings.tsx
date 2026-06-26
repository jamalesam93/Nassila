import { useTranslation } from 'react-i18next'
import { useManuscriptAuditPrefsSync } from '../../hooks/use-manuscript-audit-prefs-sync'
import { useManuscriptAuditStore } from '../../stores/manuscript-audit-store'

export default function SourceFetchSettings() {
  const { t } = useTranslation()
  useManuscriptAuditPrefsSync({ loadOnMount: true, saveEnabled: true })

  const llmPrefsHydrated = useManuscriptAuditStore((s) => s.llmPrefsHydrated)
  const unpaywallEmail = useManuscriptAuditStore((s) => s.unpaywallEmail)
  const setUnpaywallEmail = useManuscriptAuditStore((s) => s.setUnpaywallEmail)

  return (
    <section className="border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-foreground">{t('settings.sourceFetch.title')}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('settings.sourceFetch.subtitle')}</p>

      <label className="mt-4 block text-xs font-medium text-foreground" htmlFor="unpaywall-email">
        {t('settings.sourceFetch.unpaywallEmail')}
      </label>
      <input
        id="unpaywall-email"
        type="email"
        autoComplete="email"
        disabled={!llmPrefsHydrated}
        value={unpaywallEmail}
        onChange={(e) => setUnpaywallEmail(e.target.value)}
        placeholder={t('settings.sourceFetch.unpaywallPlaceholder')}
        className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t('settings.sourceFetch.privacy')}</p>
      {unpaywallEmail.trim() ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{t('settings.sourceFetch.savedHint')}</p>
      ) : null}
    </section>
  )
}
