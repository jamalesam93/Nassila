import { useEffect } from 'react'
import { useCitationStore } from '../stores/citation-store'

export function useNetworkStatus(): void {
  const setNetworkStatus = useCitationStore((s) => s.setNetworkStatus)

  useEffect(() => {
    const update = () => setNetworkStatus(navigator.onLine ? 'online' : 'offline')

    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()

    const interval = setInterval(async () => {
      try {
        const status = await window.api?.checkNetwork()
        if (status) setNetworkStatus(status)
      } catch {
        setNetworkStatus('offline')
      }
    }, 30_000)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      clearInterval(interval)
    }
  }, [setNetworkStatus])
}
