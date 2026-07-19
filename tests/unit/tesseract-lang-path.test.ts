import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveTesseractLangPath } from '../../src/main/maktab/tesseract-ocr'

describe('resolveTesseractLangPath', () => {
  it('uses the project resources directory in development', () => {
    const appPath = join('workspace', 'nassila')

    expect(
      resolveTesseractLangPath({
        isPackaged: false,
        appPath,
        resourcesPath: join('installed', 'resources')
      })
    ).toBe(join(appPath, 'resources', 'tesseract'))
  })

  it('uses the Electron resources directory when packaged', () => {
    const resourcesPath = join('installed', 'resources')

    expect(
      resolveTesseractLangPath({
        isPackaged: true,
        appPath: join('installed', 'resources', 'app.asar'),
        resourcesPath
      })
    ).toBe(join(resourcesPath, 'tesseract'))
  })
})
