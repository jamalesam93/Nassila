import { useEffect } from 'react'
import Toolbar from './components/Toolbar'
import InputPanel from './components/InputPanel'
import OutputPanel from './components/OutputPanel'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import { useThemeStore } from './stores/theme-store'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { useNetworkStatus } from './hooks/use-network-status'
import { usePredatoryListLifecycle } from './hooks/use-predatory-list-sync'
import { useAppCommands } from './hooks/use-app-commands'
import { useCitationStore } from './stores/citation-store'
import { loadPresets, savePresets } from '../engine/target'
import { useShellStore } from './stores/shell-store'
import AboutModal from './components/AboutModal'
import SettingsModal from './components/SettingsModal'
import { readStoredLocale } from './i18n/config'

export default function App() {
  const initializeTheme = useThemeStore((s) => s.initialize)
  const hydrateAppSettings = useShellStore((s) => s.hydrateAppSettings)
  const { executeCommand } = useAppCommands()

  useEffect(() => {
    void initializeTheme()
  }, [initializeTheme])

  useEffect(() => {
    const lang = readStoredLocale()
    if (window.api?.setMenuLocale) {
      void window.api.setMenuLocale(lang)
    }
    void hydrateAppSettings()
  }, [hydrateAppSettings])

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
      <Toolbar />
      <AboutModal />
      <SettingsModal />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r border-border">
            <InputPanel />
          </div>
          <div className="flex-1 overflow-hidden">
            <OutputPanel />
          </div>
        </div>

        <Sidebar />
      </div>

      <StatusBar />
    </div>
  )
}
