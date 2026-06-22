import { ipcMain, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ManuscriptAuditPrefsV1 } from '../shared/manuscript-audit-prefs'

export type { ManuscriptAuditPrefsV1 }

const FILENAME = 'manuscript-audit-preferences.json'
const MAX_BYTES = 32_000

function prefsPath(): string {
  return join(app.getPath('userData'), FILENAME)
}

export function registerManuscriptAuditPrefsHandlers(): void {
  ipcMain.handle('manuscriptAudit:loadPrefs', async (): Promise<ManuscriptAuditPrefsV1> => {
    try {
      const raw = await readFile(prefsPath(), 'utf-8')
      if (Buffer.byteLength(raw, 'utf-8') > MAX_BYTES) return { version: 1 }
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object') return { version: 1 }
      const o = parsed as Record<string, unknown>
      const next: ManuscriptAuditPrefsV1 = { version: 1 }
      if (typeof o.unpaywallEmail === 'string' && o.unpaywallEmail.length < 320) next.unpaywallEmail = o.unpaywallEmail
      if (typeof o.llmEnabled === 'boolean') next.llmEnabled = o.llmEnabled
      if (typeof o.llmPresetId === 'string' && o.llmPresetId.length < 80) next.llmPresetId = o.llmPresetId
      if (typeof o.llmBaseUrl === 'string' && o.llmBaseUrl.length < 512) next.llmBaseUrl = o.llmBaseUrl
      if (typeof o.llmModel === 'string' && o.llmModel.length < 256) next.llmModel = o.llmModel
      if (typeof o.selectedTemplateId === 'string' && o.selectedTemplateId.length < 80) next.selectedTemplateId = o.selectedTemplateId
      if (typeof o.templateStrict === 'boolean') next.templateStrict = o.templateStrict
      if (typeof o.markerPdfImportEnabled === 'boolean') next.markerPdfImportEnabled = o.markerPdfImportEnabled
      if (typeof o.markerCommand === 'string' && o.markerCommand.length < 512) next.markerCommand = o.markerCommand
      if (typeof o.markerExtraArgs === 'string' && o.markerExtraArgs.length < 2000) next.markerExtraArgs = o.markerExtraArgs
      if (typeof o.sanadSetupDismissed === 'boolean') next.sanadSetupDismissed = o.sanadSetupDismissed
      if (typeof o.sanadConnectionTested === 'boolean') next.sanadConnectionTested = o.sanadConnectionTested
      return next
    } catch {
      return { version: 1 }
    }
  })

  ipcMain.handle('manuscriptAudit:savePrefs', async (_event, prefs: unknown) => {
    if (!prefs || typeof prefs !== 'object') throw new Error('Invalid preferences')
    const p = prefs as Record<string, unknown>
    const out: ManuscriptAuditPrefsV1 = { version: 1 }
    if (typeof p.unpaywallEmail === 'string' && p.unpaywallEmail.length < 320) out.unpaywallEmail = p.unpaywallEmail
    if (typeof p.llmEnabled === 'boolean') out.llmEnabled = p.llmEnabled
    if (typeof p.llmPresetId === 'string' && p.llmPresetId.length < 80) out.llmPresetId = p.llmPresetId
    if (typeof p.llmBaseUrl === 'string' && p.llmBaseUrl.length < 512) out.llmBaseUrl = p.llmBaseUrl
    if (typeof p.llmModel === 'string' && p.llmModel.length < 256) out.llmModel = p.llmModel
    if (typeof p.selectedTemplateId === 'string' && p.selectedTemplateId.length < 80) out.selectedTemplateId = p.selectedTemplateId
    if (typeof p.templateStrict === 'boolean') out.templateStrict = p.templateStrict
    if (typeof p.markerPdfImportEnabled === 'boolean') out.markerPdfImportEnabled = p.markerPdfImportEnabled
    if (typeof p.markerCommand === 'string' && p.markerCommand.length < 512) out.markerCommand = p.markerCommand
    if (typeof p.markerExtraArgs === 'string' && p.markerExtraArgs.length < 2000) out.markerExtraArgs = p.markerExtraArgs
    if (typeof p.sanadSetupDismissed === 'boolean') out.sanadSetupDismissed = p.sanadSetupDismissed
    if (typeof p.sanadConnectionTested === 'boolean') out.sanadConnectionTested = p.sanadConnectionTested
    const serialized = JSON.stringify(out, null, 2)
    await writeFile(prefsPath(), serialized, 'utf-8')
  })
}
