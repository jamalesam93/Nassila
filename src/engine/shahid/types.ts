/**
 * Shahid (شاهد) — bounded table/figure evidence (schema v1 scaffolding).
 * Deterministic Markdown extraction ships as partial; multimodal LLM stays stubbed.
 */

export type ShahidRegionKind = 'table' | 'figure' | 'caption' | 'cell'

export type ShahidExtractionMethod = 'deterministic' | 'ocr' | 'llm'

/** Review state — deterministic path never auto-accepts. */
export type ShahidReviewState = 'accepted' | 'needs_review' | 'unsupported' | 'abstain'

export interface ShahidBBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ShahidPageBoundary {
  page: number
  start: number
  end: number
}

/**
 * One table/figure/caption/cell evidence row.
 * claim / citeSiteId are optional best-effort links (abstain when unset).
 */
export interface ShahidEvidence {
  id: string
  regionKind: ShahidRegionKind
  page?: number
  bbox?: ShahidBBox
  caption?: string
  /** Table body Markdown or figure alt/nearby text. */
  text?: string
  /** Compact cell excerpt when regionKind is cell. */
  cellEvidence?: string
  extractionMethod: ShahidExtractionMethod
  /** 0–1 advisory confidence. */
  confidence: number
  reviewState: ShahidReviewState
  claim?: string
  citeSiteId?: string
}

/** Cite-site handle for page/proximity linking (ids are caller-defined). */
export interface ShahidCiteSiteRef {
  citeSiteId: string
  pageHint?: string
  locator?: string
  passageWindow?: string
  claims?: string[]
}
