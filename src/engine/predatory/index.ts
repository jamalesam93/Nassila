import type { CslItem, PredatoryFlag, PredatoryMatchKind, PredatoryTier } from '../types'
import { normalizePredatoryPhrase, normalizedLevenshtein } from '../shared/text'
import type { PredatoryJournalRecord, PredatoryList, PredatoryPublisherRecord } from '../../shared/predatory'
import { normalizeIssnKey } from './sources/mirror'
import { getActivePredatoryListSync } from './list-store'

const FUZZY_THRESHOLD = 0.92

let seq = 0
function nextFlagId(): string {
  seq += 1
  return `pred-${seq}-${Date.now()}`
}

function journalNamesNormalized(j: PredatoryJournalRecord): string[] {
  const names = [j.name, ...(j.aliases ?? [])].filter(Boolean).map((n) => normalizePredatoryPhrase(n))
  return [...new Set(names)]
}

function publisherNamesNormalized(p: PredatoryPublisherRecord): string[] {
  const names = [p.name, ...(p.aliases ?? [])].filter(Boolean).map((n) => normalizePredatoryPhrase(n))
  return [...new Set(names)]
}

function collectItemIssnKeys(item: CslItem): string[] {
  const raw = item.ISSN
  if (!raw) return []
  const parts = raw.split(/[,;/]\s*/).map((s) => s.trim()).filter(Boolean)
  const keys: string[] = []
  for (const p of parts) {
    const k = normalizeIssnKey(p)
    if (k) keys.push(k)
  }
  return [...new Set(keys)]
}

function buildIssnIndex(journals: PredatoryJournalRecord[]): Map<string, PredatoryJournalRecord> {
  const m = new Map<string, PredatoryJournalRecord>()
  for (const j of journals) {
    for (const iss of j.issn ?? []) {
      const k = normalizeIssnKey(iss)
      if (k) m.set(k, j)
    }
  }
  return m
}

function buildPublisherSet(publishers: PredatoryPublisherRecord[]): Set<string> {
  const s = new Set<string>()
  for (const p of publishers) {
    for (const n of publisherNamesNormalized(p)) {
      if (n) s.add(n)
    }
  }
  return s
}

function flagStrength(tier: PredatoryTier, kind: PredatoryMatchKind): number {
  const t = tier === 'predatory' ? 100 : 0
  const k =
    kind === 'issn' ? 4 : kind === 'name' ? 3 : kind === 'publisher' ? 2 : 1
  return t + k
}

function pickStrongerFlag(a: PredatoryFlag, b: PredatoryFlag): PredatoryFlag {
  return flagStrength(a.tier, a.matchedOn) >= flagStrength(b.tier, b.matchedOn) ? a : b
}

function buildFlag(
  citationId: string,
  tier: PredatoryTier,
  matchedOn: PredatoryMatchKind,
  matchedValue: string,
  sourceEntry: PredatoryFlag['sourceEntry']
): PredatoryFlag {
  return {
    id: nextFlagId(),
    citationId,
    tier,
    matchedOn,
    matchedValue,
    sourceEntry
  }
}

export function checkPredatory(items: CslItem[], list?: PredatoryList): PredatoryFlag[] {
  const data = list ?? getActivePredatoryListSync()
  const journals = data.journals
  const publishers = data.publishers
  const issnIndex = buildIssnIndex(journals)
  const publisherNormSet = buildPublisherSet(publishers)

  const flags: PredatoryFlag[] = []

  for (const item of items) {
    const container = item['container-title']?.trim()
    const containerNorm = container ? normalizePredatoryPhrase(container) : ''
    const publisherField = item.publisher?.trim()
    const publisherNorm = publisherField ? normalizePredatoryPhrase(publisherField) : ''

    let best: PredatoryFlag | null = null

    for (const key of collectItemIssnKeys(item)) {
      const jrec = issnIndex.get(key)
      if (jrec) {
        const f = buildFlag(
          item.id,
          'predatory',
          'issn',
          item.ISSN ?? key,
          {
            name: jrec.name,
            publisher: jrec.publisher,
            issn: key,
            reason: jrec.reason
          }
        )
        best = best ? pickStrongerFlag(best, f) : f
      }
    }

    if (containerNorm) {
      for (const jrec of journals) {
        for (const cand of journalNamesNormalized(jrec)) {
          if (!cand) continue
          if (cand === containerNorm) {
            const f = buildFlag(item.id, 'predatory', 'name', container ?? '', {
              name: jrec.name,
              publisher: jrec.publisher,
              reason: jrec.reason
            })
            best = best ? pickStrongerFlag(best, f) : f
            break
          }
        }
      }
    }

    if (publisherNorm && publisherNormSet.has(publisherNorm)) {
      const matchedPublisherName = publishers.find((p) =>
        publisherNamesNormalized(p).includes(publisherNorm)
      )
      const f = buildFlag(item.id, 'suspicious', 'publisher', publisherField ?? '', {
        publisher: matchedPublisherName?.name ?? publisherField,
        reason: matchedPublisherName?.reason
      })
      best = best ? pickStrongerFlag(best, f) : f
    }

    if (containerNorm) {
      let bestFuzzy: { j: PredatoryJournalRecord; score: number } | null = null
      for (const jrec of journals) {
        for (const cand of journalNamesNormalized(jrec)) {
          if (!cand || cand === containerNorm) continue
          const score = normalizedLevenshtein(containerNorm, cand)
          if (score >= FUZZY_THRESHOLD) {
            if (!bestFuzzy || score > bestFuzzy.score) {
              bestFuzzy = { j: jrec, score }
            }
          }
        }
      }
      if (bestFuzzy) {
        const f = buildFlag(item.id, 'suspicious', 'fuzzy-name', container ?? '', {
          name: bestFuzzy.j.name,
          publisher: bestFuzzy.j.publisher,
          reason: bestFuzzy.j.reason
        })
        best = best ? pickStrongerFlag(best, f) : f
      }
    }

    if (best) flags.push(best)
  }

  return flags
}

export function predatoryFlagsToByCitation(flags: PredatoryFlag[]): Record<string, PredatoryFlag> {
  const m: Record<string, PredatoryFlag> = {}
  for (const f of flags) {
    m[f.citationId] = f
  }
  return m
}
