/**
 * Declarative IPC policy table for the Ouroboros trust boundary (extends
 * SEC-01/03/04 in docs/SECURITY-FIX-PLAN.md).
 *
 * Every channel registered in src/main/ and every channel exposed in
 * src/preload/ must appear here exactly once; tests/unit/ipc-policy.test.ts
 * audits the registration surface against this table so new handlers cannot
 * ship without a policy entry.
 */

export type IpcPolicyDirection = 'renderer-to-main' | 'main-to-renderer'

export type IpcPolicyNetworkScope =
  | 'none'
  | 'registry'
  | 'oa_fetch'
  | 'llm'
  | 'predatory_sync'
  | 'probe'
  | 'composite_audit'

export type IpcPolicyInput =
  | 'sanitized'
  | 'typed'
  | 'none'

export interface IpcPolicyEntry {
  channel: string
  direction: IpcPolicyDirection
  /** Where the handler/emitter is registered, relative to src/main/. */
  handler: string
  networkScope: IpcPolicyNetworkScope
  /** How renderer-supplied input is treated by the handler path. */
  input: IpcPolicyInput
  notes: string
}

export const IPC_POLICY: readonly IpcPolicyEntry[] = [
  // ── File dialogs ──────────────────────────────────────────────────────────
  { channel: 'dialog:open-file', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'sanitizeOpenDialogOptions; result paths pinned via allowReadablePaths (SEC-01)' },
  { channel: 'dialog:save-file', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'sanitizeSaveDialogOptions; writable path pinned via allowWritablePath (SEC-01)' },

  // ── File I/O ──────────────────────────────────────────────────────────────
  { channel: 'fs:read-file', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'assertAllowedPath on readablePaths allowlist (SEC-01)' },
  { channel: 'fs:read-file-binary', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'assertAllowedPath on readablePaths allowlist (SEC-01)' },
  { channel: 'fs:write-file', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'assertAllowedPath on writablePaths; content type check (SEC-01)' },
  { channel: 'sourceArtifact:attach', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'assertAllowedPath then attachSourcePdf (SEC-01)' },

  // ── Presets / settings / theme / app ──────────────────────────────────────
  { channel: 'presets:load', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'presets:save', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'Array check + serializeConfigPayload' },
  { channel: 'settings:load', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'settings:save', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'object shape check + serializeConfigPayload' },
  { channel: 'theme:get-system', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'theme:set-native', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'validateThemeMode enum check' },
  { channel: 'app:get-about', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'app:set-menu-locale', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'sanitized', notes: 'locale coerced to en|ar enum' },

  // ── Network status ────────────────────────────────────────────────────────
  { channel: 'network:check', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'probe', input: 'typed', notes: 'opts type check; connectivity probe only' },

  // ── Notifications ─────────────────────────────────────────────────────────
  { channel: 'notify:show', direction: 'renderer-to-main', handler: 'notification.ts', networkScope: 'none', input: 'sanitized', notes: 'sanitizeNotifyText + length caps (SEC-03)' },

  // ── Registry verification (L1/L2) ─────────────────────────────────────────
  { channel: 'registry:searchJournals', direction: 'renderer-to-main', handler: 'ipc-registry.ts', networkScope: 'registry', input: 'sanitized', notes: 'Crossref journal search; typed query/rows' },
  { channel: 'registry:verifyUnified', direction: 'renderer-to-main', handler: 'ipc-registry.ts', networkScope: 'registry', input: 'sanitized', notes: 'unified L1+L2 verify; MAX_VERIFICATION_ITEMS cap' },
  { channel: 'registry:lookupRaqimCandidates', direction: 'renderer-to-main', handler: 'ipc-registry.ts', networkScope: 'registry', input: 'sanitized', notes: 'Raqim candidate search; sanitized request' },
  { channel: 'registry:resolveManuscriptItem', direction: 'renderer-to-main', handler: 'ipc-registry.ts', networkScope: 'registry', input: 'sanitized', notes: 'sanitizeCslItem gate; registry resolve' },
  { channel: 'registry:alignManuscriptMetadata', direction: 'renderer-to-main', handler: 'ipc-registry.ts', networkScope: 'registry', input: 'sanitized', notes: 'sanitizeCslItem ×2 + sanitizeRegistrySource' },
  { channel: 'registry:resolveWebpageMetadata', direction: 'renderer-to-main', handler: 'ipc-registry.ts', networkScope: 'oa_fetch', input: 'sanitized', notes: 'URL policy check; webpage metadata fetch' },

  // ── Open access / URL fetch (main-process only) ───────────────────────────
  { channel: 'oa:unpaywall', direction: 'renderer-to-main', handler: 'ipc-oa.ts', networkScope: 'oa_fetch', input: 'sanitized', notes: 'DOI validation + Unpaywall API (SEC-04)' },
  { channel: 'oa:europePmcJatsByPmcid', direction: 'renderer-to-main', handler: 'ipc-oa.ts', networkScope: 'oa_fetch', input: 'sanitized', notes: 'PMCID validation + Europe PMC JATS (SEC-04)' },
  { channel: 'url:fetchHtml', direction: 'renderer-to-main', handler: 'ipc-oa.ts', networkScope: 'oa_fetch', input: 'sanitized', notes: 'HTML_FETCH_URL_POLICY (https-only, no private hosts)' },
  { channel: 'oa:fetchOaUrl', direction: 'renderer-to-main', handler: 'ipc-oa.ts', networkScope: 'oa_fetch', input: 'sanitized', notes: 'OA_FETCH_URL_POLICY SSRF guard (SEC-04)' },

  // ── Maktab OCR (local Tesseract) ──────────────────────────────────────────
  { channel: 'maktab:ocrAvailable', direction: 'renderer-to-main', handler: 'ipc-maktab.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'maktab:ocrExtract', direction: 'renderer-to-main', handler: 'ipc-maktab.ts', networkScope: 'none', input: 'sanitized', notes: 'buffer size cap + language/dpi clamps' },
  { channel: 'maktab:extractionCacheInfo', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'none', notes: 'no renderer input; counts sha256.json in userData/source-artifacts' },
  { channel: 'maktab:clearExtractionCache', direction: 'renderer-to-main', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'none', notes: 'no renderer input; deletes only pinned cache files (SEC-01)' },

  // ── Secrets / LLM (main-process only) ─────────────────────────────────────
  { channel: 'secrets:isEncryptionAvailable', direction: 'renderer-to-main', handler: 'ipc-llm.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'secrets:hasLlmKey', direction: 'renderer-to-main', handler: 'ipc-llm.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'secrets:setLlmKey', direction: 'renderer-to-main', handler: 'ipc-llm.ts', networkScope: 'none', input: 'sanitized', notes: 'string + length checks; safeStorage encrypt (SEC-03)' },
  { channel: 'secrets:clearLlmKey', direction: 'renderer-to-main', handler: 'ipc-llm.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'llm:chat', direction: 'renderer-to-main', handler: 'ipc-llm.ts', networkScope: 'llm', input: 'sanitized', notes: 'executeLlmChat config/messages checks + llm-url policy; localhost-first key (SEC-03)' },

  // ── Manuscript audit / Ouroboros loop ─────────────────────────────────────
  { channel: 'manuscriptAudit:start', direction: 'renderer-to-main', handler: 'ipc-manuscript-audit.ts', networkScope: 'composite_audit', input: 'sanitized', notes: 'sanitizeManuscriptAuditStartRequest; registry+OA+LLM per request (SEC-03)' },
  { channel: 'manuscriptAudit:cancel', direction: 'renderer-to-main', handler: 'ipc-manuscript-audit.ts', networkScope: 'none', input: 'sanitized', notes: 'isValidAuditRunId gate' },
  { channel: 'manuscriptAudit:readTrail', direction: 'renderer-to-main', handler: 'ipc-manuscript-audit.ts', networkScope: 'none', input: 'sanitized', notes: 'isValidAuditRunId; reads userData/audit-trails only' },
  { channel: 'manuscriptAudit:exportTrail', direction: 'renderer-to-main', handler: 'ipc-manuscript-audit.ts', networkScope: 'none', input: 'sanitized', notes: 'sanitizeAuditTrailExportRequest; dialog-chooser target dir' },
  { channel: 'manuscriptAudit:loadPrefs', direction: 'renderer-to-main', handler: 'ipc-manuscript-audit-prefs.ts', networkScope: 'none', input: 'none', notes: 'no renderer input; field-wise revalidation on load' },
  { channel: 'manuscriptAudit:savePrefs', direction: 'renderer-to-main', handler: 'ipc-manuscript-audit-prefs.ts', networkScope: 'none', input: 'sanitized', notes: 'field-by-field sanitize + length caps; 32KB file bound' },

  // ── Predatory journal lists ───────────────────────────────────────────────
  { channel: 'predatory:getList', direction: 'renderer-to-main', handler: 'ipc-predatory-updates.ts', networkScope: 'none', input: 'none', notes: 'no renderer input; bundled list' },
  { channel: 'predatory:getStatus', direction: 'renderer-to-main', handler: 'ipc-predatory-updates.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'predatory:checkForUpdates', direction: 'renderer-to-main', handler: 'ipc-predatory-updates.ts', networkScope: 'predatory_sync', input: 'none', notes: 'remote version check only' },
  { channel: 'predatory:applyUpdate', direction: 'renderer-to-main', handler: 'ipc-predatory-updates.ts', networkScope: 'predatory_sync', input: 'none', notes: 'mirror CSV download + assertValidDownloadedList (SEC-03)' },

  // ── Manuscript templates (userData) ───────────────────────────────────────
  { channel: 'templates:list', direction: 'renderer-to-main', handler: 'ipc-templates.ts', networkScope: 'none', input: 'none', notes: 'no renderer input' },
  { channel: 'templates:save', direction: 'renderer-to-main', handler: 'ipc-templates.ts', networkScope: 'none', input: 'sanitized', notes: 'validateTemplate + sanitizeId (id charset + length)' },
  { channel: 'templates:delete', direction: 'renderer-to-main', handler: 'ipc-templates.ts', networkScope: 'none', input: 'sanitized', notes: 'sanitizeId gate before unlink' },

  // ── Main-to-renderer pushes ───────────────────────────────────────────────
  { channel: 'theme:system-changed', direction: 'main-to-renderer', handler: 'ipc-handlers.ts', networkScope: 'none', input: 'none', notes: 'nativeTheme update broadcast' },
  { channel: 'menu:command', direction: 'main-to-renderer', handler: 'app-menu.ts', networkScope: 'none', input: 'none', notes: 'menu action dispatch' },
  { channel: 'maktab:ocrProgress', direction: 'main-to-renderer', handler: 'ipc-maktab.ts', networkScope: 'none', input: 'none', notes: 'OCR progress push' },
  { channel: 'manuscriptAudit:progress', direction: 'main-to-renderer', handler: 'ipc-manuscript-audit.ts', networkScope: 'none', input: 'none', notes: 'audit run progress push' }
]
