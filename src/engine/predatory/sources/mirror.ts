import type {
  PredatoryJournalRecord,
  PredatoryList,
  PredatoryPublisherRecord
} from '../../../shared/predatory'

export const MIRROR_JOURNALS_CSV =
  'https://raw.githubusercontent.com/stop-predatory-journals/stop-predatory-journals.github.io/master/_data/journals.csv'

export const MIRROR_PUBLISHERS_CSV =
  'https://raw.githubusercontent.com/stop-predatory-journals/stop-predatory-journals.github.io/master/_data/publishers.csv'

export const MIRROR_SOURCE_URL =
  'https://github.com/stop-predatory-journals/stop-predatory-journals.github.io'

const FIELD_MAX_LEN = 10_000
const MIN_JOURNALS = 100

/** Minimal CSV row split (handles quoted fields with commas). */
export function parseCsvDataRows(csvText: string): string[][] {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  lines.shift()
  return lines.map((line) => {
    const parts: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        q = !q
        continue
      }
      if (c === ',' && !q) {
        parts.push(cur)
        cur = ''
        continue
      }
      cur += c
    }
    parts.push(cur)
    return parts
  })
}

export function parseJournalsCsv(body: string): PredatoryJournalRecord[] {
  const rows = parseCsvDataRows(body)
  const out: PredatoryJournalRecord[] = []
  for (const r of rows) {
    const name = r[1]?.trim()
    if (!name || name.length > FIELD_MAX_LEN) continue
    const abbr = r[2]?.trim()
    out.push({
      name,
      aliases: abbr ? [abbr] : [],
      reason: 'Stop Predatory Journals (community list)'
    })
  }
  return out
}

export function parsePublishersCsv(body: string): PredatoryPublisherRecord[] {
  const rows = parseCsvDataRows(body)
  const out: PredatoryPublisherRecord[] = []
  for (const r of rows) {
    const name = r[1]?.trim()
    if (!name || name.length > FIELD_MAX_LEN) continue
    const abbr = r[2]?.trim()
    out.push({
      name,
      aliases: abbr ? [abbr] : [],
      reason: 'Stop Predatory Journals (community list)'
    })
  }
  return out
}

export function buildPredatoryListFromMirrorCsv(
  journalsBody: string,
  publishersBody: string,
  updatedIso: string
): PredatoryList {
  const journals = parseJournalsCsv(journalsBody)
  const publishers = parsePublishersCsv(publishersBody)
  const day = updatedIso.slice(0, 10)
  return {
    version: day,
    sourceUrl: MIRROR_SOURCE_URL,
    updatedAt: updatedIso,
    publishers,
    journals
  }
}

export function assertValidDownloadedList(list: PredatoryList): void {
  if (!list.journals || list.journals.length < MIN_JOURNALS) {
    throw new Error(`List has too few journals (${list.journals?.length ?? 0})`)
  }
  for (const j of list.journals) {
    if (j.name && j.name.length > FIELD_MAX_LEN) throw new Error('Oversized journal name')
    if (j.issn?.some((x) => x.length > 32)) throw new Error('Invalid ISSN field')
    for (const issn of j.issn ?? []) {
      const k = normalizeIssnKey(issn)
      if (k == null && issn.replace(/\s/g, '').length > 0) {
        throw new Error('Malformed ISSN in list')
      }
    }
  }
  for (const p of list.publishers) {
    if (p.name && p.name.length > FIELD_MAX_LEN) throw new Error('Oversized publisher name')
  }
}

export function normalizeIssnKey(raw: string): string | null {
  const u = raw.toUpperCase().replace(/[^0-9X]/g, '')
  if (u.length !== 8) return null
  return u
}

export function fingerprintFromEtags(etagJ: string | null, etagP: string | null): string {
  return `${etagJ ?? ''}|${etagP ?? ''}`
}
