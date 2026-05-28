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
  /** Experimental: run external Marker CLI for PDF manuscript import */
  markerPdfImportEnabled?: boolean
  /** Executable or full path (e.g. marker_single, or path to .exe) */
  markerCommand?: string
  /** Extra CLI args as a single whitespace-separated string */
  markerExtraArgs?: string
}
