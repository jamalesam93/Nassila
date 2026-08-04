import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface CacheInfo {
  count: number
  bytes: number
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export default function StorageSettings() {
  const { t } = useTranslation()
  const [info, setInfo] = useState<CacheInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [cleared, setCleared] = useState(false)

  const refresh = useCallback(async () => {
    if (typeof window.api?.extractionCacheInfo !== 'function') return
    setInfo(await window.api.extractionCacheInfo())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleClear = useCallback(async () => {
    if (typeof window.api?.clearExtractionCache !== 'function') return
    setBusy(true)
    try {
      await window.api.clearExtractionCache()
      setCleared(true)
      await refresh()
    } finally {
      setBusy(false)
    }
  }, [refresh])

  return (
    <section className="border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-foreground">{t('settings.storage.title')}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t('settings.storage.subtitle')}
      </p>

      <label className="mt-4 block text-xs font-medium text-foreground">
        {t('settings.storage.extractionCacheLabel')}
      </label>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {t('settings.storage.extractionCacheDetail')}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {info && info.count > 0
          ? t('settings.storage.cacheCount', { count: info.count, bytes: formatBytes(info.bytes) })
          : t('settings.storage.cacheEmpty')}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          disabled={busy || !info || info.count === 0}
          onClick={() => void handleClear()}
        >
          {busy ? t('settings.storage.clearing') : t('settings.storage.clearCache')}
        </button>
        {cleared ? (
          <p className="text-[11px] text-muted-foreground" role="status">
            {t('settings.storage.cacheCleared')}
          </p>
        ) : null}
      </div>
    </section>
  )
}
