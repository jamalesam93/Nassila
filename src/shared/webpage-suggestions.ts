import type { CslDate, CslItem, CslName } from '../engine/types'

/** Provenance source for grey-literature / webpage CSL field suggestions. */
export type WebpageSuggestionSource = 'webpage_metadata' | 'grey_lit'

/** CSL fields eligible for webpage / grey-lit confirm-before-apply patches. */
export type WebpageSuggestableField =
  | 'title'
  | 'container-title'
  | 'publisher'
  | 'URL'
  | 'author'
  | 'issued'
  | 'accessed'
  | 'abstract'
  | 'DOI'
  | 'genre'
  | 'type'

export interface WebpageFieldProvenance {
  source: WebpageSuggestionSource
  /** 0–1 confidence for this field suggestion. */
  confidence: number
  /** Short evidence label (meta tag family, host stub, url input, etc.). */
  evidence: string
}

export interface WebpageFieldSuggestion {
  field: WebpageSuggestableField
  proposed: string | CslDate | CslName[] | CslItem['type']
  current?: string | CslDate | CslName[] | CslItem['type']
  provenance: WebpageFieldProvenance
}

export interface WebpageSuggestionBatch {
  citationId: string
  url: string
  suggestions: WebpageFieldSuggestion[]
}
