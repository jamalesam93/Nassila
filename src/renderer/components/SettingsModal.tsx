import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import PredatoryListSettings from './settings/PredatoryListSettings'
import { useShellStore } from '../stores/shell-store'

export default function SettingsModal() {
  const open = useShellStore((s) => s.settingsModalOpen)
  const setSettingsModalOpen = useShellStore((s) => s.setSettingsModalOpen)
  const { t } = useTranslation()

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={() => setSettingsModalOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setSettingsModalOpen(false)}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="text-lg font-semibold text-foreground">
          {t('settings.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
        <div className="mt-4">
          <PredatoryListSettings />
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="button" size="sm" onClick={() => setSettingsModalOpen(false)}>
            {t('settings.close')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
