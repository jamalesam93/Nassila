import { contextBridge, ipcRenderer } from 'electron'
import type { AppMenuCommand } from '../shared/app-menu-commands'
import type { AppMode } from '../shared/app-mode'
import type { ManuscriptAuditPrefsV1 } from '../shared/manuscript-audit-prefs'
import type { PredatoryList, PredatoryListMeta, UpdateCheckResult } from '../shared/predatory'

export type ThemeMode = 'light' | 'dark' | 'system'
export type NetworkStatus = 'online' | 'offline'
export type LlmChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type LlmConfig = { baseUrl: string; model: string }
export type StructureTemplate = { id: string; name: string; headings: Record<string, string[]> }

export type { ManuscriptAuditPrefsV1 }
export type { PredatoryList, PredatoryListMeta, UpdateCheckResult }
const api = {
  // ── File Dialogs ──────────────────────────────────────────────────────
  openFileDialog: (options?: {
    filters?: { name: string; extensions: string[] }[]
    multiSelections?: boolean
  }): Promise<string[] | null> =>
    ipcRenderer.invoke('dialog:open-file', options ?? {}),

  saveFileDialog: (options?: {
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }): Promise<string | null> =>
    ipcRenderer.invoke('dialog:save-file', options ?? {}),

  // ── File I/O ──────────────────────────────────────────────────────────
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('fs:read-file', filePath),

  readFileBinary: (filePath: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('fs:read-file-binary', filePath),

  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:write-file', filePath, content),

  // ── Presets ───────────────────────────────────────────────────────────
  loadPresets: (): Promise<unknown[]> =>
    ipcRenderer.invoke('presets:load'),

  savePresets: (presets: unknown[]): Promise<void> =>
    ipcRenderer.invoke('presets:save', presets),

  // ── Settings ──────────────────────────────────────────────────────────
  loadSettings: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('settings:load'),

  saveSettings: (settings: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('settings:save', settings),

  // ── Theme ─────────────────────────────────────────────────────────────
  getSystemTheme: (): Promise<'light' | 'dark'> =>
    ipcRenderer.invoke('theme:get-system'),

  setNativeTheme: (mode: ThemeMode): Promise<void> =>
    ipcRenderer.invoke('theme:set-native', mode),

  onSystemThemeChanged: (callback: (theme: 'light' | 'dark') => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, theme: 'light' | 'dark') => callback(theme)
    ipcRenderer.on('theme:system-changed', listener)
    return () => {
      ipcRenderer.removeListener('theme:system-changed', listener)
    }
  },

  // ── Application Menu ───────────────────────────────────────────────────
  onMenuCommand: (callback: (command: AppMenuCommand) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, command: AppMenuCommand) => callback(command)
    ipcRenderer.on('menu:command', listener)
    return () => {
      ipcRenderer.removeListener('menu:command', listener)
    }
  },

  // ── Network ───────────────────────────────────────────────────────────
  checkNetwork: (): Promise<NetworkStatus> =>
    ipcRenderer.invoke('network:check'),

  // ── Open Access (main-process only) ────────────────────────────────────
  unpaywall: (doi: string, email?: string): Promise<unknown> =>
    ipcRenderer.invoke('oa:unpaywall', doi, email),

  europePmcJatsByPmcid: (pmcid: string): Promise<{ source: 'europe_pmc'; url: string; jatsXml: string }> =>
    ipcRenderer.invoke('oa:europePmcJatsByPmcid', pmcid),

  fetchOaUrl: (
    url: string
  ): Promise<{
    url: string
    contentType: string | null
    kind: string
    text?: string
    pdfBytes?: ArrayBuffer
    blocked?: boolean
    status?: number
  }> => ipcRenderer.invoke('oa:fetchOaUrl', url),

  fetchHtml: (
    url: string
  ): Promise<{
    ok: boolean
    status: number
    contentType: string | null
    finalUrl: string
    html: string
    error?: string
  }> => ipcRenderer.invoke('url:fetchHtml', url),

  // ── Secrets / LLM (main-process only) ───────────────────────────────────
  isEncryptionAvailable: (): Promise<boolean> =>
    ipcRenderer.invoke('secrets:isEncryptionAvailable'),

  hasLlmKey: (): Promise<boolean> =>
    ipcRenderer.invoke('secrets:hasLlmKey'),

  setLlmKey: (apiKey: string, options?: { allowShortPlaceholder?: boolean }): Promise<void> =>
    ipcRenderer.invoke('secrets:setLlmKey', apiKey, options ?? undefined),

  clearLlmKey: (): Promise<void> =>
    ipcRenderer.invoke('secrets:clearLlmKey'),

  llmChat: (config: LlmConfig, messages: LlmChatMessage[]): Promise<string> =>
    ipcRenderer.invoke('llm:chat', config, messages),

  loadManuscriptAuditPrefs: (): Promise<ManuscriptAuditPrefsV1> =>
    ipcRenderer.invoke('manuscriptAudit:loadPrefs'),

  saveManuscriptAuditPrefs: (prefs: ManuscriptAuditPrefsV1): Promise<void> =>
    ipcRenderer.invoke('manuscriptAudit:savePrefs', prefs),

  // ── Templates (userData) ───────────────────────────────────────────────
  listTemplates: (): Promise<StructureTemplate[]> =>
    ipcRenderer.invoke('templates:list'),

  saveTemplate: (template: StructureTemplate): Promise<void> =>
    ipcRenderer.invoke('templates:save', template),

  deleteTemplate: (id: string): Promise<void> =>
    ipcRenderer.invoke('templates:delete', id),

  getAppAbout: (): Promise<{ name: string; version: string }> =>
    ipcRenderer.invoke('app:get-about'),

  setMenuLocale: (locale: 'en' | 'ar'): Promise<void> =>
    ipcRenderer.invoke('app:set-menu-locale', locale),

  setAppMode: (mode: AppMode): Promise<void> => ipcRenderer.invoke('app:set-app-mode', mode),

  predatory: {
    getList: (): Promise<PredatoryList> => ipcRenderer.invoke('predatory:getList'),
    getStatus: (): Promise<PredatoryListMeta> => ipcRenderer.invoke('predatory:getStatus'),
    checkForUpdates: (): Promise<UpdateCheckResult> => ipcRenderer.invoke('predatory:checkForUpdates'),
    applyUpdate: (): Promise<{ meta: PredatoryListMeta; list: PredatoryList }> =>
      ipcRenderer.invoke('predatory:applyUpdate')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
