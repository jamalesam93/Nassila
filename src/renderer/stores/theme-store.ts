import { create } from 'zustand'

type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  setResolved: (resolved: ResolvedTheme) => void
  initialize: () => Promise<void>
}

let initializePromise: Promise<void> | null = null
let unsubscribeSystemTheme: (() => void) | null = null

function applyThemeToDOM(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: 'light',

  setMode: (mode) => {
    const resolved =
      mode === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : mode
    applyThemeToDOM(resolved)
    set({ mode, resolved })
    window.api?.setNativeTheme(mode)
    void (async () => {
      try {
        const prev = ((await window.api?.loadSettings()) ?? {}) as Record<string, unknown>
        await window.api?.saveSettings({ ...prev, theme: mode })
      } catch {
        /* ignore */
      }
    })()
  },

  setResolved: (resolved) => {
    applyThemeToDOM(resolved)
    set({ resolved })
  },

  initialize: async () => {
    if (initializePromise) {
      return initializePromise
    }

    initializePromise = (async () => {
      try {
        const settings = await window.api?.loadSettings()
        const savedMode = (settings?.theme as ThemeMode) ?? 'system'
        const systemTheme = await window.api?.getSystemTheme()
        const resolved =
          savedMode === 'system' ? (systemTheme ?? 'light') : savedMode
        applyThemeToDOM(resolved)
        set({ mode: savedMode, resolved })

        if (!unsubscribeSystemTheme) {
          unsubscribeSystemTheme = window.api?.onSystemThemeChanged((theme) => {
            if (get().mode === 'system') {
              applyThemeToDOM(theme)
              set({ resolved: theme })
            }
          }) ?? null
        }
      } catch {
        applyThemeToDOM('light')
        set({ mode: 'system', resolved: 'light' })
      }
    })()

    return initializePromise
  }
}))
