import { NASSILA_MODEL_ARTIFACTS } from '../../shared/nassila-agent-tasks'

export interface LlmPreset {
  id: string
  label: string
  baseUrl: string
  defaultModel: string
  modelHints: string[]
}

/** Suggested Sanad GGUF ids for local runners (datalist only). */
export const NASSILA_SANAD_MODEL_HINTS = [
  NASSILA_MODEL_ARTIFACTS.sanadE4b,
  NASSILA_MODEL_ARTIFACTS.sanad12b
] as const

export const LLM_PRESETS: LlmPreset[] = [
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234',
    defaultModel: '',
    modelHints: [...NASSILA_SANAD_MODEL_HINTS]
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434',
    defaultModel: '',
    modelHints: [...NASSILA_SANAD_MODEL_HINTS]
  },
  {
    id: 'vllm',
    label: 'vLLM / llama.cpp (local)',
    baseUrl: 'http://localhost:8000',
    defaultModel: '',
    modelHints: [...NASSILA_SANAD_MODEL_HINTS]
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    modelHints: [...NASSILA_SANAD_MODEL_HINTS]
  },
  {
    id: 'cloud',
    label: 'Cloud API',
    baseUrl: '',
    defaultModel: '',
    modelHints: []
  }
]

const KNOWN_CLOUD_BASE_URLS = new Set([
  'https://api.openai.com',
  'https://openrouter.ai/api'
])

export function findPresetByBaseUrl(baseUrl: string): LlmPreset | undefined {
  const norm = (s: string) => s.replace(/\/+$/, '').toLowerCase()
  const target = norm(baseUrl)
  if (KNOWN_CLOUD_BASE_URLS.has(target)) {
    return LLM_PRESETS.find((p) => p.id === 'cloud')
  }
  return LLM_PRESETS.find((p) => p.id !== 'custom' && p.id !== 'cloud' && norm(p.baseUrl) === target)
}

export function resolveLlmPreset(presetId: string): LlmPreset {
  return LLM_PRESETS.find((p) => p.id === presetId) ?? LLM_PRESETS.find((p) => p.id === 'lmstudio')!
}
