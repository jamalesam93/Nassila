import { create } from 'zustand'

interface AppSettingsState {
  notifyOnLongTasks: boolean
  hydrated: boolean
  initialize: () => Promise<void>
  setNotifyOnLongTasks: (enabled: boolean) => Promise<void>
}

let initializePromise: Promise<void> | null = null

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  notifyOnLongTasks: true,
  hydrated: false,

  initialize: async () => {
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      try {
        const settings = (await window.api?.loadSettings()) as Record<string, unknown> | undefined
        set({
          notifyOnLongTasks: settings?.notifyOnLongTasks !== false,
          hydrated: true
        })
      } catch {
        set({ notifyOnLongTasks: true, hydrated: true })
      }
    })()

    return initializePromise
  },

  setNotifyOnLongTasks: async (enabled) => {
    set({ notifyOnLongTasks: enabled })
    try {
      const prev = ((await window.api?.loadSettings()) ?? {}) as Record<string, unknown>
      await window.api?.saveSettings({ ...prev, notifyOnLongTasks: enabled })
    } catch {
      /* ignore */
    }
  }
}))
