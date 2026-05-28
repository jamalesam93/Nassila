import { useEffect } from 'react'
import { useCitationStore } from '../stores/citation-store'
import { setPredatoryListCache } from '../../engine/predatory/list-store'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function usePredatoryListLifecycle(): void {
  const networkStatus = useCitationStore((s) => s.networkStatus)

  useEffect(() => {
    if (networkStatus !== 'online' || !window.api?.predatory) return

    let cancelled = false

    void (async () => {
      try {
        const list = await window.api.predatory.getList()
        if (cancelled) return
        setPredatoryListCache(list)

        const meta = await window.api.predatory.getStatus()
        if (cancelled) return
        useCitationStore.getState().setPredatoryListMeta(meta)

        const last = meta.lastCheckedAt ? Date.parse(meta.lastCheckedAt) : NaN
        const needsWeekly = Number.isNaN(last) || Date.now() - last > WEEK_MS
        if (!needsWeekly) return

        const res = await window.api.predatory.checkForUpdates()
        if (cancelled) return
        useCitationStore.getState().setPredatoryUpdateAvailable(res.updateAvailable === true)
        const freshMeta = await window.api.predatory.getStatus()
        if (!cancelled) useCitationStore.getState().setPredatoryListMeta(freshMeta)
      } catch {
        /* offline mirror / dev without IPC */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [networkStatus])
}
