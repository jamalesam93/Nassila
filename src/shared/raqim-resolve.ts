import type { CslItem } from '../engine/types'

export type RaqimLookupKind = 'title' | 'doi' | 'pmid' | 'pmcid' | 'url'

export type RaqimCandidateProvider =
  | 'crossref'
  | 'pubmed'
  | 'openalex'
  | 'datacite'
  | 'huggingface'
  | 'kaggle'
  | 'github'
  | 'eli'

export type RaqimCandidateKind =
  | 'artifact_citation'
  | 'model_card'
  | 'dataset'
  | 'software_release'
  | 'scholarly_report'

export interface RaqimLookupRequest {
  item: CslItem
  key?: string
  kind?: RaqimLookupKind
}

export interface RaqimResolveCandidate {
  id: string
  provider: RaqimCandidateProvider
  kind: RaqimCandidateKind
  confidence: number
  matchedFields: string[]
  mismatchReasons: string[]
  item: CslItem
}
