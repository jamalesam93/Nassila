/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { applyDomLocale } from '../../src/renderer/i18n/config'

describe('i18n RTL', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('sets html dir=rtl and lang=ar for Arabic locale', () => {
    applyDomLocale('ar')
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
  })

  it('sets html dir=ltr and lang=en for English locale', () => {
    applyDomLocale('en')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
  })
})
