import type { MaktabExtractionTier, MaktabLanguage } from '../engine/maktab/types'

export const SOURCE_ARTIFACT_ATTACH_CHANNEL = 'sourceArtifact:attach'

export interface SourcePageBoundary {
  page: number
  start: number
  end: number
}

export interface SourceArtifact {
  path: string
  sha256: string
  sourceHash: string
  size: number
  extractedTextCacheKey: string
  tier: MaktabExtractionTier
  languages: MaktabLanguage[]
  warnings: string[]
  pageCount: number
  pageBoundaries: SourcePageBoundary[]
  attachedAt: string
}

export type LoadedSourceArtifact =
  | { status: 'ready'; artifact: SourceArtifact; text: string }
  | { status: 'changed'; artifact: SourceArtifact; actualSha256: string }
  | { status: 'missing'; artifact: SourceArtifact }

export function isSourceArtifact(value: unknown): value is SourceArtifact {
  if (!isRecord(value)) return false
  return (
    typeof value.path === 'string' &&
    value.path.length > 0 &&
    isSha256(value.sha256) &&
    value.sourceHash === `sha256:${value.sha256}` &&
    Number.isSafeInteger(value.size) &&
    (value.size as number) >= 0 &&
    value.extractedTextCacheKey === `source-pdf:${value.sha256}` &&
    (value.tier === 'embedded_text' || value.tier === 'ocr') &&
    Array.isArray(value.languages) &&
    value.languages.every((language) => language === 'eng' || language === 'fra' || language === 'ara') &&
    Array.isArray(value.warnings) &&
    value.warnings.every((warning) => typeof warning === 'string') &&
    Number.isSafeInteger(value.pageCount) &&
    (value.pageCount as number) >= 0 &&
    Array.isArray(value.pageBoundaries) &&
    value.pageBoundaries.every(isPageBoundary) &&
    typeof value.attachedAt === 'string'
  )
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}

function isPageBoundary(value: unknown): value is SourcePageBoundary {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.page) &&
    (value.page as number) > 0 &&
    Number.isSafeInteger(value.start) &&
    (value.start as number) >= 0 &&
    Number.isSafeInteger(value.end) &&
    (value.end as number) >= (value.start as number)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
