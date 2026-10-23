import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { IndraFetchProgress, IndraRuntimeStatus } from '../../../shared/indra-runtime'

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

/**
 * First-run fetch for the optional Indra OCR candidate runtime.
 * Nothing is bundled: the weights are fetched on demand (modified OpenRAIL-M).
 */
export default function IndraRuntimeSettings() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<IndraRuntimeStatus | null>(null)
  const [progress, setProgress] = useState<IndraFetchProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (typeof window.api?.indraRuntimeStatus !== 'function') return
    try {
      setStatus(await window.api.indraRuntimeStatus())
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window.api?.onIndraFetchProgress !== 'function') return
    return window.api.onIndraFetchProgress((next) => setProgress(next))
  }, [])

  const handleFetch = useCallback(async () => {
    if (typeof window.api?.fetchIndraRuntime !== 'function') return
    setBusy(true)
    setError(null)
    setProgress(null)
    try {
      const next = await window.api.fetchIndraRuntime()
      setStatus(next)
      setProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      await refresh()
    } finally {
      setBusy(false)
    }
  }, [refresh])

  const percent =
    progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : null

  return (
    <section className="border-t border-border pt-6" id="settings-indra-runtime">
      <h3 className="text-sm font-semibold text-foreground">{t('settings.indra.title')}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t('settings.indra.subtitle')}
      </p>

      <p className="mt-3 text-[11px] text-muted-foreground" role="status">
        {status?.ready
          ? t('settings.indra.statusReady', {
              version: status.packageVersion ?? '—',
              size: formatBytes(status.modelBytes)
            })
          : status
            ? t('settings.indra.statusMissing')
            : t('settings.indra.statusChecking')}
      </p>
      {status?.ready ? (
        <p className="mt-1 break-all text-[11px] text-muted-foreground">
          {t('settings.indra.directory', { dir: status.directory })}
        </p>
      ) : null}

      {busy || progress ? (
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground">
            {progress
              ? `${t(`settings.indra.phase.${progress.phase}`)} · ${t('settings.indra.progress', {
                  completed: progress.completed,
                  total: progress.total
                })}${progress.message ? ` · ${progress.message}` : ''}`
              : t('settings.indra.fetching')}
          </p>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? undefined}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${percent ?? 5}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          disabled={busy || Boolean(status?.ready)}
          onClick={() => void handleFetch()}
        >
          {busy ? t('settings.indra.fetching') : t('settings.indra.fetch')}
        </button>
        {error ? (
          <p className="text-[11px] text-destructive" role="alert">
            {t('settings.indra.failed', { message: error })}
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t('settings.indra.license')}
      </p>
    </section>
  )
}
