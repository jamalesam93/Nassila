/**
 * Ouroboros product loop stages — stable ids for UI, docs, and orchestration.
 * Engineering registry: patterns/ouroboros-registry.yaml · LOOP.md
 */

import { NASSILA_AGENT_TASKS, OUROBOROS_WORKERS, type NassilaAgentTaskId } from './nassila-agent-tasks'

export const OUROBOROS_LOOP_STAGE_IDS = {
  upload: 'upload',
  maktabExtract: 'maktab_extract',
  masdarSources: 'masdar_sources',
  raqimVerify: 'raqim_verify',
  tasnifRisk: 'tasnif_risk',
  sanadGround: 'sanad_ground',
  sharhExplain: 'sharh_explain',
  shahidEvidence: 'shahid_evidence',
  export: 'export'
} as const

export type OuroborosLoopStageId = (typeof OUROBOROS_LOOP_STAGE_IDS)[keyof typeof OUROBOROS_LOOP_STAGE_IDS]

export type OuroborosStageStatus = 'live' | 'partial' | 'planned'

export interface OuroborosLoopStage {
  id: OuroborosLoopStageId
  /** Worker codename when this stage maps to a worker module */
  workerCodename?: string
  taskId?: NassilaAgentTaskId
  label: string
  status: OuroborosStageStatus
  deterministic: boolean
}

/** Ordered manuscript audit pipeline (product loop). */
export const OUROBOROS_LOOP_STAGES: readonly OuroborosLoopStage[] = [
  {
    id: OUROBOROS_LOOP_STAGE_IDS.upload,
    label: 'Upload manuscript',
    status: 'live',
    deterministic: true
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.maktabExtract,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.doc_extract].codename,
    taskId: NASSILA_AGENT_TASKS.doc_extract,
    label: 'Extract text & structure',
    status: 'partial',
    deterministic: true
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.masdarSources,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.source_pdf_extract].codename,
    taskId: NASSILA_AGENT_TASKS.source_pdf_extract,
    label: 'Resolve cited sources',
    status: 'partial',
    deterministic: true
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.raqimVerify,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.webpage_metadata].codename,
    taskId: NASSILA_AGENT_TASKS.webpage_metadata,
    label: 'Verify references (L1/L2)',
    status: 'live',
    deterministic: true
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.tasnifRisk,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.webpage_classify].codename,
    taskId: NASSILA_AGENT_TASKS.webpage_classify,
    label: 'Dedupe & risk flags',
    status: 'live',
    deterministic: true
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.sanadGround,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.l3_grounding].codename,
    taskId: NASSILA_AGENT_TASKS.l3_grounding,
    label: 'Ground claims (L3)',
    status: 'live',
    deterministic: false
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.sharhExplain,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.issue_explain].codename,
    taskId: NASSILA_AGENT_TASKS.issue_explain,
    label: 'Explain findings',
    status: 'partial',
    deterministic: true
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.shahidEvidence,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.table_figure_grounding].codename,
    taskId: NASSILA_AGENT_TASKS.table_figure_grounding,
    label: 'Table & figure evidence',
    status: 'planned',
    deterministic: false
  },
  {
    id: OUROBOROS_LOOP_STAGE_IDS.export,
    workerCodename: OUROBOROS_WORKERS[NASSILA_AGENT_TASKS.webpage_metadata].codename,
    label: 'Export bibliography & audit',
    status: 'live',
    deterministic: true
  }
] as const

export function getOuroborosStage(id: OuroborosLoopStageId): OuroborosLoopStage | undefined {
  return OUROBOROS_LOOP_STAGES.find((s) => s.id === id)
}
