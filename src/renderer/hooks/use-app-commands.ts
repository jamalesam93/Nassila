import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import mammoth from 'mammoth'
import { APP_MENU_COMMANDS, type AppMenuCommand } from '../../shared/app-menu-commands'
import { setAppLocale } from '../i18n/config'
import { useCitationEngine } from './use-citation-engine'
import { useCitationStore } from '../stores/citation-store'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useShellStore } from '../stores/shell-store'
import { useThemeStore } from '../stores/theme-store'

type ThemeMode = 'light' | 'dark' | 'system'

export function useAppCommands() {
  const { t } = useTranslation()
  const setAboutModalOpen = useShellStore((s) => s.setAboutModalOpen)
  const setSettingsModalOpen = useShellStore((s) => s.setSettingsModalOpen)
  const setRawManuscriptText = useManuscriptAuditStore((s) => s.setRawManuscriptText)
  const setAuditError = useManuscriptAuditStore((s) => s.setError)
  const setManuscriptSourceFormat = useManuscriptAuditStore((s) => s.setManuscriptSourceFormat)

  const {
    importFiles,
    exportWithDialog,
    exportCitations,
    runAutocorrect,
    findMissingDoi,
    refreshVerification
  } = useCitationEngine()
  const themeMode = useThemeStore((s) => s.mode)
  const setThemeMode = useThemeStore((s) => s.setMode)

  const importReferences = useCallback(async () => {
    const paths = await window.api?.openFileDialog({ multiSelections: true })
    if (paths && paths.length > 0) {
      await importFiles(paths)
    }
  }, [importFiles])

  const importManuscriptFromPath = useCallback(
    async (first: string) => {
      const ext = first.split('.').pop()?.toLowerCase()
      let text = ''
      let sourceFormat: 'docx' | 'pdf' | 'text' = 'text'

      try {
        if (ext === 'docx') {
          const buf = await window.api?.readFileBinary(first)
          if (buf) {
            const result = await mammoth.extractRawText({ arrayBuffer: buf })
            text = result.value
            sourceFormat = 'docx'
          }
        } else if (ext === 'pdf') {
          const prefs = await window.api?.loadManuscriptAuditPrefs()
          let markerNote: string | null = null

          if (prefs?.markerPdfImportEnabled && window.api?.convertPdfWithMarker) {
            const markerRes = await window.api.convertPdfWithMarker({
              filePath: first,
              markerCommand: prefs.markerCommand,
              markerExtraArgs: prefs.markerExtraArgs
            })
            if (markerRes.ok && markerRes.markdown.trim()) {
              const { normalizeMarkerMarkdownForAudit } = await import(
                '../../engine/manuscript/marker-text'
              )
              text = normalizeMarkerMarkdownForAudit(markerRes.markdown)
              if (markerRes.stderr.trim()) {
                markerNote = markerRes.stderr.trim().slice(0, 500)
              }
            } else if (!markerRes.ok) {
              markerNote = [markerRes.error, markerRes.stderr].filter(Boolean).join(' · ').slice(0, 900)
            } else {
              markerNote = t('manuscriptAudit.markerEmptyOutput')
            }
          }

          if (!text.trim()) {
            const buf = await window.api?.readFileBinary(first)
            if (buf) {
              const { extractManuscriptFromPdf } = await import('../../engine/manuscript/pdf-extract')
              const extraction = await extractManuscriptFromPdf(buf)
              text = extraction.text
              sourceFormat = 'pdf'
              const parts: string[] = []
              if (prefs?.markerPdfImportEnabled && markerNote) {
                parts.push(markerNote, t('manuscriptAudit.markerFallbackPdfjs'))
              } else if (markerNote) {
                parts.push(markerNote)
              }
              if (extraction.warnings.length > 0) {
                parts.push(extraction.warnings.join(' · '))
              }
              if (parts.length > 0) {
                setAuditError(parts.join(' · '))
              } else {
                setAuditError(null)
              }
            }
          } else {
            sourceFormat = 'pdf'
            setAuditError(markerNote)
          }
        } else {
          text = (await window.api?.readFile(first)) ?? ''
        }

        if (!text.trim()) {
          setAuditError(t('manuscriptAudit.importEmpty'))
          return
        }

        setRawManuscriptText(text)
        setManuscriptSourceFormat(sourceFormat)
        if (sourceFormat !== 'pdf') setAuditError(null)
      } catch (e) {
        setAuditError(t('manuscriptAudit.importFailed', { message: (e as Error).message }))
      }
    },
    [setAuditError, setManuscriptSourceFormat, setRawManuscriptText, t]
  )

  const importManuscript = useCallback(async () => {
    try {
      if (!window.api?.openFileDialog) {
        setAuditError(t('manuscriptAudit.importBridgeMissing'))
        return
      }
      const paths = await window.api.openFileDialog({
        filters: [
          { name: 'Manuscript Files', extensions: ['docx', 'pdf', 'txt', 'md'] },
          { name: 'Word Document', extensions: ['docx'] },
          { name: 'PDF', extensions: ['pdf'] },
          { name: 'Plain Text', extensions: ['txt', 'md'] }
        ]
      })
      if (!paths || paths.length === 0) return

      await importManuscriptFromPath(paths[0])
    } catch (e) {
      setAuditError(t('manuscriptAudit.importFailed', { message: (e as Error).message }))
    }
  }, [importManuscriptFromPath, setAuditError, t])

  const exportCslJson = useCallback(async () => {
    const store = useCitationStore.getState()
    if (store.citations.length === 0) return

    const path = await window.api?.saveFileDialog({
      defaultPath: 'citations.json',
      filters: [{ name: 'CSL-JSON', extensions: ['json'] }]
    })
    if (!path) return

    await window.api?.writeFile(path, await exportCitations('csl-json'))
  }, [exportCitations])

  const findMissingDois = useCallback(async () => {
    const missing = useCitationStore.getState().citations.filter((item) => !item.DOI)
    for (const item of missing) {
      await findMissingDoi(item.id)
    }
  }, [findMissingDoi])

  const verifyReferences = useCallback(async () => {
    const store = useCitationStore.getState()
    if (store.networkStatus !== 'online') return
    await refreshVerification(store.citations)
  }, [refreshVerification])

  const detectDuplicates = useCallback(() => {
    useCitationStore.getState().refreshDuplicatesAndPredatory()
  }, [])

  const cycleTheme = useCallback(() => {
    const next: Record<ThemeMode, ThemeMode> = {
      system: 'light',
      light: 'dark',
      dark: 'system'
    }
    setThemeMode(next[themeMode])
  }, [setThemeMode, themeMode])

  const executeCommand = useCallback(async (command: AppMenuCommand) => {
    const store = useCitationStore.getState()

    switch (command) {
      case APP_MENU_COMMANDS.NEW_SESSION:
        store.clearCitations()
        return
      case APP_MENU_COMMANDS.IMPORT_REFERENCES:
        await importReferences()
        return
      case APP_MENU_COMMANDS.EXPORT_BIBLIOGRAPHY:
        await exportWithDialog()
        return
      case APP_MENU_COMMANDS.EXPORT_CSL_JSON:
        await exportCslJson()
        return
      case APP_MENU_COMMANDS.UNDO:
        store.undo()
        return
      case APP_MENU_COMMANDS.REDO:
        store.redo()
        return
      case APP_MENU_COMMANDS.CLEAR_CITATIONS:
        store.clearCitations()
        return
      case APP_MENU_COMMANDS.RUN_AUTOCORRECT:
        await runAutocorrect(true)
        return
      case APP_MENU_COMMANDS.FIND_MISSING_DOIS:
        await findMissingDois()
        return
      case APP_MENU_COMMANDS.VERIFY_ONLINE:
        await verifyReferences()
        return
      case APP_MENU_COMMANDS.DETECT_DUPLICATES:
        detectDuplicates()
        return
      case APP_MENU_COMMANDS.SELECT_STYLE:
        document.querySelector<HTMLInputElement>('[data-style-search-input]')?.focus()
        return
      case APP_MENU_COMMANDS.SET_THEME_SYSTEM:
        setThemeMode('system')
        return
      case APP_MENU_COMMANDS.SET_THEME_LIGHT:
        setThemeMode('light')
        return
      case APP_MENU_COMMANDS.SET_THEME_DARK:
        setThemeMode('dark')
        return
      case APP_MENU_COMMANDS.TOGGLE_THEME:
        cycleTheme()
        return
      case APP_MENU_COMMANDS.SHOW_SETTINGS:
        setSettingsModalOpen(true)
        return
      case APP_MENU_COMMANDS.SHOW_ABOUT:
        setAboutModalOpen(true)
        return
      case APP_MENU_COMMANDS.SET_LOCALE_EN:
        setAppLocale('en')
        return
      case APP_MENU_COMMANDS.SET_LOCALE_AR:
        setAppLocale('ar')
        return
      default:
        return
    }
  }, [
    cycleTheme,
    detectDuplicates,
    exportCslJson,
    exportWithDialog,
    findMissingDois,
    importReferences,
    runAutocorrect,
    setAboutModalOpen,
    setSettingsModalOpen,
    setThemeMode,
    verifyReferences
  ])

  return {
    cycleTheme,
    detectDuplicates,
    executeCommand,
    exportCslJson,
    exportBibliography: exportWithDialog,
    findMissingDois,
    importManuscript,
    importManuscriptFromPath,
    importReferences,
    runAutocorrect,
    verifyReferences
  }
}
