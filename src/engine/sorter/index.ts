import type { CslItem } from '../types'

export type SortMode = 'author-date' | 'appearance' | 'author' | 'date' | 'title' | 'custom'

export function sortCitations(items: CslItem[], mode: SortMode = 'author-date'): CslItem[] {
  const sorted = [...items]

  switch (mode) {
    case 'author-date':
      sorted.sort((a, b) => {
        const authorCmp = getFirstAuthorSortKey(a).localeCompare(getFirstAuthorSortKey(b))
        if (authorCmp !== 0) return authorCmp
        return getYear(a) - getYear(b)
      })
      break

    case 'author':
      sorted.sort((a, b) =>
        getFirstAuthorSortKey(a).localeCompare(getFirstAuthorSortKey(b))
      )
      break

    case 'date':
      sorted.sort((a, b) => getYear(a) - getYear(b))
      break

    case 'title':
      sorted.sort((a, b) =>
        (a.title ?? '').toLowerCase().localeCompare((b.title ?? '').toLowerCase())
      )
      break

    case 'appearance':
      // Keep original order (order of first appearance in text)
      break

    case 'custom':
      // Reserved for user-defined sort keys
      break
  }

  return sorted
}

function getFirstAuthorSortKey(item: CslItem): string {
  const author = item.author?.[0]
  if (!author) return 'zzz'
  if (author.literal) return author.literal.toLowerCase()
  const family = (author.family ?? '').toLowerCase()
  const particle = author['non-dropping-particle']
    ? author['non-dropping-particle'].toLowerCase() + ' '
    : ''
  return particle + family
}

function getYear(item: CslItem): number {
  return item.issued?.['date-parts']?.[0]?.[0] ?? 9999
}
