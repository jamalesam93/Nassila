import { describe, expect, it } from 'vitest'
import en from '../../src/renderer/i18n/locales/en/translation.json'
import ar from '../../src/renderer/i18n/locales/ar/translation.json'

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path)
    }
    return [path]
  })
}

describe('i18n key parity', () => {
  it('ar translation.json has the same key tree as en', () => {
    const enKeys = flattenKeys(en as Record<string, unknown>).sort()
    const arKeys = flattenKeys(ar as Record<string, unknown>).sort()
    expect(arKeys).toEqual(enKeys)
  })
})
