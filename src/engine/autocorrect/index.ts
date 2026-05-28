import type { CslItem, CslItemType, ValidationIssue } from '../types'
import { resolveJournalAbbreviation, resolveJournalSourceForAbbrev } from '../target/journal-database'

export interface CorrectionLog {
  citationId: string
  field: string
  oldValue: unknown
  newValue: unknown
  rule: string
}

const GRAY_LIT_TYPES: Set<CslItemType> = new Set([
  'report', 'thesis', 'webpage', 'post', 'post-weblog', 'dataset', 'software',
  'patent', 'legislation', 'legal_case', 'bill', 'regulation', 'standard',
  'manuscript', 'speech', 'broadcast', 'motion_picture', 'map',
  'personal_communication', 'paper-conference', 'article'
])

export function autocorrect(
  items: CslItem[],
  issues: ValidationIssue[],
  styleId?: string
): { corrected: CslItem[]; log: CorrectionLog[] } {
  const log: CorrectionLog[] = []
  const corrected = items.map((item) => {
    const fixed = { ...item }
    const itemIssues = issues.filter((i) => i.citationId === item.id && i.autoFixable)

    for (const issue of itemIssues) {
      if (issue.field === 'DOI' && fixed.DOI) {
        const oldVal = fixed.DOI
        const cleaned = fixed.DOI.replace(/^https?:\/\/doi\.org\//i, '').replace(/\s+/g, '')
        if (cleaned !== oldVal) {
          fixed.DOI = cleaned
          log.push({ citationId: item.id, field: 'DOI', oldValue: oldVal, newValue: cleaned, rule: 'normalize-doi' })
        }
      }

      if (issue.field === 'page' && fixed.page) {
        const oldVal = fixed.page
        fixed.page = normalizePageRange(fixed.page)
        if (fixed.page !== oldVal) {
          log.push({ citationId: item.id, field: 'page', oldValue: oldVal, newValue: fixed.page, rule: 'normalize-page-range' })
        }
      }

      if (issue.field === 'URL' && fixed.URL && !/^https?:\/\//i.test(fixed.URL)) {
        const oldVal = fixed.URL
        fixed.URL = 'https://' + fixed.URL
        log.push({ citationId: item.id, field: 'URL', oldValue: oldVal, newValue: fixed.URL, rule: 'fix-url-protocol' })
      }
    }

    if (fixed.DOI) {
      const oldDoi = fixed.DOI
      fixed.DOI = fixed.DOI.replace(/^https?:\/\/doi\.org\//i, '').replace(/[\s.]+$/, '')
      if (fixed.DOI !== oldDoi) {
        log.push({ citationId: item.id, field: 'DOI', oldValue: oldDoi, newValue: fixed.DOI, rule: 'normalize-doi' })
      }
    }

    if (fixed.page) {
      const oldPage = fixed.page
      fixed.page = normalizePageRange(fixed.page)
      if (fixed.page !== oldPage && !log.some((l) => l.citationId === item.id && l.field === 'page')) {
        log.push({ citationId: item.id, field: 'page', oldValue: oldPage, newValue: fixed.page, rule: 'normalize-page-range' })
      }
    }

    if (fixed.author) {
      fixed.author = fixed.author.map((a) => ({
        ...a,
        family: a.family?.trim(),
        given: a.given?.trim(),
        literal: a.literal?.trim()
      }))
    }

    applyGrayLitCorrections(fixed, log)

    if (styleId) {
      const styleResult = applyStyleCorrections(fixed, styleId)
      if (styleResult.log.length > 0) {
        Object.assign(fixed, styleResult.item)
        log.push(...styleResult.log)
      }
    }

    return fixed
  })

  return { corrected, log }
}

function applyGrayLitCorrections(item: CslItem, log: CorrectionLog[]): void {
  if (!GRAY_LIT_TYPES.has(item.type)) return

  if (item.type === 'thesis' && !item.genre) {
    const text = (item._original ?? item.title ?? '').toLowerCase()
    if (/\b(?:ph\.?\s*d|doctoral)\b/i.test(text)) {
      item.genre = 'Doctoral dissertation'
      log.push({ citationId: item.id, field: 'genre', oldValue: undefined, newValue: item.genre, rule: 'infer-thesis-type' })
    } else if (/\b(?:master|m\.?\s*(?:sc|a)\.?)\b/i.test(text)) {
      item.genre = "Master's thesis"
      log.push({ citationId: item.id, field: 'genre', oldValue: undefined, newValue: item.genre, rule: 'infer-thesis-type' })
    }
  }

  if (item.type === 'dataset' && !item.genre) {
    item.genre = 'Data set'
    log.push({ citationId: item.id, field: 'genre', oldValue: undefined, newValue: item.genre, rule: 'set-dataset-genre' })
  }

  if (item.type === 'software' && !item.genre) {
    item.genre = 'Computer software'
    log.push({ citationId: item.id, field: 'genre', oldValue: undefined, newValue: item.genre, rule: 'set-software-genre' })
  }

  if (item.type === 'manuscript' && !item.genre) {
    item.genre = 'Unpublished manuscript'
    log.push({ citationId: item.id, field: 'genre', oldValue: undefined, newValue: item.genre, rule: 'set-manuscript-genre' })
  }

  if ((item.type === 'report' || item.type === 'thesis' || item.type === 'dataset' ||
       item.type === 'software' || item.type === 'standard') && !item.accessed && item.URL) {
    const now = new Date()
    item.accessed = {
      'date-parts': [[now.getFullYear(), now.getMonth() + 1, now.getDate()]]
    }
    log.push({ citationId: item.id, field: 'accessed', oldValue: undefined, newValue: item.accessed, rule: 'set-access-date' })
  }

  if ((item.type === 'webpage' || item.type === 'post' || item.type === 'post-weblog') && !item.accessed && item.URL) {
    const now = new Date()
    item.accessed = {
      'date-parts': [[now.getFullYear(), now.getMonth() + 1, now.getDate()]]
    }
    log.push({ citationId: item.id, field: 'accessed', oldValue: undefined, newValue: item.accessed, rule: 'set-access-date' })
  }

  if (item.type === 'report') {
    inferOrganizationalPublisher(item, log)
  }
}

function inferOrganizationalPublisher(item: CslItem, log: CorrectionLog[]): void {
  if (item.publisher) return

  const orgAuthor = item.author?.find((a) => a.literal)
  if (orgAuthor?.literal) {
    item.publisher = orgAuthor.literal
    log.push({ citationId: item.id, field: 'publisher', oldValue: undefined, newValue: item.publisher, rule: 'infer-publisher-from-org-author' })
  }
}

function applyStyleCorrections(
  item: CslItem,
  styleId: string
): { item: Partial<CslItem>; log: CorrectionLog[] } {
  const corrections: Partial<CslItem> = {}
  const log: CorrectionLog[] = []

  if (styleId === 'ieee' && item['container-title'] && !item['container-title-short']) {
    const source = resolveJournalSourceForAbbrev(item)
    const journal = source?.name ?? item['container-title']
    const abbrev = resolveJournalAbbreviation(journal, source?.issn ?? item.ISSN)
    if (abbrev) {
      corrections['container-title-short'] = abbrev
      log.push({
        citationId: item.id,
        field: 'container-title-short',
        oldValue: undefined,
        newValue: abbrev,
        rule: 'ieee-journal-abbreviation'
      })
    }
  }

  if ((styleId === 'apa-7th' || styleId === 'apa-6th') && item.title) {
    if (item.type === 'article-journal') {
      const sentCased = toSentenceCase(item.title)
      if (sentCased !== item.title) {
        corrections.title = sentCased
        log.push({ citationId: item.id, field: 'title', oldValue: item.title, newValue: sentCased, rule: 'apa-sentence-case' })
      }
    }

    if (item.type === 'report' || item.type === 'thesis' || item.type === 'dataset' || item.type === 'software') {
      const sentCased = toSentenceCase(item.title)
      if (sentCased !== item.title) {
        corrections.title = sentCased
        log.push({ citationId: item.id, field: 'title', oldValue: item.title, newValue: sentCased, rule: 'apa-sentence-case-gray-lit' })
      }
    }
  }

  return { item: corrections, log }
}

export function normalizePageRange(page: string): string {
  return page.replace(/[\u2013\u2014–—]/g, '-').replace(/\s*-\s*/g, '-')
}

export function toTitleCase(str: string): string {
  const minorWords = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
    'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'if', 'is', 'it'
  ])

  return str
    .split(' ')
    .map((word, i) => {
      if (i === 0 || !minorWords.has(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word.toLowerCase()
    })
    .join(' ')
}

export function toSentenceCase(str: string): string {
  if (!str) return str
  const allUpper = str === str.toUpperCase()
  const words = str.split(' ')
  return words
    .map((word, i) => {
      if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      if (!allUpper && word.length <= 5 && word === word.toUpperCase() && /^[A-Z]{2,}$/.test(word)) return word
      if (!allUpper && /^[A-Z][a-z]/.test(word) && !isCommonWord(word.toLowerCase())) return word
      return word.toLowerCase()
    })
    .join(' ')
}

function isCommonWord(word: string): boolean {
  const common = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'this', 'that',
    'with', 'they', 'from', 'were', 'been', 'have', 'many', 'some', 'them',
    'than', 'its', 'over', 'such', 'into', 'only', 'other', 'new', 'after',
    'also', 'made', 'did', 'most', 'between', 'during', 'through', 'about',
    'using', 'based', 'among', 'within', 'across', 'study', 'analysis',
    'effects', 'impact', 'role', 'review', 'results', 'evidence'
  ])
  return common.has(word)
}
