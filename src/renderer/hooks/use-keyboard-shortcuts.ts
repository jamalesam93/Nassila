import { useEffect } from 'react'
import { APP_MENU_COMMANDS } from '../../shared/app-menu-commands'
import { useAppCommands } from './use-app-commands'

export function useKeyboardShortcuts(): void {
  const { executeCommand } = useAppCommands()

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        void executeCommand(APP_MENU_COMMANDS.UNDO)
      }

      if (ctrl && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault()
        void executeCommand(APP_MENU_COMMANDS.REDO)
      }

      if (ctrl && e.key === 'i') {
        e.preventDefault()
        void executeCommand(APP_MENU_COMMANDS.IMPORT_REFERENCES)
      }

      if (ctrl && e.key === 'e') {
        e.preventDefault()
        void executeCommand(e.shiftKey ? APP_MENU_COMMANDS.EXPORT_CSL_JSON : APP_MENU_COMMANDS.EXPORT_BIBLIOGRAPHY)
      }

      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        void executeCommand(APP_MENU_COMMANDS.RUN_AUTOCORRECT)
      }

      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        void executeCommand(APP_MENU_COMMANDS.FIND_MISSING_DOIS)
      }

      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        void executeCommand(APP_MENU_COMMANDS.VERIFY_ONLINE)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [executeCommand])
}
