import { NASSILA_MODEL_ARTIFACTS } from './nassila-agent-tasks'

/** Hugging Face GGUF repos (public). */
export const SANAD_HF_E4B_URL = 'https://huggingface.co/QinEmPeRoR93/nassila-sanad-e4b'
export const SANAD_HF_12B_URL = 'https://huggingface.co/QinEmPeRoR93/nassila-sanad-12b'

/** Local runner home pages / docs. */
export const LM_STUDIO_URL = 'https://lmstudio.ai/'
export const OLLAMA_URL = 'https://ollama.com/'
export const VLLM_DOCS_URL = 'https://docs.vllm.ai/en/latest/'

/** Default OpenAI-compatible base URLs (Passage grounding settings). */
export const LM_STUDIO_DEFAULT_BASE = 'http://localhost:1234'
export const OLLAMA_DEFAULT_BASE = 'http://localhost:11434'

/**
 * Ollama HF Hub one-liners (verify :Q6_K tags against your HF filenames).
 * Model id in Nassila must match `ollama list` after pull.
 */
export const OLLAMA_HF_PULL_E4B = `ollama pull huggingface.co/QinEmPeRoR93/${NASSILA_MODEL_ARTIFACTS.sanadE4b}:Q6_K`
export const OLLAMA_HF_PULL_12B = `ollama pull huggingface.co/QinEmPeRoR93/${NASSILA_MODEL_ARTIFACTS.sanad12b}:Q6_K`

export const SANAD_DEFAULT_MODEL_ID = NASSILA_MODEL_ARTIFACTS.sanadE4b
export const SANAD_QUALITY_MODEL_ID = NASSILA_MODEL_ARTIFACTS.sanad12b
