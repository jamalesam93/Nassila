import type { CslItem, DuplicateGroup } from '../types'
import { normalizeText, normalizedLevenshtein } from '../shared/text'

export function findDuplicates(items: CslItem[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const visited = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    if (visited.has(items[i].id)) continue
    const group: CslItem[] = [items[i]]

    for (let j = i + 1; j < items.length; j++) {
      if (visited.has(items[j].id)) continue
      const score = computeSimilarity(items[i], items[j])
      if (score >= 0.8) {
        group.push(items[j])
        visited.add(items[j].id)
      }
    }

    if (group.length > 1) {
      visited.add(items[i].id)
      groups.push({
        id: `dup-${i}`,
        items: group,
        similarityScore: group.length > 1 ? computeSimilarity(group[0], group[1]) : 1,
        autoMergeable: group.length === 2
      })
    }
  }

  return groups
}

export function computeSimilarity(a: CslItem, b: CslItem): number {
  let score = 0
  let weights = 0

  if (a.DOI && b.DOI) {
    weights += 5
    if (a.DOI.toLowerCase() === b.DOI.toLowerCase()) score += 5
  }

  if (a.title && b.title) {
    weights += 3
    score += 3 * normalizedLevenshtein(normalizeText(a.title), normalizeText(b.title))
  }

  const aAuthors = formatAuthors(a.author ?? [])
  const bAuthors = formatAuthors(b.author ?? [])
  if (aAuthors && bAuthors) {
    weights += 2
    score += 2 * normalizedLevenshtein(normalizeText(aAuthors), normalizeText(bAuthors))
  }

  const aYear = a.issued?.['date-parts']?.[0]?.[0]
  const bYear = b.issued?.['date-parts']?.[0]?.[0]
  if (aYear && bYear) {
    weights += 1
    if (aYear === bYear) score += 1
  }

  return weights > 0 ? score / weights : 0
}

function formatAuthors(names: { family?: string; given?: string; literal?: string }[]): string {
  return names.map((n) => n.literal ?? `${n.family ?? ''} ${n.given ?? ''}`).join(' ').trim()
}

export function mergeItems(items: CslItem[]): CslItem {
  const merged = { ...items[0] }
  for (let i = 1; i < items.length; i++) {
    const source = items[i]
    for (const [key, value] of Object.entries(source)) {
      if (value != null && (merged as Record<string, unknown>)[key] == null) {
        (merged as Record<string, unknown>)[key] = value
      }
    }
  }
  return merged
}
