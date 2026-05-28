export interface LlmVerdict {
  verdict: 'support' | 'weak' | 'unrelated' | 'insufficient_evidence'
  rationale: string[]
  evidence_spans: { start: number; end: number; quote: string }[]
}

export type LlmConfig = {
  baseUrl: string
  model: string
}

// Implemented in todo: relevance-llm (main-process IPC proxy).
export async function assessWithLlm(): Promise<LlmVerdict> {
  throw new Error('LLM assessment not implemented')
}

