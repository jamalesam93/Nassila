import { create } from 'zustand'

interface ShellState {
  rawInput: string
  identifierInput: string
  aboutModalOpen: boolean
  settingsModalOpen: boolean
  /** Normalizes persisted settings to references-only and syncs main process menu. */
  hydrateAppSettings: () => Promise<void>
  setRawInput: (text: string) => void
  setIdentifierInput: (text: string) => void
  setAboutModalOpen: (open: boolean) => void
  setSettingsModalOpen: (open: boolean) => void
}

export const useShellStore = create<ShellState>((set) => ({
  rawInput: '',
  identifierInput: '',
  aboutModalOpen: false,
  settingsModalOpen: false,
  hydrateAppSettings: async () => {
    try {
      const prev = (await window.api?.loadSettings()) as Record<string, unknown> | undefined
      if (prev && prev.appMode !== 'references') {
        await window.api?.saveSettings({ ...prev, appMode: 'references' })
      }
      await window.api?.setAppMode('references')
    } catch {
      await window.api?.setAppMode('references')
    }
  },
  setRawInput: (rawInput) => set({ rawInput }),
  setIdentifierInput: (identifierInput) => set({ identifierInput }),
  setAboutModalOpen: (aboutModalOpen) => set({ aboutModalOpen }),
  setSettingsModalOpen: (settingsModalOpen) => set({ settingsModalOpen })
}))
