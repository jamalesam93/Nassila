import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import mammoth from 'mammoth'
import { APP_MENU_COMMANDS, type AppMenuCommand } from '../../shared/app-menu-commands'
import { MAX_VERIFICATION_ITEMS } from '../../shared/verification-limits'
import { exportReportJson, exportReportMarkdown } from '../../engine/audit/report'
import { translatePdfImportWarnings } from '../utils/grounding-i18n'
import { setAppLocale } from '../i18n/config'
import { pushToast } from '../lib/notify'
import { useCitationEngine } from './use-citation-engine'
import { useCitationStore } from '../stores/citation-store'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useShellStore } from '../stores/shell-store'
import { useThemeStore } from '../stores/theme-store'
import { manuscriptAuditExportTimestamp } from '../utils/export-timestamp'
import {
  applyNassilaProject,
  clearFullSession,
  parseNassilaProject,
  serializeNassilaProject,
  sessionIsDirty,
  snapshotNassilaProject
} from '../utils/nassila-project-io'

type ThemeMode = 'light' | 'dark' | 'system'

export function useAppCommands() {
  const { t } = useTranslation()
  const setAboutModalOpen = useShellStore((s) => s.setAboutModalOpen)
  const setSettingsModalOpen = useShellStore((s) => s.setSettingsModalOpen)
  const setRawManuscriptText = useManuscriptAuditStore((s) => s.setRawManuscriptText)
  const setAuditError = useManuscriptAuditStore((s) => s.setError)
  const setManuscriptSourceFormat = useManuscriptAuditStore((s) => s.setManuscriptSourceFormat)
  const setAppSurface = useShellStore((s) => s.setAppSurface)

  const {
    importFiles,
    exportCitations,
    runAutocorrect,
    findMissingDoi,
    refreshVerification
  } = useCitationEngine()
  const themeMode = useThemeStore((s) => s.mode)
  const setThemeMode = useThemeStore((s) => s.setMode)

  const importReferences = useCallback(async () => {
    const paths = await window.api?.openFileDialog({ multiSelections: true })
    if (!paths?.length) return

    const setBibliographyImportStatus = useShellStore.getState().setBibliographyImportStatus
    setBibliographyImportStatus('')
    const summary = await importFiles(paths)
    const fileLabel =
      paths.length === 1
        ? (paths[0].split(/[/\\]/).pop() ?? paths[0])
        : t('inputPanel.importMultiFiles', { count: paths.length })

    if (summary.totalItems > 0) {
      setBibliographyImportStatus(
        t('inputPanel.importStatus', { count: summary.totalItems, file: fileLabel })
      )
    } else if (summary.errors.length > 0) {
      setBibliographyImportStatus(
        t('inputPanel.parseStatusErrors', { errors: summary.errors.join('; ') })
      )
    } else {
      setBibliographyImportStatus(t('inputPanel.parseStatusNone'))
    }
  }, [importFiles, t])

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
          const buf = await window.api?.readFileBinary(first)
          if (buf) {
            const { extractFromPdf } = await import('../../engine/maktab/extract')
            const enhancedOcr = useManuscriptAuditStore.getState().enhancedOcr
            const extraction = await extractFromPdf(buf, {
              mode: enhancedOcr ? 'ocr_preferred' : 'auto'
            })
            text = extraction.text
            sourceFormat = 'pdf'
            if (extraction.warnings.length > 0) {
              setAuditError(translatePdfImportWarnings(extraction.warnings))
            } else {
              setAuditError(null)
            }
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
        setAppSurface('loop')
        if (sourceFormat !== 'pdf') setAuditError(null)
      } catch (e) {
        setAuditError(t('manuscriptAudit.importFailed', { message: (e as Error).message }))
      }
    },
    [setAppSurface, setAuditError, setManuscriptSourceFormat, setRawManuscriptText, t]
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

    try {
      await window.api?.writeFile(path, await exportCitations('csl-json'))
      const file = path.split(/[/\\]/).pop() ?? path
      pushToast('success', t('notifications.exported', { file }))
    } catch (e) {
      pushToast('error', t('notifications.exportFailed', { message: (e as Error).message }))
    }
  }, [exportCitations, t])

  const findMissingDois = useCallback(async () => {
    const store = useCitationStore.getState()
    if (store.networkStatus !== 'online') {
      pushToast('warn', t('notifications.offline'))
      return
    }
    const missing = store.citations.filter((item) => !item.DOI)
    let found = 0
    for (const item of missing) {
      const logs = await findMissingDoi(item.id)
      if (logs.length > 0) found += 1
    }
    pushToast('success', t('notifications.doiFound', { found, total: missing.length }))
  }, [findMissingDoi, t])

  const verifyReferences = useCallback(async () => {
    const store = useCitationStore.getState()
    if (store.networkStatus !== 'online') {
      pushToast('warn', t('notifications.offline'))
      return
    }
    if (store.citations.length === 0) return
    try {
      await refreshVerification(store.citations)
      const mismatches = useCitationStore.getState().verificationMismatches.length
      const verified = Math.min(store.citations.length, MAX_VERIFICATION_ITEMS)
      pushToast('success', t('notifications.verifyComplete', { verified, mismatches }))
    } catch (e) {
      pushToast('error', t('notifications.verifyFailed', { message: (e as Error).message }))
    }
  }, [refreshVerification, t])

  const detectDuplicates = useCallback(() => {
    useCitationStore.getState().refreshDuplicatesAndPredatory()
  }, [])

  const exportManuscriptAuditJson = useCallback(async () => {
    const report = useManuscriptAuditStore.getState().report
    if (!report) return
    const stamp = manuscriptAuditExportTimestamp()
    const path = await window.api?.saveFileDialog({
      defaultPath: `manuscript-audit_${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (!path) return
    try {
      await window.api?.writeFile(path, exportReportJson(report))
      const file = path.split(/[/\\]/).pop() ?? path
      pushToast('success', t('notifications.exported', { file }))
    } catch (e) {
      pushToast('error', t('notifications.exportFailed', { message: (e as Error).message }))
    }
  }, [t])

  const exportManuscriptAuditMarkdown = useCallback(async () => {
    const report = useManuscriptAuditStore.getState().report
    if (!report) return
    const stamp = manuscriptAuditExportTimestamp()
    const path = await window.api?.saveFileDialog({
      defaultPath: `manuscript-audit_${stamp}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (!path) return
    try {
      await window.api?.writeFile(path, exportReportMarkdown(report))
      const file = path.split(/[/\\]/).pop() ?? path
      pushToast('success', t('notifications.exported', { file }))
    } catch (e) {
      pushToast('error', t('notifications.exportFailed', { message: (e as Error).message }))
    }
  }, [t])

  const runAutocorrectWithNotify = useCallback(async (useOnline = true) => {
    const log = await runAutocorrect(useOnline)
    if (log.length > 0) {
      pushToast('success', t('notifications.autocorrectComplete', { count: log.length }))
    } else {
      pushToast('info', t('notifications.autocorrectNone'))
    }
    return log
  }, [runAutocorrect, t])

  const exportBibliographyWithNotify = useCallback(async (): Promise<void> => {
    const store = useCitationStore.getState()
    if (store.citations.length === 0) return

    const path = await window.api?.saveFileDialog()
    if (!path) return

    const ext = path.split('.').pop()?.toLowerCase()
    const format = ext === 'txt' ? 'plain-text' : 'csl-json'
    try {
      const content = await exportCitations(format)
      await window.api?.writeFile(path, content)
      const file = path.split(/[/\\]/).pop() ?? path
      pushToast('success', t('notifications.exported', { file }))
    } catch (e) {
      pushToast('error', t('notifications.exportFailed', { message: (e as Error).message }))
    }
  }, [exportCitations, t])

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
        if (sessionIsDirty()) {
          const ok = window.confirm(t('project.newSessionConfirm'))
          if (!ok) return
        }
        clearFullSession()
        return
      case APP_MENU_COMMANDS.OPEN_PROJECT: {
        if (sessionIsDirty()) {
          const ok = window.confirm(t('project.openConfirmDirty'))
          if (!ok) return
        }
        const paths = await window.api?.openFileDialog({
          filters: [{ name: 'Nassila project', extensions: ['nassila', 'json'] }],
          multiSelections: false
        })
        if (!paths?.[0] || !window.api) return
        try {
          const raw = await window.api.readFile(paths[0])
          applyNassilaProject(parseNassilaProject(raw))
          pushToast(t('project.opened'))
        } catch (err) {
          pushToast(err instanceof Error ? err.message : t('project.openFailed'))
        }
        return
      }
      case APP_MENU_COMMANDS.SAVE_PROJECT: {
        if (!window.api) return
        const path = await window.api.saveFileDialog({
          defaultPath: 'manuscript.nassila',
          filters: [{ name: 'Nassila project', extensions: ['nassila'] }]
        })
        if (!path) return
        try {
          await window.api.writeFile(path, serializeNassilaProject(snapshotNassilaProject()))
          pushToast(t('project.saved'))
        } catch (err) {
          pushToast(err instanceof Error ? err.message : t('project.saveFailed'))
        }
        return
      }
      case APP_MENU_COMMANDS.IMPORT_REFERENCES:
        await importReferences()
        return
      case APP_MENU_COMMANDS.EXPORT_BIBLIOGRAPHY:
        await exportBibliographyWithNotify()
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
      case APP_MENU_COMMANDS.OPEN_DOCS:
      case APP_MENU_COMMANDS.REPORT_ISSUE:
        // Handled in main menu via shell.openExternal
        return
      case APP_MENU_COMMANDS.RUN_AUTOCORRECT:
        await runAutocorrectWithNotify(true)
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
    exportBibliographyWithNotify,
    findMissingDois,
    importReferences,
    runAutocorrectWithNotify,
    setAboutModalOpen,
    setSettingsModalOpen,
    setThemeMode,
    t,
    verifyReferences
  ])

  return {
    cycleTheme,
    detectDuplicates,
    executeCommand,
    exportCslJson,
    exportBibliography: exportBibliographyWithNotify,
    exportManuscriptAuditJson,
    exportManuscriptAuditMarkdown,
    findMissingDois,
    importManuscript,
    importManuscriptFromPath,
    importReferences,
    runAutocorrect: runAutocorrectWithNotify,
    verifyReferences
  }
}
