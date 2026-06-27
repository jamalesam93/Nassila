import { findPresetByBaseUrl, LLM_PRESETS, type LlmPreset } from '../settings/llm-presets'
import { NASSILA_MODEL_ARTIFACTS } from '../../shared/nassila-agent-tasks'

export const LM_STUDIO_DEFAULT_URL = 'http://localhost:1234'
export const OLLAMA_DEFAULT_URL = 'http://localhost:11434'
export const VLLM_DEFAULT_URL = 'http://localhost:8000'
export const LOCAL_LLM_PLACEHOLDER_KEY = 'local'
export const CLOUD_LLM_PRESET_ID = 'cloud'

export type SanadTier = 'e4b' | '12b'
export type CloudProviderKind = 'openrouter' | 'openai' | 'unknown'

/** Presets treated as on-device runners (short API key allowed). */
export const LOCAL_LLM_PRESET_IDS = new Set(['lmstudio', 'ollama', 'vllm'])

const LEGACY_CLOUD_PRESET_IDS = new Set([
  'openai',
  'openrouter',
  'together',
  'dashscope-intl',
  'dashscope-cn'
])

export function migrateLlmPresetId(presetId: string): string {
  if (LEGACY_CLOUD_PRESET_IDS.has(presetId)) return CLOUD_LLM_PRESET_ID
  if (LLM_PRESETS.some((p) => p.id === presetId)) return presetId
  return 'lmstudio'
}

export function inferCloudEndpointFromKey(apiKey: string): {
  baseUrl: string
  providerKind: CloudProviderKind
} {
  const k = apiKey.trim()
  if (k.startsWith('sk-or-')) {
    return { baseUrl: 'https://openrouter.ai/api', providerKind: 'openrouter' }
  }
  if (k.startsWith('sk-')) {
    return { baseUrl: 'https://api.openai.com', providerKind: 'openai' }
  }
  return { baseUrl: '', providerKind: 'unknown' }
}

export function isLocalRunnerPreset(presetId: string): boolean {
  return LOCAL_LLM_PRESET_IDS.has(presetId) || presetId === 'custom'
}

export function defaultBaseUrlForPreset(presetId: string): string {
  switch (presetId) {
    case 'ollama':
      return OLLAMA_DEFAULT_URL
    case 'vllm':
      return VLLM_DEFAULT_URL
    case 'lmstudio':
      return LM_STUDIO_DEFAULT_URL
    default:
      return ''
  }
}

export function sanadTierFromModel(model: string): SanadTier {
  return model === NASSILA_MODEL_ARTIFACTS.sanad12b ? '12b' : 'e4b'
}

export function modelForSanadTier(tier: SanadTier): string {
  return tier === '12b' ? NASSILA_MODEL_ARTIFACTS.sanad12b : NASSILA_MODEL_ARTIFACTS.sanadE4b
}

export function isNassilaSanadModel(model: string): boolean {
  return model === NASSILA_MODEL_ARTIFACTS.sanadE4b || model === NASSILA_MODEL_ARTIFACTS.sanad12b
}

export function allowsShortLlmKey(presetId: string, baseUrl: string): boolean {
  if (presetId === CLOUD_LLM_PRESET_ID) return false
  if (LOCAL_LLM_PRESET_IDS.has(presetId)) return true
  try {
    const u = new URL(baseUrl.trim().startsWith('http') ? baseUrl.trim() : `http://${baseUrl.trim()}`)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function resolvePresetId(presetId: string, baseUrl: string): string {
  const migrated = migrateLlmPresetId(presetId)
  if (LLM_PRESETS.some((p) => p.id === migrated)) return migrated
  return findPresetByBaseUrl(baseUrl)?.id ?? 'custom'
}

export function getLlmPreset(presetId: string): LlmPreset {
  const id = migrateLlmPresetId(presetId)
  return LLM_PRESETS.find((p) => p.id === id) ?? LLM_PRESETS.find((p) => p.id === 'custom')!
}

/** Local presets set base URL only; cloud leaves both fields for user/key inference. */
export function applyLlmPreset(presetId: string): { baseUrl: string; model: string } {
  const preset = getLlmPreset(presetId)
  if (preset.id === 'custom' || preset.id === CLOUD_LLM_PRESET_ID) {
    return { baseUrl: preset.baseUrl, model: '' }
  }
  if (LOCAL_LLM_PRESET_IDS.has(preset.id)) {
    return { baseUrl: preset.baseUrl, model: '' }
  }
  return { baseUrl: preset.baseUrl, model: preset.defaultModel }
}

/** Auto-save a placeholder key for localhost; cloud requires user to save a real key. */
export async function ensureLlmKeyReady(presetId: string, baseUrl: string): Promise<void> {
  if (!window.api?.hasLlmKey || !window.api.setLlmKey) {
    throw new Error('LLM API unavailable')
  }
  const has = await window.api.hasLlmKey()
  if (has) return
  if (allowsShortLlmKey(presetId, baseUrl)) {
    await window.api.setLlmKey(LOCAL_LLM_PLACEHOLDER_KEY, { allowShortPlaceholder: true })
    return
  }
  throw new Error('No LLM API key set')
}

export function presetLabelKey(presetId: string): string {
  return `settings.localModels.provider.${migrateLlmPresetId(presetId)}`
}

export const LLM_PROVIDER_GROUPS: { labelKey: string; presetIds: string[] }[] = [
  {
    labelKey: 'settings.localModels.groupLocal',
    presetIds: ['lmstudio', 'ollama', 'vllm', 'custom']
  },
  {
    labelKey: 'settings.localModels.groupCloud',
    presetIds: [CLOUD_LLM_PRESET_ID]
  }
]
