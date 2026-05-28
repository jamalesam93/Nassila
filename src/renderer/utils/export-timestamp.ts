/** Default filename stem for exported audit reports (filesystem-safe-ish). */
export function manuscriptAuditExportTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z')
}
