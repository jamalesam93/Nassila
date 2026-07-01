import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import { refreshNetworkStatus } from '../lib/network-status'
import { Button } from './ui/button'

type NetworkStatusIndicatorProps = {
  className?: string
}

export function NetworkStatusIndicator({ className = '' }: NetworkStatusIndicatorProps) {
  const { t } = useTranslation()
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const setNetworkStatus = useCitationStore((s) => s.setNetworkStatus)
  const [checking, setChecking] = useState(false)

  const onRetry = useCallback(async () => {
    setChecking(true)
    try {
      await refreshNetworkStatus(setNetworkStatus, { reset: true })
    } finally {
      setChecking(false)
    }
  }, [setNetworkStatus])

  return (
    <div className={`inline-flex shrink-0 items-center gap-1.5 ${className}`}>
      <span
        className={
          networkStatus === 'online'
            ? 'text-xs font-medium text-green-600 dark:text-green-400'
            : 'text-xs font-medium text-destructive'
        }
      >
        {networkStatus === 'online' ? t('statusBar.online') : t('statusBar.offline')}
      </span>
      {networkStatus === 'offline' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
          disabled={checking}
          onClick={() => void onRetry()}
        >
          {checking ? t('statusBar.retrying') : t('statusBar.retryConnection')}
        </Button>
      ) : null}
    </div>
  )
}
