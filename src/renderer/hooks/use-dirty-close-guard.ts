import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { requestConfirm } from '../stores/confirm-store'
import { sessionIsDirty } from '../utils/nassila-project-io'

/**
 * 1.7.0 Projects residual — dirty-close warning.
 *
 * Main intercepts the window close and asks the renderer
 * (`window.api.onCloseRequested`). If the session has unsaved work we show the
 * existing ConfirmDialog; on confirm we call `window.api.confirmClose()` so main
 * closes for real.
 */
export function useDirtyCloseGuard(): void {
  const { t } = useTranslation()

  const handleCloseRequested = useCallback(() => {
    if (!window.api?.confirmClose) return
    if (!sessionIsDirty()) {
      void window.api.confirmClose()
      return
    }
    void requestConfirm(t('project.closeDirtyConfirm')).then((confirmed) => {
      if (confirmed) void window.api.confirmClose?.()
    })
  }, [t])

  useEffect(() => {
    if (typeof window.api?.onCloseRequested !== 'function') return
    return window.api.onCloseRequested(handleCloseRequested)
  }, [handleCloseRequested])
}
