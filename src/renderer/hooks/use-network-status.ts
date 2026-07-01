import { useEffect } from 'react'
import { useCitationStore } from '../stores/citation-store'
import { refreshNetworkStatus } from '../lib/network-status'

export function useNetworkStatus(): void {
  const setNetworkStatus = useCitationStore((s) => s.setNetworkStatus)

  useEffect(() => {
    const probe = () => void refreshNetworkStatus(setNetworkStatus)

    window.addEventListener('online', probe)
    window.addEventListener('offline', probe)

    const interval = setInterval(probe, 30_000)
    void probe()

    return () => {
      window.removeEventListener('online', probe)
      window.removeEventListener('offline', probe)
      clearInterval(interval)
    }
  }, [setNetworkStatus])
}
