import type { ShahidCiteSiteRef, ShahidEvidence } from './types'

const PAGE_HINT_RE = /\b(?:p{1,2}\.?|pages?)\s*(\d+)(?:\s*[-–—]\s*(\d+))?/i
const TABLE_REF_RE = /\b(?:tables?)\s+(\d+[A-Za-z]?)\b/i
const FIGURE_REF_RE = /\b(?:figures?|figs?\.?)\s+(\d+[A-Za-z]?)\b/i
const CAPTION_NUM_RE = /^(?:Figure|Fig\.?|Table)\s+(\d+[A-Za-z]?)\b/i

/**
 * Best-effort page / proximity linking of Shahid evidence to cite sites.
 * Unlinked rows keep evidence but set reviewState to `abstain`.
 * Linked rows stay `needs_review` (never auto-accepted).
 */
export function linkEvidenceToCiteSites(
  evidence: ShahidEvidence[],
  citeSites: ShahidCiteSiteRef[]
): ShahidEvidence[] {
  if (evidence.length === 0) return []
  if (citeSites.length === 0) {
    return evidence.map((row) => ({ ...row, reviewState: 'abstain' as const, citeSiteId: undefined, claim: undefined }))
  }

  return evidence.map((row) => {
    const match = findBestCiteSite(row, citeSites)
    if (!match) {
      return {
        ...row,
        reviewState: 'abstain',
        citeSiteId: undefined,
        claim: undefined
      }
    }
    return {
      ...row,
      citeSiteId: match.citeSiteId,
      claim: match.claim,
      reviewState: 'needs_review'
    }
  })
}

function findBestCiteSite(
  row: ShahidEvidence,
  citeSites: ShahidCiteSiteRef[]
): { citeSiteId: string; claim?: string } | null {
  const captionNum = row.caption ? CAPTION_NUM_RE.exec(row.caption)?.[1]?.toLowerCase() : undefined
  const captionIsTable = row.caption ? /^table\b/i.test(row.caption) : row.regionKind === 'table'

  let best: { citeSiteId: string; claim?: string; score: number } | null = null

  for (const site of citeSites) {
    let score = 0
    const pages = pagesFromHints(site.pageHint, site.locator)
    if (row.page != null && pages.has(row.page)) score += 3

    const haystack = [site.passageWindow, site.locator, ...(site.claims ?? [])].filter(Boolean).join(' ')
    if (captionNum && haystack) {
      const tableRef = TABLE_REF_RE.exec(haystack)
      const figRef = FIGURE_REF_RE.exec(haystack)
      if (captionIsTable && tableRef && tableRef[1]!.toLowerCase() === captionNum) score += 4
      if (!captionIsTable && figRef && figRef[1]!.toLowerCase() === captionNum) score += 4
      if (row.regionKind === 'table' && tableRef && tableRef[1]!.toLowerCase() === captionNum) score += 4
      if (row.regionKind === 'figure' && figRef && figRef[1]!.toLowerCase() === captionNum) score += 4
    }

    if (score <= 0) continue
    if (!best || score > best.score) {
      const claim =
        site.claims?.find((c) => {
          if (!captionNum) return false
          if (captionIsTable || row.regionKind === 'table') {
            const m = TABLE_REF_RE.exec(c)
            return Boolean(m && m[1]!.toLowerCase() === captionNum)
          }
          const m = FIGURE_REF_RE.exec(c)
          return Boolean(m && m[1]!.toLowerCase() === captionNum)
        }) ?? site.claims?.[0]
      best = { citeSiteId: site.citeSiteId, claim, score }
    }
  }

  return best ? { citeSiteId: best.citeSiteId, claim: best.claim } : null
}

function pagesFromHints(...hints: Array<string | undefined>): Set<number> {
  const pages = new Set<number>()
  for (const hint of hints) {
    if (!hint) continue
    const m = PAGE_HINT_RE.exec(hint)
    if (!m) continue
    const a = parseInt(m[1]!, 10)
    const b = m[2] ? parseInt(m[2], 10) : a
    if (!Number.isFinite(a)) continue
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    for (let p = lo; p <= hi; p++) pages.add(p)
  }
  return pages
}
