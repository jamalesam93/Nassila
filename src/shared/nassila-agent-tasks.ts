/**
 * Nassila Ouroboros — task ids, workers, and model artifact names.
 * Seven workers = future product modules (deterministic core + optional LLM facet).
 * One local model identity over time; the app routes by `task`.
 * See docs/OUROBOROS_CONTEXT.md and docs/OUROBOROS.md
 */

/** Trained / routable LLM task identifiers (JSONL `task` field + runtime routing). */
export const NASSILA_AGENT_TASKS = {
  /** L3: passage vs source excerpt → grounding JSON (v1 worker Sanad). */
  l3_grounding: 'l3_grounding',
  /** Manuscript PDF/DOCX → structured text (planned). */
  doc_extract: 'doc_extract',
  /** Cited OA PDF → text for L3 (planned). */
  source_pdf_extract: 'source_pdf_extract',
  /** Claims vs table/figure regions (planned, multimodal). */
  table_figure_grounding: 'table_figure_grounding',
  webpage_metadata: 'webpage_metadata',
  webpage_classify: 'webpage_classify',
  issue_explain: 'issue_explain'
} as const

export type NassilaAgentTaskId = (typeof NASSILA_AGENT_TASKS)[keyof typeof NASSILA_AGENT_TASKS]

/** Ouroboros workers — codenames for future product modules. LLM facet = trainable `task`; deterministic core lives in engine today. See docs/OUROBOROS_CONTEXT.md §3. */
export const OUROBOROS_WORKERS: Record<
  NassilaAgentTaskId,
  { codename: string; description: string; module: string }
> = {
  [NASSILA_AGENT_TASKS.l3_grounding]: {
    codename: 'Sanad',
    module: 'Ground claims to sources',
    description: 'LLM: passage vs source excerpt → grounding JSON (supported / weak / …)'
  },
  [NASSILA_AGENT_TASKS.doc_extract]: {
    codename: 'Maktab',
    module: 'Manuscript ingest',
    description: 'LLM: PDF/DOCX → structured text and chunks'
  },
  [NASSILA_AGENT_TASKS.source_pdf_extract]: {
    codename: 'Masdar',
    module: 'Cited source text',
    description: 'LLM: cited open-access PDF → text chunks for Sanad'
  },
  [NASSILA_AGENT_TASKS.table_figure_grounding]: {
    codename: 'Shahid',
    module: 'Tables & figures as evidence',
    description: 'LLM: claims vs table/figure regions (multimodal, planned 12B)'
  },
  [NASSILA_AGENT_TASKS.webpage_metadata]: {
    codename: 'Raqim',
    module: 'Reference records (verify, export)',
    description: 'LLM: webpage signals → CSL metadata suggestions; core: L1/L2, parsers, citeproc'
  },
  [NASSILA_AGENT_TASKS.webpage_classify]: {
    codename: 'Tasnif',
    module: 'Type, dedupe, predatory flags',
    description: 'LLM: grey-web and platform typing; core: predatory lists, dedup'
  },
  [NASSILA_AGENT_TASKS.issue_explain]: {
    codename: 'Sharh',
    module: 'Explain failures & mismatches',
    description: 'LLM: user-facing fetch/verify explanations; core: mismatch copy, i18n'
  }
}

/** Shipped or planned GGUF / HF repo basename (without quant suffix). Train checkpoint (FT-6) is on the model card only. */
export const NASSILA_MODEL_ARTIFACTS = {
  /** Sanad sole tier — Qwen 3.5 9B FT-6 (v119). 4B S15 / 12B S14 retired (abstract-era). */
  sanad9b: 'nassila-sanad-9b',
  /** @deprecated Retired (abstract-era). Kept for legacy preset recognition. */
  sanad12b: 'nassila-sanad-12b',
  /** @deprecated Legacy tier — Gemma 4 E4B Q6_K (~5.8 GB). Kept for legacy constants. */
  sanadE4b: 'nassila-sanad-e4b',
  /** Future unified multi-task model. */
  agentE12bV1: 'nassila-agent-e12b-v1',
  /** Optional legacy webpage-only adapter name. */
  webciteE4bV1: 'nassila-webcite-e4b-v1'
} as const

/** Tasks targeted by each artifact (documentation / presets; not enforced at runtime yet). */
export const MODEL_ARTIFACT_TASKS: Record<string, NassilaAgentTaskId[]> = {
  [NASSILA_MODEL_ARTIFACTS.sanad9b]: [NASSILA_AGENT_TASKS.l3_grounding],
  // Deprecated alias NASSILA_MODEL_ARTIFACTS.sanad12b maps to 'nassila-sanad-12b' (retired), covered below.
  [NASSILA_MODEL_ARTIFACTS.sanad12b]: [NASSILA_AGENT_TASKS.l3_grounding],
  [NASSILA_MODEL_ARTIFACTS.sanadE4b]: [NASSILA_AGENT_TASKS.l3_grounding],
  [NASSILA_MODEL_ARTIFACTS.agentE12bV1]: [
    NASSILA_AGENT_TASKS.l3_grounding,
    NASSILA_AGENT_TASKS.doc_extract,
    NASSILA_AGENT_TASKS.source_pdf_extract,
    NASSILA_AGENT_TASKS.table_figure_grounding,
    NASSILA_AGENT_TASKS.webpage_metadata,
    NASSILA_AGENT_TASKS.webpage_classify,
    NASSILA_AGENT_TASKS.issue_explain
  ],
  [NASSILA_MODEL_ARTIFACTS.webciteE4bV1]: [
    NASSILA_AGENT_TASKS.webpage_metadata,
    NASSILA_AGENT_TASKS.webpage_classify,
    NASSILA_AGENT_TASKS.issue_explain
  ]
}

