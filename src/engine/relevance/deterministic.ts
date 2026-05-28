export interface DeterministicRelevanceResult {
  score: number
  bucket: 'low' | 'medium' | 'high'
  matchedTerms: string[]
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3)
}

export function scorePassageAgainstSource(passage: string, sourceText: string): DeterministicRelevanceResult {
  const pTokens = new Set(normalizeTokens(passage))
  const sTokens = new Set(normalizeTokens(sourceText))
  const matched: string[] = []
  for (const t of pTokens) {
    if (sTokens.has(t)) matched.push(t)
  }

  const denom = Math.max(1, pTokens.size)
  const score = matched.length / denom
  const bucket = score < 0.25 ? 'low' : score < 0.5 ? 'medium' : 'high'
  return { score, bucket, matchedTerms: matched.slice(0, 30) }
}

