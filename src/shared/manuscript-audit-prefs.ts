/** Local-only manuscript audit prefs (written under Electron userData). */
export type ManuscriptAuditPrefsV1 = {
  version: 1
  unpaywallEmail?: string
  llmEnabled?: boolean
  llmPresetId?: string
  llmBaseUrl?: string
  llmModel?: string
  selectedTemplateId?: string
  templateStrict?: boolean
  /** User dismissed the Sanad setup guide auto-prompt. */
  sanadSetupDismissed?: boolean
  /** Passage grounding test connection succeeded at least once. */
  sanadConnectionTested?: boolean
}
