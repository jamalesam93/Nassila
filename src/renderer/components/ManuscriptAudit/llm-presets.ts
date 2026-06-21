import { NASSILA_MODEL_ARTIFACTS } from '../../../shared/nassila-agent-tasks'

export interface LlmPreset {
  id: string
  label: string
  baseUrl: string
  defaultModel: string
  modelHints: string[]
  notes?: string
}

export const LLM_PRESETS: LlmPreset[] = [
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    modelHints: [],
    notes: 'Any endpoint that accepts POST {baseUrl}/v1/chat/completions with a Bearer token.'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4.1-mini',
    modelHints: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o']
  },
  {
    id: 'dashscope-intl',
    label: 'Qwen — DashScope (Alibaba, international)',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode',
    defaultModel: 'qwen-plus',
    modelHints: ['qwen3-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-72b-instruct', 'qwen3-coder-plus']
  },
  {
    id: 'dashscope-cn',
    label: 'Qwen — DashScope (Alibaba, China)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    defaultModel: 'qwen-plus',
    modelHints: ['qwen3-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-72b-instruct', 'qwen3-coder-plus']
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (any open-weight model)',
    baseUrl: 'https://openrouter.ai/api',
    defaultModel: 'qwen/qwen3-235b-a22b-2507',
    modelHints: [
      'qwen/qwen3-235b-a22b-2507',
      'qwen/qwen3-coder',
      'qwen/qwen2.5-72b-instruct',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
      'anthropic/claude-3.5-sonnet'
    ]
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    modelHints: [
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'Qwen/Qwen2.5-7B-Instruct-Turbo',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-V3'
    ]
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'qwen2.5:14b',
    modelHints: ['qwen2.5:14b', 'qwen2.5:32b', 'qwen2.5-coder:14b', 'llama3.3:70b'],
    notes: 'Local Ollama exposes /v1/chat/completions. Use any pulled model; key can be any string.'
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234',
    defaultModel: NASSILA_MODEL_ARTIFACTS.sanadE4b,
    modelHints: [
      'google/gemma-4-e4b',
      NASSILA_MODEL_ARTIFACTS.sanadE4b,
      NASSILA_MODEL_ARTIFACTS.sanad12b,
      NASSILA_MODEL_ARTIFACTS.agentE12bV1,
      'gemma-4-e4b-it-q6_k',
      'gemma-4-e4b'
    ],
    notes:
      'Start the Local Server in LM Studio. Use base URL http://localhost:1234 (Nassila appends /v1/chat/completions). Sanad default: ' +
      NASSILA_MODEL_ARTIFACTS.sanadE4b +
      ' Q6_K (v1.12); optional quality: ' +
      NASSILA_MODEL_ARTIFACTS.sanad12b +
      ' Q6_K (v1.14). Validate GGUFs via NassilaT training/LAPTOP_SMOKE_TEST.md. Future merged Ouroboros: ' +
      NASSILA_MODEL_ARTIFACTS.agentE12bV1 +
      '. See docs/OUROBOROS.md.'
  },
  {
    id: 'vllm',
    label: 'vLLM / llama.cpp (local)',
    baseUrl: 'http://localhost:8000',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    modelHints: ['Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-32B-Instruct'],
    notes: 'Adjust port to match your local OpenAI-compatible server.'
  }
]

export function findPresetByBaseUrl(baseUrl: string): LlmPreset | undefined {
  const norm = (s: string) => s.replace(/\/+$/, '').toLowerCase()
  const target = norm(baseUrl)
  return LLM_PRESETS.find((p) => p.id !== 'custom' && norm(p.baseUrl) === target)
}
