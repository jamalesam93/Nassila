import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { pushToast } from '../../lib/notify'
import { useCitationStore } from '../../stores/citation-store'
import { setPredatoryListCache } from '../../../engine/predatory/list-store'

function formatWhen(iso: string | null, t: (k: string) => string): string {
  if (!iso) return t('predatoryUpdates.never')
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch {
    return '—'
  }
}

export default function PredatoryListSettings() {
  const { t } = useTranslation()
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const predatoryListMeta = useCitationStore((s) => s.predatoryListMeta)
  const setPredatoryListMeta = useCitationStore((s) => s.setPredatoryListMeta)
  const setPredatoryUpdateAvailable = useCitationStore((s) => s.setPredatoryUpdateAvailable)

  const [busy, setBusy] = useState<'idle' | 'check' | 'update'>('idle')

  const refreshMeta = useCallback(async () => {
    if (!window.api?.predatory) return
    try {
      const m = await window.api.predatory.getStatus()
      setPredatoryListMeta(m)
    } catch {
      /* ignore */
    }
  }, [setPredatoryListMeta])

  useEffect(() => {
    void refreshMeta()
  }, [refreshMeta])

  const onCheck = async () => {
    if (!window.api?.predatory || networkStatus !== 'online') return
    setBusy('check')
    try {
      const res = await window.api.predatory.checkForUpdates()
      setPredatoryUpdateAvailable(res.updateAvailable === true)
      const message =
        res.message ??
        (res.updateAvailable
          ? t('predatoryUpdates.newerAvailable', { version: res.remoteVersion ?? '?' })
          : t('predatoryUpdates.upToDate'))
      pushToast(res.updateAvailable ? 'info' : 'success', message)
      await refreshMeta()
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : t('predatoryUpdates.errorGeneric'))
    } finally {
      setBusy('idle')
    }
  }

  const onUpdate = async () => {
    if (!window.api?.predatory || networkStatus !== 'online') return
    setBusy('update')
    try {
      const { meta, list } = await window.api.predatory.applyUpdate()
      setPredatoryListCache(list)
      setPredatoryListMeta(meta)
      setPredatoryUpdateAvailable(false)
      pushToast('success', t('predatoryUpdates.updateApplied', { version: meta.version }))
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : t('predatoryUpdates.errorGeneric'))
    } finally {
      setBusy('idle')
    }
  }

  const offline = networkStatus !== 'online'
  const meta = predatoryListMeta
  const originLabel =
    meta?.origin === 'downloaded' ? t('predatoryUpdates.originDownloaded') : t('predatoryUpdates.originBundled')

  return (
    <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 text-left">
      <h3 className="text-xs font-semibold text-foreground">{t('predatoryUpdates.sectionTitle')}</h3>
      <dl className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/90">{t('predatoryUpdates.versionLabel')}: </span>
          {meta?.version ?? '—'}
        </div>
        <div>
          <span className="font-medium text-foreground/90">{t('predatoryUpdates.originLabel')}: </span>
          {originLabel}
        </div>
        <div>{t('predatoryUpdates.lastChecked', { when: formatWhen(meta?.lastCheckedAt ?? null, t) })}</div>
        <div>{t('predatoryUpdates.lastUpdated', { when: formatWhen(meta?.fetchedAt ?? null, t) })}</div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={offline || busy !== 'idle'}
          title={offline ? t('predatoryUpdates.offlineDisabled') : undefined}
          onClick={() => void onCheck()}
        >
          {busy === 'check' ? t('predatoryUpdates.checking') : t('predatoryUpdates.checkButton')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={offline || busy !== 'idle'}
          title={offline ? t('predatoryUpdates.offlineDisabled') : undefined}
          onClick={() => void onUpdate()}
        >
          {busy === 'update' ? t('predatoryUpdates.checking') : t('predatoryUpdates.updateButton')}
        </Button>
      </div>
    </div>
  )
}
