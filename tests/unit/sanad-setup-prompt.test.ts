import { describe, expect, it } from 'vitest'
import {
  OLLAMA_HF_PULL_9B,
  SANAD_HF_9B_URL
} from '../../src/shared/sanad-setup-links'
import { shouldAutoOpenSanadSetup } from '../../src/renderer/utils/sanad-setup-prompt'

describe('shouldAutoOpenSanadSetup', () => {
  it('opens when not dismissed and not tested', () => {
    expect(shouldAutoOpenSanadSetup({})).toBe(true)
  })

  it('does not open when dismissed', () => {
    expect(shouldAutoOpenSanadSetup({ sanadSetupDismissed: true })).toBe(false)
  })

  it('does not open when connection already tested', () => {
    expect(shouldAutoOpenSanadSetup({ sanadConnectionTested: true })).toBe(false)
  })
})

describe('sanad-setup-links', () => {
  it('exports the canonical 9B HF URL', () => {
    expect(SANAD_HF_9B_URL).toContain('nassila-sanad-9b')
  })

  it('exports the Ollama HF pull command for the 9B model', () => {
    expect(OLLAMA_HF_PULL_9B).toContain('huggingface.co/QinEmPeRoR93/nassila-sanad-9b')
    expect(OLLAMA_HF_PULL_9B).toContain(':Q6_K')
    expect(OLLAMA_HF_PULL_9B).toMatch(/^ollama pull /)
  })
})
