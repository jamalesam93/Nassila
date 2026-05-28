// ─── CSL-JSON Core Data Types ───────────────────────────────────────────────
// Based on the CSL (Citation Style Language) specification:
// https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html

export interface CslName {
  family: string
  given?: string
  'dropping-particle'?: string
  'non-dropping-particle'?: string
  suffix?: string
  literal?: string
}

export interface CslDate {
  'date-parts'?: number[][]
  season?: number
  circa?: boolean
  literal?: string
  raw?: string
}

export type CslItemType =
  | 'article'
  | 'article-journal'
  | 'article-magazine'
  | 'article-newspaper'
  | 'bill'
  | 'book'
  | 'broadcast'
  | 'chapter'
  | 'classic'
  | 'collection'
  | 'dataset'
  | 'document'
  | 'entry'
  | 'entry-dictionary'
  | 'entry-encyclopedia'
  | 'event'
  | 'figure'
  | 'graphic'
  | 'hearing'
  | 'interview'
  | 'legal_case'
  | 'legislation'
  | 'manuscript'
  | 'map'
  | 'motion_picture'
  | 'musical_score'
  | 'pamphlet'
  | 'paper-conference'
  | 'patent'
  | 'performance'
  | 'periodical'
  | 'personal_communication'
  | 'post'
  | 'post-weblog'
  | 'regulation'
  | 'report'
  | 'review'
  | 'review-book'
  | 'software'
  | 'song'
  | 'speech'
  | 'standard'
  | 'thesis'
  | 'treaty'
  | 'webpage'

export interface CslItem {
  id: string
  type: CslItemType

  // Titles
  title?: string
  'title-short'?: string
  'container-title'?: string
  'container-title-short'?: string
  'collection-title'?: string

  // Contributors
  author?: CslName[]
  editor?: CslName[]
  translator?: CslName[]
  'collection-editor'?: CslName[]
  'container-author'?: CslName[]

  // Dates
  issued?: CslDate
  accessed?: CslDate
  'event-date'?: CslDate
  submitted?: CslDate

  // Numbers
  volume?: string
  issue?: string
  page?: string
  'page-first'?: string
  'number-of-pages'?: string
  edition?: string
  'number-of-volumes'?: string
  'chapter-number'?: string

  // Identifiers
  DOI?: string
  ISBN?: string
  ISSN?: string
  PMID?: string
  PMCID?: string
  URL?: string

  // Other
  abstract?: string
  publisher?: string
  'publisher-place'?: string
  language?: string
  note?: string
  annote?: string
  keyword?: string
  source?: string
  'call-number'?: string
  genre?: string
  status?: string
  'event-place'?: string
  'event-title'?: string
  dimensions?: string
  medium?: string
  scale?: string
  version?: string
  archive?: string
  'archive-place'?: string
  'archive_location'?: string
  jurisdiction?: string
  authority?: string
  'citation-number'?: string
  'citation-label'?: string
  'first-reference-note-number'?: string
  references?: string
  section?: string
  supplement?: string

  // Internal tracking
  _original?: string
  _sourceFormat?: InputFormat
  _parseConfidence?: number
}

// ─── Application-Level Types ────────────────────────────────────────────────

export type InputFormat =
  | 'bibtex'
  | 'ris'
  | 'csl-json'
  | 'plain-text'
  | 'docx'
  | 'pdf'
  | 'doi'
  | 'isbn'
  | 'pmid'
  | 'url'
  | 'zotero'
  | 'mendeley'
  | 'endnote'

export type ExportFormat =
  | 'bibtex'
  | 'ris'
  | 'csl-json'
  | 'plain-text'
  | 'docx'
  | 'clipboard'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string
  citationId: string
  severity: IssueSeverity
  field?: string
  message: string
  suggestedFix?: string
  autoFixable: boolean
}

export interface VerificationMismatch {
  id: string
  citationId: string
  field: string
  userValue: string
  canonicalValue: string
  source: 'crossref' | 'pubmed' | 'openlibrary' | 'openalex'
}

export interface DuplicateGroup {
  id: string
  items: CslItem[]
  similarityScore: number
  autoMergeable: boolean
}

export interface StyleCandidate {
  styleId: string
  styleName: string
  confidence: number
  category: 'author-date' | 'numeric' | 'note' | 'label'
}

export interface JournalMapping {
  journalName: string
  issn?: string
  eissn?: string
  styleId: string
  abbreviation?: string
}

export interface JournalGuidelines {
  journalName: string
  wordLimit?: number
  abstractWordLimit?: number
  referenceStyle: string
  additionalNotes?: string[]
}

export interface UserPreset {
  id: string
  label: string
  styleId?: string
  journalName?: string
  createdAt: number
}

export type PredatoryTier = 'predatory' | 'suspicious'

export type PredatoryMatchKind = 'issn' | 'name' | 'publisher' | 'fuzzy-name'

export interface PredatoryFlag {
  id: string
  citationId: string
  tier: PredatoryTier
  matchedOn: PredatoryMatchKind
  matchedValue: string
  sourceEntry: {
    name?: string
    publisher?: string
    issn?: string
    reason?: string
  }
}

export interface ProcessingResult {
  items: CslItem[]
  issues: ValidationIssue[]
  verificationMismatches: VerificationMismatch[]
  duplicates: DuplicateGroup[]
  predatoryFlags?: PredatoryFlag[]
  detectedStyle?: StyleCandidate
  formattedBibliography?: string
  formattedInTextCitations?: Map<string, string>
}

// ─── Undo/Redo Types ────────────────────────────────────────────────────────

export type ActionType =
  | 'add-citations'
  | 'remove-citations'
  | 'update-citation'
  | 'autocorrect'
  | 'reformat'
  | 'merge-duplicates'
  | 'reorder'
  | 'accept-verification'
  | 'batch-operation'
  | 'remove-predatory'

export interface UndoableAction {
  id: string
  type: ActionType
  label: string
  timestamp: number
  before: CslItem[]
  after: CslItem[]
}

// ─── Network/Offline Types ──────────────────────────────────────────────────

export type NetworkStatus = 'online' | 'offline'

export interface AppState {
  citations: CslItem[]
  selectedStyleId: string | null
  selectedJournal: string | null
  networkStatus: NetworkStatus
  issues: ValidationIssue[]
  verificationMismatches: VerificationMismatch[]
  duplicates: DuplicateGroup[]
  predatoryFlags: PredatoryFlag[]
  undoStack: UndoableAction[]
  redoStack: UndoableAction[]
  theme: 'light' | 'dark' | 'system'
  recentStyles: string[]
  presets: UserPreset[]
}
