import type { CslItem, VerificationMismatch } from '../types'

/**
 * Applies registry-reported canonical values from verification mismatches onto citations.
 * Ignores sentinel user values such as `(missing)` for the user's side; canonical must be real text.
 */
export function applyVerificationMismatches(
  citations: CslItem[],
  mismatches: VerificationMismatch[]
): CslItem[] {
  if (mismatches.length === 0) return citations

  const patchesById = new Map<string, VerificationMismatch[]>()
  for (const m of mismatches) {
    const list = patchesById.get(m.citationId) ?? []
    list.push(m)
    patchesById.set(m.citationId, list)
  }

  return citations.map((citation) => {
    const patches = patchesById.get(citation.id)
    if (!patches?.length) return citation

    let mutated = false
    const draft: CslItem = { ...citation }
    for (const m of patches) {
      if (!canonicalValueUsable(m.canonicalValue)) continue

      switch (m.field) {
        case 'title':
          draft.title = m.canonicalValue
          mutated = true
          break
        case 'year': {
          const year = Number.parseInt(m.canonicalValue, 10)
          if (!Number.isFinite(year)) break
          const firstRow = citation.issued?.['date-parts']?.[0]
          const restMonths = firstRow?.slice(1)
          draft.issued = {
            ...citation.issued,
            'date-parts': [[year, ...(restMonths ?? [])]]
          }
          mutated = true
          break
        }
        case 'volume':
          draft.volume = m.canonicalValue
          mutated = true
          break
        case 'page':
          draft.page = m.canonicalValue
          mutated = true
          break
        case 'container-title':
          draft['container-title'] = m.canonicalValue
          mutated = true
          break
        default:
          break
      }
    }

    return mutated ? draft : citation
  })
}

function canonicalValueUsable(v: string): boolean {
  const t = v.trim()
  return t.length > 0 && t !== '(missing)'
}
