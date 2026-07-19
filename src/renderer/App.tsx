import { useEffect } from 'react'
import AppHeader from './components/shell/AppHeader'
import FirstRunBibliographyBanner from './components/shell/FirstRunBibliographyBanner'
import StatusBar from './components/StatusBar'
import WorkerShell from './components/workers/WorkerShell'
import ConfirmDialog from './components/ui/confirm-dialog'
import { useThemeStore } from './stores/theme-store'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { useNetworkStatus } from './hooks/use-network-status'
import { usePredatoryListLifecycle } from './hooks/use-predatory-list-sync'
import { useAppCommands } from './hooks/use-app-commands'
import { useCitationStore } from './stores/citation-store'
import { loadPresets, savePresets } from '../engine/target'
import { useShellStore } from './stores/shell-store'
import AboutModal from './components/AboutModal'
import SanadSetupModal from './components/SanadSetupModal'
import SettingsModal from './components/SettingsModal'
import ToastContainer from './components/ui/toast'
import { useTaskNotifier } from './hooks/use-task-notifier'
import { readStoredLocale } from './i18n/config'
import { useAppSettingsStore } from './stores/app-settings-store'

export default function App() {
  const initializeTheme = useThemeStore((s) => s.initialize)
  const hydrateAppSettings = useShellStore((s) => s.hydrateAppSettings)
  const initializeAppSettings = useAppSettingsStore((s) => s.initialize)
  const { executeCommand } = useAppCommands()

  useTaskNotifier()

  useEffect(() => {
    void initializeTheme()
  }, [initializeTheme])

  useEffect(() => {
    const lang = readStoredLocale()
    if (window.api?.setMenuLocale) {
      void window.api.setMenuLocale(lang)
    }
    void hydrateAppSettings()
    void initializeAppSettings()
  }, [hydrateAppSettings, initializeAppSettings])

  useEffect(() => {
    let cancelled = false

    void loadPresets()
      .then((presets) => {
        if (!cancelled) {
          useCitationStore.getState().setPresets(presets)
        }
      })
      .catch(() => {})

    const unsubscribe = useCitationStore.subscribe((state, previousState) => {
      if (state.presets !== previousState.presets) {
        void savePresets(state.presets).catch(() => {})
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useKeyboardShortcuts()
  useNetworkStatus()
  usePredatoryListLifecycle()

  useEffect(() => {
    return window.api?.onMenuCommand((command) => {
      void executeCommand(command)
    })
  }, [executeCommand])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <FirstRunBibliographyBanner />
      <AboutModal />
      <SanadSetupModal />
      <SettingsModal />
      <ConfirmDialog />
      <ToastContainer />

      <div className="flex flex-1 overflow-hidden">
        <WorkerShell />
      </div>

      <StatusBar />
    </div>
  )
}
