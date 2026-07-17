/** Shared citation row DOM id + scroll helpers for OutputPanel / IssuePanel / loop jump. */

export function citationRowId(id: string, index?: number): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return index !== undefined ? `citation-row-${index}-${safe}` : `citation-row-${safe}`
}

export function scrollToCitationRow(citationId: string): boolean {
  const exact = document.getElementById(citationRowId(citationId))
  if (exact) {
    exact.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return true
  }
  const safe = citationId.replace(/[^a-zA-Z0-9_-]/g, '-')
  const el = document.querySelector<HTMLElement>(`[id^="citation-row-"][id$="-${CSS.escape(safe)}"]`)
  if (!el) return false
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}
