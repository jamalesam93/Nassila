import { describe, expect, it, vi } from 'vitest'
import { useNotifyStore } from '../../src/renderer/stores/notify-store'

describe('notify-store', () => {
  it('pushes and dismisses toasts', () => {
    useNotifyStore.setState({ toasts: [] })
    const id = useNotifyStore.getState().push({
      kind: 'success',
      message: 'Done',
      timeoutMs: 4000
    })
    expect(useNotifyStore.getState().toasts).toHaveLength(1)
    expect(useNotifyStore.getState().toasts[0]?.id).toBe(id)
    useNotifyStore.getState().dismiss(id)
    expect(useNotifyStore.getState().toasts).toHaveLength(0)
  })

  it('auto-dismiss timer removes toast', () => {
    vi.useFakeTimers()
    useNotifyStore.setState({ toasts: [] })
    const id = useNotifyStore.getState().push({
      kind: 'info',
      message: 'Soon gone',
      timeoutMs: 1000
    })
    vi.advanceTimersByTime(1000)
    useNotifyStore.getState().dismiss(id)
    expect(useNotifyStore.getState().toasts).toHaveLength(0)
    vi.useRealTimers()
  })
})
