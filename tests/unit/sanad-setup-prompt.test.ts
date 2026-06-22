import { describe, expect, it } from 'vitest'
import {
  OLLAMA_HF_PULL_E4B,
  SANAD_HF_E4B_URL,
  SANAD_HF_12B_URL
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
  it('exports canonical HF URLs', () => {
    expect(SANAD_HF_E4B_URL).toContain('nassila-sanad-e4b')
    expect(SANAD_HF_12B_URL).toContain('nassila-sanad-12b')
  })

  it('exports Ollama HF pull command', () => {
    expect(OLLAMA_HF_PULL_E4B).toContain('hf.co/QinEmPeRoR93/nassila-sanad-e4b')
    expect(OLLAMA_HF_PULL_E4B).toContain(':Q6_K')
  })
})
