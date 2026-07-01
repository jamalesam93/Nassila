import { useTranslation } from 'react-i18next'
import { useAppSettingsStore } from '../../stores/app-settings-store'

export default function NotificationSettings() {
  const { t } = useTranslation()
  const notifyOnLongTasks = useAppSettingsStore((s) => s.notifyOnLongTasks)
  const setNotifyOnLongTasks = useAppSettingsStore((s) => s.setNotifyOnLongTasks)
  const hydrated = useAppSettingsStore((s) => s.hydrated)

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-left">
      <h3 className="text-xs font-semibold text-foreground">{t('notifications.settingsTitle')}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {t('notifications.settingsHint')}
      </p>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="rounded border-input"
          checked={hydrated ? notifyOnLongTasks : true}
          disabled={!hydrated}
          onChange={(e) => void setNotifyOnLongTasks(e.target.checked)}
        />
        {t('notifications.notifyOnLongTasks')}
      </label>
    </div>
  )
}
