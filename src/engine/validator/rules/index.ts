import type { CslItem, ValidationIssue } from '../../types'

export interface StyleRule {
  id: string
  styleIds: string[] | '*'
  itemTypes: string[] | '*'
  validate: (item: CslItem, styleId: string) => ValidationIssue[]
}

let ruleIdCounter = 0
function makeIssue(
  citationId: string,
  severity: 'error' | 'warning' | 'info',
  field: string,
  message: string,
  autoFixable = false,
  suggestedFix?: string
): ValidationIssue {
  return {
    id: `rule-${++ruleIdCounter}`,
    citationId,
    severity,
    field,
    message,
    autoFixable,
    suggestedFix
  }
}

function isPreprint(item: CslItem): boolean {
  return /\bpre-?print\b/i.test(item.genre ?? '') ||
    /(?:arxiv|biorxiv|medrxiv|research\s+square)/i.test(
      `${item['container-title'] ?? ''} ${item.publisher ?? ''} ${item.URL ?? ''}`
    )
}

export const STYLE_RULES: StyleRule[] = [
  // ── Universal Required Fields ──────────────────────────────────────
  {
    id: 'required-title',
    styleIds: '*',
    itemTypes: '*',
    validate: (item) => {
      if (!item.title) return [makeIssue(item.id, 'error', 'title', 'Missing title')]
      return []
    }
  },
  {
    id: 'required-author',
    styleIds: '*',
    itemTypes: '*',
    validate: (item) => {
      if (!item.author || item.author.length === 0) {
        return [makeIssue(item.id, 'warning', 'author', 'No authors listed')]
      }
      return []
    }
  },
  {
    id: 'required-date',
    styleIds: '*',
    itemTypes: ['article-journal', 'book', 'chapter', 'paper-conference', 'report', 'thesis'],
    validate: (item) => {
      if (!item.issued) {
        return [makeIssue(item.id, 'warning', 'issued', 'Missing publication date')]
      }
      return []
    }
  },

  // ── Journal Article Rules ──────────────────────────────────────────
  {
    id: 'journal-requires-container',
    styleIds: '*',
    itemTypes: ['article-journal'],
    validate: (item) => {
      if (!item['container-title']) {
        return [makeIssue(item.id, 'error', 'container-title', 'Journal article missing journal name')]
      }
      return []
    }
  },

  // ── Book / Chapter Rules ───────────────────────────────────────────
  {
    id: 'book-requires-publisher',
    styleIds: '*',
    itemTypes: ['book', 'chapter'],
    validate: (item) => {
      if (!item.publisher) {
        return [makeIssue(item.id, 'warning', 'publisher', 'Missing publisher')]
      }
      return []
    }
  },
  {
    id: 'chapter-requires-container',
    styleIds: '*',
    itemTypes: ['chapter'],
    validate: (item) => {
      if (!item['container-title']) {
        return [makeIssue(item.id, 'warning', 'container-title', 'Book chapter missing book title')]
      }
      return []
    }
  },

  // ── Report Rules ───────────────────────────────────────────────────
  {
    id: 'report-requires-publisher',
    styleIds: '*',
    itemTypes: ['report'],
    validate: (item) => {
      if (!item.publisher && !item.author?.some((a) => a.literal)) {
        return [makeIssue(item.id, 'warning', 'publisher', 'Report missing issuing organization/publisher')]
      }
      return []
    }
  },
  {
    id: 'report-url-recommended',
    styleIds: '*',
    itemTypes: ['report'],
    validate: (item) => {
      if (!item.URL && !item.DOI) {
        return [makeIssue(item.id, 'info', 'URL', 'Reports benefit from including a URL or DOI for retrieval', true, 'Lookup online')]
      }
      return []
    }
  },

  // ── Thesis / Dissertation Rules ────────────────────────────────────
  {
    id: 'thesis-requires-publisher',
    styleIds: '*',
    itemTypes: ['thesis'],
    validate: (item) => {
      if (!item.publisher) {
        return [makeIssue(item.id, 'warning', 'publisher', 'Thesis missing university/institution name')]
      }
      return []
    }
  },
  {
    id: 'thesis-requires-genre',
    styleIds: '*',
    itemTypes: ['thesis'],
    validate: (item) => {
      if (!item.genre) {
        return [makeIssue(item.id, 'info', 'genre', 'Thesis missing type (e.g., "PhD dissertation", "Master\'s thesis")')]
      }
      return []
    }
  },
  {
    id: 'thesis-url-recommended',
    styleIds: '*',
    itemTypes: ['thesis'],
    validate: (item) => {
      if (!item.URL && !item.DOI) {
        return [makeIssue(item.id, 'info', 'URL', 'Theses benefit from including a repository URL or DOI', true, 'Lookup online')]
      }
      return []
    }
  },

  // ── Webpage / Online Rules ─────────────────────────────────────────
  {
    id: 'webpage-requires-url',
    styleIds: '*',
    itemTypes: ['webpage', 'post', 'post-weblog'],
    validate: (item) => {
      if (!item.URL) {
        return [makeIssue(item.id, 'error', 'URL', 'Web resource missing URL')]
      }
      return []
    }
  },
  {
    id: 'webpage-requires-accessed',
    styleIds: '*',
    itemTypes: ['webpage', 'post', 'post-weblog'],
    validate: (item) => {
      if (!item.accessed) {
        return [makeIssue(item.id, 'warning', 'accessed', 'Web resource should include access/retrieval date')]
      }
      return []
    }
  },
  {
    id: 'webpage-container-or-publisher',
    styleIds: '*',
    itemTypes: ['webpage', 'post', 'post-weblog'],
    validate: (item) => {
      if (!item['container-title'] && !item.publisher) {
        return [makeIssue(item.id, 'info', 'container-title', 'Web resource should include website name or publisher')]
      }
      return []
    }
  },

  // ── Conference Paper Rules ─────────────────────────────────────────
  {
    id: 'conference-requires-event-or-container',
    styleIds: '*',
    itemTypes: ['paper-conference'],
    validate: (item) => {
      if (!item['event-title'] && !item['container-title']) {
        return [makeIssue(item.id, 'warning', 'event-title', 'Conference paper missing conference/proceedings name')]
      }
      return []
    }
  },

  // ── Patent Rules ───────────────────────────────────────────────────
  {
    id: 'patent-requires-number',
    styleIds: '*',
    itemTypes: ['patent'],
    validate: (item) => {
      if (!item['citation-number'] && !item.number) {
        return [makeIssue(item.id, 'warning', 'number', 'Patent missing patent number')]
      }
      return []
    }
  },
  {
    id: 'patent-requires-authority',
    styleIds: '*',
    itemTypes: ['patent'],
    validate: (item) => {
      if (!item.authority) {
        return [makeIssue(item.id, 'info', 'authority', 'Patent missing issuing authority/office')]
      }
      return []
    }
  },

  // ── Legislation / Legal Case Rules ─────────────────────────────────
  {
    id: 'legislation-requires-number',
    styleIds: '*',
    itemTypes: ['legislation', 'bill', 'regulation'],
    validate: (item) => {
      if (!item['citation-number'] && !item.number) {
        return [makeIssue(item.id, 'warning', 'number', 'Legislation missing statute/bill number')]
      }
      return []
    }
  },
  {
    id: 'legal-case-requires-authority',
    styleIds: '*',
    itemTypes: ['legal_case'],
    validate: (item) => {
      if (!item.authority) {
        return [makeIssue(item.id, 'info', 'authority', 'Legal case missing court name')]
      }
      return []
    }
  },

  // ── Dataset Rules ──────────────────────────────────────────────────
  {
    id: 'dataset-requires-url-or-doi',
    styleIds: '*',
    itemTypes: ['dataset'],
    validate: (item) => {
      if (!item.URL && !item.DOI) {
        return [makeIssue(item.id, 'error', 'URL', 'Dataset missing URL or DOI for data access', true, 'Lookup online')]
      }
      return []
    }
  },
  {
    id: 'dataset-requires-publisher',
    styleIds: '*',
    itemTypes: ['dataset'],
    validate: (item) => {
      if (!item.publisher) {
        return [makeIssue(item.id, 'info', 'publisher', 'Dataset missing repository/publisher name')]
      }
      return []
    }
  },

  // ── Software Rules ─────────────────────────────────────────────────
  {
    id: 'software-requires-version',
    styleIds: '*',
    itemTypes: ['software'],
    validate: (item) => {
      if (!item.version) {
        return [makeIssue(item.id, 'info', 'version', 'Software missing version number')]
      }
      return []
    }
  },
  {
    id: 'software-requires-url-or-doi',
    styleIds: '*',
    itemTypes: ['software'],
    validate: (item) => {
      if (!item.URL && !item.DOI) {
        return [makeIssue(item.id, 'warning', 'URL', 'Software missing URL or DOI', true, 'Lookup online')]
      }
      return []
    }
  },

  // ── Standard Rules ─────────────────────────────────────────────────
  {
    id: 'standard-requires-number',
    styleIds: '*',
    itemTypes: ['standard'],
    validate: (item) => {
      if (!item['citation-number'] && !item.number) {
        return [makeIssue(item.id, 'warning', 'number', 'Standard missing standard number (e.g., ISO 9001)')]
      }
      return []
    }
  },

  // ── Broadcast / Motion Picture ─────────────────────────────────────
  {
    id: 'broadcast-requires-publisher',
    styleIds: '*',
    itemTypes: ['broadcast', 'motion_picture'],
    validate: (item) => {
      if (!item.publisher) {
        return [makeIssue(item.id, 'info', 'publisher', 'Missing network/studio/distributor name')]
      }
      return []
    }
  },

  // ── Manuscript Rules ───────────────────────────────────────────────
  {
    id: 'manuscript-requires-genre',
    styleIds: '*',
    itemTypes: ['manuscript'],
    validate: (item) => {
      if (!item.genre) {
        return [makeIssue(item.id, 'info', 'genre', 'Manuscript missing type description (e.g., "Unpublished manuscript")')]
      }
      return []
    }
  },

  // ── Format Validation ─────────────────────────────────────────────
  {
    id: 'doi-format',
    styleIds: '*',
    itemTypes: '*',
    validate: (item) => {
      if (item.DOI && !/^10\.\d{4,}\//.test(item.DOI)) {
        return [makeIssue(item.id, 'error', 'DOI', 'Invalid DOI format', true, 'DOI should start with "10."')]
      }
      return []
    }
  },
  {
    id: 'url-format',
    styleIds: '*',
    itemTypes: '*',
    validate: (item) => {
      if (item.URL && !/^https?:\/\//i.test(item.URL)) {
        return [makeIssue(item.id, 'warning', 'URL', 'URL should start with http:// or https://', true, 'Add https://')]
      }
      return []
    }
  },
  {
    id: 'year-range',
    styleIds: '*',
    itemTypes: '*',
    validate: (item) => {
      const year = item.issued?.['date-parts']?.[0]?.[0]
      if (year != null) {
        const currentYear = new Date().getFullYear()
        if (year < 1450 || year > currentYear + 2) {
          return [makeIssue(item.id, 'warning', 'issued', `Unusual year: ${year}`, false)]
        }
      }
      return []
    }
  },
  {
    id: 'page-format',
    styleIds: '*',
    itemTypes: '*',
    validate: (item) => {
      if (item.page) {
        if (/[\u2013\u2014]/.test(item.page)) {
          return [makeIssue(item.id, 'info', 'page', 'Page range uses special dashes; will be normalized', true, 'Use standard hyphen')]
        }
      }
      return []
    }
  },

  // ── APA-specific ──────────────────────────────────────────────────
  {
    id: 'apa-doi-recommended',
    styleIds: ['apa-7th', 'apa-6th'],
    itemTypes: ['article-journal'],
    validate: (item) => {
      if (isPreprint(item)) return []
      if (!item.DOI) {
        return [makeIssue(item.id, 'info', 'DOI', 'APA recommends including DOI for journal articles', true, 'Lookup online')]
      }
      return []
    }
  },
  {
    id: 'apa-volume-required',
    styleIds: ['apa-7th', 'apa-6th'],
    itemTypes: ['article-journal'],
    validate: (item) => {
      if (isPreprint(item)) return []
      if (!item.volume) {
        return [makeIssue(item.id, 'warning', 'volume', 'APA: missing volume number for journal article', true, 'Lookup online')]
      }
      return []
    }
  },
  {
    id: 'apa-report-number',
    styleIds: ['apa-7th', 'apa-6th'],
    itemTypes: ['report'],
    validate: (item) => {
      if (!item['citation-number'] && !item.number) {
        return [makeIssue(item.id, 'info', 'number', 'APA: include report number when available (e.g., "Report No. 42")')]
      }
      return []
    }
  },
  {
    id: 'apa-thesis-university',
    styleIds: ['apa-7th', 'apa-6th'],
    itemTypes: ['thesis'],
    validate: (item) => {
      if (!item.publisher) {
        return [makeIssue(item.id, 'warning', 'publisher', 'APA: thesis must include university name')]
      }
      return []
    }
  },
  {
    id: 'apa-thesis-type',
    styleIds: ['apa-7th', 'apa-6th'],
    itemTypes: ['thesis'],
    validate: (item) => {
      if (!item.genre) {
        return [makeIssue(item.id, 'warning', 'genre', 'APA: specify thesis type in brackets (e.g., "Doctoral dissertation", "Master\'s thesis")')]
      }
      return []
    }
  },
  {
    id: 'apa-webpage-retrieval',
    styleIds: ['apa-7th'],
    itemTypes: ['webpage', 'post', 'post-weblog'],
    validate: (item) => {
      if (!item.URL) {
        return [makeIssue(item.id, 'error', 'URL', 'APA 7th: web references must include URL')]
      }
      return []
    }
  },
  {
    id: 'apa-dataset-brackets',
    styleIds: ['apa-7th', 'apa-6th'],
    itemTypes: ['dataset'],
    validate: (item) => {
      if (!item.genre) {
        return [makeIssue(item.id, 'info', 'genre', 'APA: datasets should be labeled [Data set] after the title')]
      }
      return []
    }
  },
  {
    id: 'apa-software-brackets',
    styleIds: ['apa-7th', 'apa-6th'],
    itemTypes: ['software'],
    validate: (item) => {
      if (!item.genre) {
        return [makeIssue(item.id, 'info', 'genre', 'APA: software should be labeled [Computer software] after the title')]
      }
      return []
    }
  },

  // ── IEEE-specific ─────────────────────────────────────────────────
  {
    id: 'ieee-abbreviated-journal',
    styleIds: ['ieee'],
    itemTypes: ['article-journal'],
    validate: (item) => {
      const journal = item['container-title']
      if (journal && !item['container-title-short'] && journal.length > 30) {
        return [makeIssue(
          item.id,
          'info',
          'container-title',
          'IEEE style prefers abbreviated journal names',
          true,
          'Add journal abbreviation'
        )]
      }
      return []
    }
  },

  // ── Gray Literature URL Recommendation (all styles) ────────────────
  {
    id: 'gray-lit-url-recommended',
    styleIds: '*',
    itemTypes: ['report', 'thesis', 'dataset', 'software', 'standard', 'manuscript', 'speech', 'broadcast', 'motion_picture', 'map', 'personal_communication'],
    validate: (item) => {
      if (!item.URL && !item.DOI) {
        return [makeIssue(item.id, 'info', 'URL', 'Gray literature: including a URL strengthens retrieval and verification', true, 'Lookup online')]
      }
      return []
    }
  }
]
