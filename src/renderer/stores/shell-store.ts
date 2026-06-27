import { create } from 'zustand'
import type { OutputListFilter } from '../utils/output-filters'

export type AppSurface = 'loop' | 'bibliography'
export type SettingsFocus = 'localModels' | null

interface ShellState {
  rawInput: string
  identifierInput: string
  aboutModalOpen: boolean
  sanadSetupOpen: boolean
  settingsModalOpen: boolean
  settingsFocus: SettingsFocus
  /** Primary IA: manuscript loop or bibliography (Raqim). */
  appSurface: AppSurface
  /** When set, Raqim OutputPanel applies this list filter (e.g. from Tasnif triage in drawer). */
  raqimListFilter: OutputListFilter | null
  bibliographyDrawerOpen: boolean
  bibliographyBusy: boolean
  /** File → Import References feedback (Bibliography tab). */
  bibliographyImportStatus: string
  /** Migrates legacy settings keys on startup. */
  hydrateAppSettings: () => Promise<void>
  setRawInput: (text: string) => void
  setIdentifierInput: (text: string) => void
  setAboutModalOpen: (open: boolean) => void
  setSanadSetupOpen: (open: boolean) => void
  openSanadSetup: () => void
  setSettingsModalOpen: (open: boolean) => void
  openSettingsModal: (focus?: SettingsFocus) => void
  setAppSurface: (surface: AppSurface) => void
  openRaqimWithFilter: (filter: OutputListFilter) => void
  clearRaqimListFilter: () => void
  setBibliographyDrawerOpen: (open: boolean) => void
  toggleBibliographyDrawer: () => void
  setBibliographyBusy: (busy: boolean) => void
  setBibliographyImportStatus: (status: string) => void
}

export const useShellStore = create<ShellState>((set) => ({
  rawInput: '',
  identifierInput: '',
  aboutModalOpen: false,
  sanadSetupOpen: false,
  settingsModalOpen: false,
  settingsFocus: null,
  appSurface: 'loop',
  raqimListFilter: null,
  bibliographyDrawerOpen: false,
  bibliographyBusy: false,
  bibliographyImportStatus: '',
  hydrateAppSettings: async () => {
    try {
      const prev = (await window.api?.loadSettings()) as Record<string, unknown> | undefined
      if (prev && 'appMode' in prev) {
        const next = { ...prev }
        delete next.appMode
        await window.api?.saveSettings(next)
      }
    } catch {
      /* noop */
    }
  },
  setRawInput: (rawInput) => set({ rawInput }),
  setIdentifierInput: (identifierInput) => set({ identifierInput }),
  setAboutModalOpen: (aboutModalOpen) => set({ aboutModalOpen }),
  setSanadSetupOpen: (sanadSetupOpen) => set({ sanadSetupOpen }),
  openSanadSetup: () => set({ sanadSetupOpen: true }),
  setSettingsModalOpen: (open) =>
    set(open ? { settingsModalOpen: true } : { settingsModalOpen: false, settingsFocus: null }),
  openSettingsModal: (focus = null) => set({ settingsModalOpen: true, settingsFocus: focus }),
  setAppSurface: (appSurface) => set({ appSurface }),
  openRaqimWithFilter: (filter) =>
    set({ appSurface: 'bibliography', raqimListFilter: filter, bibliographyDrawerOpen: true }),
  clearRaqimListFilter: () => set({ raqimListFilter: null }),
  setBibliographyDrawerOpen: (bibliographyDrawerOpen) => set({ bibliographyDrawerOpen }),
  toggleBibliographyDrawer: () =>
    set((s) => ({ bibliographyDrawerOpen: !s.bibliographyDrawerOpen })),
  setBibliographyBusy: (bibliographyBusy) => set({ bibliographyBusy }),
  setBibliographyImportStatus: (bibliographyImportStatus) => set({ bibliographyImportStatus })
}))
