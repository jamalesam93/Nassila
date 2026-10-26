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

/** Arabic has six CLDR plural categories; en only needs `_one` / `_other`. */
const AR_ONLY_PLURAL_SUFFIX = /_(zero|two|few|many)$/

describe('i18n key parity', () => {
  it('ar translation.json has the same key tree as en (ignoring Arabic-only plural forms)', () => {
    const enKeys = flattenKeys(en as Record<string, unknown>).sort()
    const arKeys = flattenKeys(ar as Record<string, unknown>)
      .filter((k) => !AR_ONLY_PLURAL_SUFFIX.test(k))
      .sort()
    expect(arKeys).toEqual(enKeys)
  })

  it('every Arabic plural group has _one and _other', () => {
    const arKeys = new Set(flattenKeys(ar as Record<string, unknown>))
    const bases = new Set(
      [...arKeys]
        .filter((k) => AR_ONLY_PLURAL_SUFFIX.test(k))
        .map((k) => k.replace(AR_ONLY_PLURAL_SUFFIX, ''))
    )
    for (const base of bases) {
      expect(arKeys.has(`${base}_one`), `${base}_one`).toBe(true)
      expect(arKeys.has(`${base}_other`), `${base}_other`).toBe(true)
    }
  })
})
