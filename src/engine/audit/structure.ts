export interface StructureTemplate {
  id: string
  name: string
  headings: Record<string, string[]>
}

export interface StructureCheckResult {
  missing: string[]
  outOfOrder: string[]
  detected: { heading: string; index: number }[]
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .trim()
}

export function checkStructure(fullText: string, template: StructureTemplate): StructureCheckResult {
  const normalized = normalize(fullText)
  const detected: { heading: string; index: number }[] = []

  for (const [key, synonyms] of Object.entries(template.headings)) {
    let bestIndex = -1
    for (const s of synonyms) {
      const token = normalize(s)
      const idx = normalized.indexOf(token)
      if (idx >= 0 && (bestIndex < 0 || idx < bestIndex)) bestIndex = idx
    }
    if (bestIndex >= 0) detected.push({ heading: key, index: bestIndex })
  }

  detected.sort((a, b) => a.index - b.index)

  const missing = Object.keys(template.headings).filter((h) => !detected.some((d) => d.heading === h))

  const outOfOrder: string[] = []
  const expected = Object.keys(template.headings)
  const observedOrder = detected.map((d) => d.heading)
  for (let i = 0; i < observedOrder.length; i++) {
    for (let j = i + 1; j < observedOrder.length; j++) {
      const a = observedOrder[i]
      const b = observedOrder[j]
      if (expected.indexOf(a) > expected.indexOf(b)) {
        outOfOrder.push(`${a} appears before ${b}`)
      }
    }
  }

  return { missing, outOfOrder, detected }
}

