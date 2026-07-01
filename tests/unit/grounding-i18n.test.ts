import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/renderer/i18n/config'
import {
  groundingRepairedNotice,
  translatePdfImportWarnings
} from '../../src/renderer/utils/grounding-i18n'

describe('grounding-i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('maps PDF scan warning to localized string', async () => {
    await i18n.changeLanguage('ar')
    const out = translatePdfImportWarnings([
      'This PDF contains no extractable text — it is likely a scan. Run it through OCR (e.g. ocrmypdf, Adobe Acrobat) and re-import.'
    ])
    expect(out).toContain('مسح ضوئي')
    expect(out).not.toContain('This PDF contains')
  })

  it('returns English grounding repair notice when locale is en', () => {
    expect(groundingRepairedNotice()).toMatch(/auto-repaired/i)
  })
})
