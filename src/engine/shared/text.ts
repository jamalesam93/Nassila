/** Lowercase, strip non-alphanumeric except spaces, collapse whitespace (matches duplicate-detection normalization). */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalization for predatory journal / publisher matching: also drops a leading "the". */
export function normalizePredatoryPhrase(s: string): string {
  return normalizeText(s.replace(/^\s*the\s+/i, ''))
}

export function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1

  const matrix: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i]![j] = j
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j] + 1,
          matrix[i]![j - 1] + 1,
          matrix[i - 1]![j - 1] + cost
        )
      }
    }
  }

  return 1 - matrix[a.length]![b.length]! / maxLen
}
