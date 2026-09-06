import type { ShahidEvidence } from './types'

/**
 * Stub for `table_figure_grounding` multimodal LLM hook.
 * Deterministic Markdown extraction covers the 2.0 scaffolding path;
 * do not call this as if multimodal grounding were available.
 */
export async function runTableFigureGrounding(_input?: {
  passage?: string
  sourceMarkdown?: string
  claim?: string
}): Promise<ShahidEvidence[]> {
  void _input
  return []
}

/** Honest capability flag for UI / stage gating. */
export const TABLE_FIGURE_GROUNDING_LLM_AVAILABLE = false
