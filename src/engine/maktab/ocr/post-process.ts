/**
 * Shared text cleanup for tier A (pdf.js) and tier B (OCR) output.
 */

export function normalizeExtractedText(text: string): string {
  let out = text
  out = out
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')
  out = out.replace(/([A-Za-z]{2,})-\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/([A-Za-z]{2,})-\s*\n([a-z]{2,})/g, '$1$2')
  out = out.replace(/\n{3,}/g, '\n\n')
  out = out.replace(/[ \t]+\n/g, '\n')
  return out.trim()
}

/** Heuristic: pdf.js warned that very little text was extracted. */
export function embeddedTextLooksSparse(warnings: string[]): boolean {
  return warnings.some((w) => /very little text/i.test(w))
}
