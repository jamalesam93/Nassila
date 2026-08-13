import { NASSILA_MODEL_ARTIFACTS } from './nassila-agent-tasks'

export const NASSILA_WEB_BASE = 'https://nassila-web.vercel.app'

export function sanadSetupDocsUrl(locale: string): string {
  const lang = locale === 'ar' ? 'ar' : 'en'
  return `${NASSILA_WEB_BASE}/${lang}/docs/sanad-setup`
}

/** Hugging Face GGUF repo (public) — sole Sanad tier, 9B FT-5, 6 quants Q2_K–Q8_0. */
export const SANAD_HF_9B_URL = 'https://huggingface.co/QinEmPeRoR93/nassila-sanad-9b'
/** @deprecated Retired (abstract-era). Kept for legacy constants. */
export const SANAD_HF_E4B_URL = 'https://huggingface.co/QinEmPeRoR93/nassila-sanad-e4b'

/** Local runner home pages / docs. */
export const LM_STUDIO_URL = 'https://lmstudio.ai/'
export const OLLAMA_URL = 'https://ollama.com/'
export const VLLM_DOCS_URL = 'https://docs.vllm.ai/en/latest/'

/** Default OpenAI-compatible base URLs (Passage grounding settings). */
export const LM_STUDIO_DEFAULT_BASE = 'http://localhost:1234'
export const OLLAMA_DEFAULT_BASE = 'http://localhost:11434'

/**
 * Ollama HF Hub one-liner (verify :Q6_K tag against the HF filename).
 * Model id in Nassila must match `ollama list` after pull.
 */
export const OLLAMA_HF_PULL_9B = `ollama pull huggingface.co/QinEmPeRoR93/${NASSILA_MODEL_ARTIFACTS.sanad9b}:Q6_K`
/** @deprecated Retired (abstract-era). Kept for legacy constants. */
export const OLLAMA_HF_PULL_E4B = `ollama pull huggingface.co/QinEmPeRoR93/${NASSILA_MODEL_ARTIFACTS.sanadE4b}:Q6_K`

export const SANAD_DEFAULT_MODEL_ID = NASSILA_MODEL_ARTIFACTS.sanad9b