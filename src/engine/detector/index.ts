import type { StyleCandidate } from '../types'
import { STYLE_FINGERPRINTS } from './fingerprints'

export async function detectStyle(formattedCitation: string): Promise<StyleCandidate[]> {
  const candidates: StyleCandidate[] = []
  const trimmed = formattedCitation.trim()

  for (const fp of STYLE_FINGERPRINTS) {
    let score = 0
    let matchCount = 0

    // Check numbered prefix
    if (fp.patterns.numberedPrefix) {
      if (fp.patterns.numberedPrefix.test(trimmed)) {
        score += 0.3
        matchCount++
      }
    }

    // Check author format
    const textWithoutNumber = trimmed.replace(/^\s*\[?\d+[\].)]\s*/, '')
    if (fp.patterns.authorFormat.test(textWithoutNumber)) {
      score += 0.25
      matchCount++
    }

    // Check date pattern
    if (fp.patterns.datePattern.test(trimmed)) {
      score += 0.2
      matchCount++
    }

    // Check container/journal pattern
    if (fp.patterns.containerPattern) {
      if (fp.patterns.containerPattern.test(trimmed)) {
        score += 0.1
        matchCount++
      }
    }

    // Check overall structure
    if (fp.patterns.generalStructure.test(trimmed)) {
      score += 0.3
      matchCount++
    }

    // Require at least 2 pattern matches to consider this style
    if (matchCount >= 2) {
      candidates.push({
        styleId: fp.styleId,
        styleName: fp.styleName,
        confidence: Math.min(score * fp.weight, 1),
        category: fp.category
      })
    }
  }

  // Fallback: if no patterns matched well, use basic heuristics
  if (candidates.length === 0) {
    if (/^\[\d+\]/.test(trimmed)) {
      candidates.push({ styleId: 'ieee', styleName: 'IEEE', confidence: 0.3, category: 'numeric' })
    } else if (/^\d+\.\s/.test(trimmed)) {
      candidates.push({ styleId: 'vancouver', styleName: 'Vancouver', confidence: 0.3, category: 'numeric' })
    } else if (/\(\d{4}\)/.test(trimmed)) {
      candidates.push({ styleId: 'apa-7th', styleName: 'APA 7th Edition', confidence: 0.2, category: 'author-date' })
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence)
  return candidates
}

export function detectStyleFromMultiple(citations: string[]): StyleCandidate[] {
  const voteCounts = new Map<string, { total: number; count: number; candidate: StyleCandidate }>()

  for (const citation of citations) {
    const trimmed = citation.trim()
    if (!trimmed) continue

    for (const fp of STYLE_FINGERPRINTS) {
      let score = 0
      let matchCount = 0

      const textWithoutNumber = trimmed.replace(/^\s*\[?\d+[\].)]\s*/, '')
      if (fp.patterns.authorFormat.test(textWithoutNumber)) { score += 0.25; matchCount++ }
      if (fp.patterns.datePattern.test(trimmed)) { score += 0.2; matchCount++ }
      if (fp.patterns.numberedPrefix?.test(trimmed)) { score += 0.3; matchCount++ }
      if (fp.patterns.generalStructure.test(trimmed)) { score += 0.3; matchCount++ }

      if (matchCount >= 2) {
        const existing = voteCounts.get(fp.styleId)
        if (existing) {
          existing.total += score
          existing.count++
        } else {
          voteCounts.set(fp.styleId, {
            total: score,
            count: 1,
            candidate: { styleId: fp.styleId, styleName: fp.styleName, confidence: 0, category: fp.category }
          })
        }
      }
    }
  }

  const results: StyleCandidate[] = []
  for (const [, data] of voteCounts) {
    const avgScore = data.total / data.count
    const citationRatio = data.count / citations.length
    results.push({
      ...data.candidate,
      confidence: Math.min(avgScore * 0.6 + citationRatio * 0.4, 1)
    })
  }

  results.sort((a, b) => b.confidence - a.confidence)
  return results
}
