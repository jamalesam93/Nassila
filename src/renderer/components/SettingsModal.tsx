import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Tabs } from './ui/tabs'
import PredatoryListSettings from './settings/PredatoryListSettings'
import LocalModelsSettings from './settings/LocalModelsSettings'
import { useShellStore } from '../stores/shell-store'

type SettingsTab = 'general' | 'localModels'

export default function SettingsModal() {
  const open = useShellStore((s) => s.settingsModalOpen)
  const settingsFocus = useShellStore((s) => s.settingsFocus)
  const setSettingsModalOpen = useShellStore((s) => s.setSettingsModalOpen)
  const { t } = useTranslation()
  const [tab, setTab] = useState<SettingsTab>('general')

  useEffect(() => {
    if (open && settingsFocus === 'localModels') {
      setTab('localModels')
    }
  }, [open, settingsFocus])

  if (!open || typeof document === 'undefined') return null

  const tabs = [
    { value: 'general' as const, label: t('settings.tabGeneral') },
    { value: 'localModels' as const, label: t('settings.tabLocalModels') }
  ]

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
        className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="text-lg font-semibold text-foreground">
          {t('settings.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>

        <div className="mt-4 border-b border-border pb-3">
          <Tabs options={tabs} value={tab} onChange={setTab} ariaLabel={t('settings.tabsAria')} />
        </div>

        <div className="mt-4">
          {tab === 'general' ? <PredatoryListSettings /> : null}
          {tab === 'localModels' ? <LocalModelsSettings /> : null}
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
