import { describe, expect, it } from 'vitest'
import {
  buildLlmChatCompletionsUrl,
  isLlmUrlNotAllowedError,
  validateLlmBaseUrl
} from '../../src/engine/network/llm-url'

describe('validateLlmBaseUrl', () => {
  it('allows local HTTP runners on localhost', () => {
    expect(validateLlmBaseUrl('http://localhost:1234').host).toBe('localhost:1234')
    expect(validateLlmBaseUrl('http://127.0.0.1:11434').host).toBe('127.0.0.1:11434')
    expect(validateLlmBaseUrl('http://localhost:8000').host).toBe('localhost:8000')
  })

  it('allows HTTPS cloud endpoints', () => {
    expect(validateLlmBaseUrl('https://api.openai.com').hostname).toBe('api.openai.com')
    expect(validateLlmBaseUrl('https://openrouter.ai/api').hostname).toBe('openrouter.ai')
  })

  it('blocks non-local HTTP endpoints', () => {
    expect(() => validateLlmBaseUrl('http://evil.com')).toThrow(/llm_url_not_allowed.*HTTPS/i)
    expect(() => validateLlmBaseUrl('http://api.openai.com')).toThrow(/llm_url_not_allowed.*HTTPS/i)
  })

  it('blocks private and metadata hosts', () => {
    expect(() => validateLlmBaseUrl('http://169.254.169.254')).toThrow(/llm_url_not_allowed/i)
    expect(() => validateLlmBaseUrl('http://192.168.1.1:1234')).toThrow(/llm_url_not_allowed/i)
    expect(() => validateLlmBaseUrl('https://192.168.1.10')).toThrow(/not allowed/i)
    expect(() => validateLlmBaseUrl('https://127.0.0.1')).toThrow(/llm_url_not_allowed/i)
  })

  it('blocks authenticated URLs', () => {
    expect(() => validateLlmBaseUrl('https://user:pass@api.openai.com')).toThrow(/authenticated/i)
  })

  it('rejects empty and invalid URLs', () => {
    expect(() => validateLlmBaseUrl('')).toThrow(/empty URL/i)
    expect(() => validateLlmBaseUrl('not a url')).toThrow(/invalid URL/i)
  })
})

describe('buildLlmChatCompletionsUrl', () => {
  it('appends /v1/chat/completions without duplicate slashes', () => {
    expect(buildLlmChatCompletionsUrl('http://localhost:1234')).toBe(
      'http://localhost:1234/v1/chat/completions'
    )
    expect(buildLlmChatCompletionsUrl('https://api.openai.com/')).toBe(
      'https://api.openai.com/v1/chat/completions'
    )
    expect(buildLlmChatCompletionsUrl('https://openrouter.ai/api')).toBe(
      'https://openrouter.ai/api/v1/chat/completions'
    )
  })
})

describe('isLlmUrlNotAllowedError', () => {
  it('detects policy errors', () => {
    expect(isLlmUrlNotAllowedError(new Error('llm_url_not_allowed: bad'))).toBe(true)
    expect(isLlmUrlNotAllowedError(new Error('other'))).toBe(false)
  })
})
