/**
 * Choose the most likely primary markdown artifact from Marker output (prototype).
 * Skips obvious README files; prefers the largest non-empty file by byte size on disk.
 */
export function selectBestMarkdownPath(
  candidates: { path: string; byteLength: number }[]
): string | null {
  if (candidates.length === 0) return null
  const isReadme = (p: string) => /(^|[\\/])readme\.md$/i.test(p)
  const substantial = candidates.filter((c) => c.byteLength > 0 && !isReadme(c.path))
  const pool = substantial.length > 0 ? substantial : candidates
  return pool.reduce((a, b) => (b.byteLength > a.byteLength ? b : a)).path
}

/** Light cleanup so in-text cite parsing sees plain paragraphs. */
export function normalizeMarkerMarkdownForAudit(md: string): string {
  let out = md.replace(/\r\n/g, '\n').trim()
  out = out.replace(/^#{1,6}\s+/gm, '')
  out = out.replace(/^\s*[-*+]\s+/gm, '')
  out = out.replace(/`{3}[\s\S]*?`{3}/g, ' ')
  out = out.replace(/\s+\n/g, '\n')
  out = out.replace(/\n{3,}/g, '\n\n')
  return out.trim()
}
