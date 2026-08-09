import { beforeEach, describe, expect, it, vi } from 'vitest'

const handleFn = vi.fn()
const closeListenerByWindow = new Map<object, (event: { preventDefault: () => void }) => void>()
const confirmedWindows = new WeakSet<object>()
const sends = new Map<object, string[]>()

vi.mock('electron', () => {
  const windows: object[] = []
  return {
    BrowserWindow: {
      fromWebContents: (sender: { window: object }) => sender.window,
      getAllWindows: () => windows
    },
    ipcMain: {
      handle: handleFn
    }
  }
})

describe('app close guard (dirty-close warning)', () => {
  let closeGuardModule: typeof import('../../src/main/app-close-guard')
  let fakeWindow: object

  beforeEach(async () => {
    vi.resetModules()
    handleFn.mockReset()
    sends.clear()
    closeListenerByWindow.clear()

    fakeWindow = {
      on: vi.fn((event: string, listener: (event: { preventDefault: () => void }) => void) => {
        if (event === 'close') closeListenerByWindow.set(fakeWindow, listener)
        return fakeWindow
      }),
      webContents: {
        send: vi.fn((channel: string) => {
          sends.set(fakeWindow, [...(sends.get(fakeWindow) ?? []), channel])
        })
      },
      close: vi.fn(() => {
        confirmedWindows.add(fakeWindow)
      })
    }

    closeGuardModule = await import('../../src/main/app-close-guard')
  })

  it('registers the confirm-close IPC handler', () => {
    const { registerAppCloseGuardIpcHandler } = closeGuardModule
    registerAppCloseGuardIpcHandler()
    expect(handleFn).toHaveBeenCalledWith('app:confirm-close', expect.any(Function))
  })

  it('intercepts close once and asks the renderer before closing', () => {
    const { attachAppCloseGuard } = closeGuardModule
    attachAppCloseGuard(fakeWindow as never)

    const closeEvent = { preventDefault: vi.fn() }
    const listener = closeListenerByWindow.get(fakeWindow)
    expect(listener).toBeDefined()

    listener?.({ preventDefault: closeEvent.preventDefault })
    expect(closeEvent.preventDefault).toHaveBeenCalledTimes(1)
    expect(sends.get(fakeWindow)).toEqual(['app:close-requested'])
  })

  it('does not intercept after the renderer confirms', async () => {
    const { attachAppCloseGuard, registerAppCloseGuardIpcHandler } = closeGuardModule
    attachAppCloseGuard(fakeWindow as never)
    registerAppCloseGuardIpcHandler()

    // Simulate renderer invoke: find the registered handler and call it.
    const handler = handleFn.mock.calls.find((call) => call[0] === 'app:confirm-close')?.[1]
    expect(handler).toBeDefined()
    await handler({ sender: { window: fakeWindow } })

    const closeEvent = { preventDefault: vi.fn() }
    const listener = closeListenerByWindow.get(fakeWindow)
    listener?.({ preventDefault: closeEvent.preventDefault })
    expect(closeEvent.preventDefault).not.toHaveBeenCalled()
  })
})
