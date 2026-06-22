import { describe, expect, it } from 'vitest'
import { findPresetByBaseUrl } from '../../src/renderer/components/ManuscriptAudit/llm-presets'
import {
  applyLlmPreset,
  allowsShortLlmKey,
  inferCloudEndpointFromKey,
  isLocalRunnerPreset,
  migrateLlmPresetId
} from '../../src/renderer/utils/llm-config-utils'

describe('migrateLlmPresetId', () => {
  it('maps legacy cloud presets to cloud', () => {
    expect(migrateLlmPresetId('openai')).toBe('cloud')
    expect(migrateLlmPresetId('openrouter')).toBe('cloud')
    expect(migrateLlmPresetId('together')).toBe('cloud')
    expect(migrateLlmPresetId('dashscope-intl')).toBe('cloud')
  })

  it('keeps local presets', () => {
    expect(migrateLlmPresetId('lmstudio')).toBe('lmstudio')
    expect(migrateLlmPresetId('ollama')).toBe('ollama')
  })

  it('falls back unknown ids to lmstudio', () => {
    expect(migrateLlmPresetId('does-not-exist')).toBe('lmstudio')
  })
})

describe('inferCloudEndpointFromKey', () => {
  it('detects OpenRouter keys', () => {
    expect(inferCloudEndpointFromKey('sk-or-v1-abc')).toEqual({
      baseUrl: 'https://openrouter.ai/api',
      providerKind: 'openrouter'
    })
  })

  it('detects OpenAI keys', () => {
    expect(inferCloudEndpointFromKey('sk-proj-abc')).toEqual({
      baseUrl: 'https://api.openai.com',
      providerKind: 'openai'
    })
  })

  it('returns unknown for opaque keys', () => {
    expect(inferCloudEndpointFromKey('my-custom-key')).toEqual({
      baseUrl: '',
      providerKind: 'unknown'
    })
  })
})

describe('applyLlmPreset', () => {
  it('returns base URL only for local runners', () => {
    expect(applyLlmPreset('ollama')).toEqual({
      baseUrl: 'http://localhost:11434',
      model: ''
    })
    expect(applyLlmPreset('lmstudio')).toEqual({
      baseUrl: 'http://localhost:1234',
      model: ''
    })
  })

  it('returns empty fields for cloud', () => {
    expect(applyLlmPreset('cloud')).toEqual({ baseUrl: '', model: '' })
  })
})

describe('allowsShortLlmKey', () => {
  it('disallows cloud preset', () => {
    expect(allowsShortLlmKey('cloud', '')).toBe(false)
  })

  it('allows local runners', () => {
    expect(allowsShortLlmKey('ollama', 'http://localhost:11434')).toBe(true)
  })
})

describe('isLocalRunnerPreset', () => {
  it('includes local runners and custom', () => {
    expect(isLocalRunnerPreset('ollama')).toBe(true)
    expect(isLocalRunnerPreset('custom')).toBe(true)
  })

  it('excludes cloud', () => {
    expect(isLocalRunnerPreset('cloud')).toBe(false)
  })
})

describe('findPresetByBaseUrl', () => {
  it('maps known cloud URLs to cloud preset', () => {
    expect(findPresetByBaseUrl('https://openrouter.ai/api')?.id).toBe('cloud')
    expect(findPresetByBaseUrl('https://api.openai.com/')?.id).toBe('cloud')
  })
})
