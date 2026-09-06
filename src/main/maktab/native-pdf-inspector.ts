/**
 * Main-process native pdf-inspector: resolves offline model dir and registers
 * the injectable engine backend used by `extractManuscriptFromPdf`.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  classifyPdfNative,
  isNativePdfInspectorAvailable,
  processPdfNative,
  type NativeExtractOptions
} from '../../engine/maktab/native-pdf-inspector'
import {
  setMaktabNativePdfBackend,
  type MaktabNativePdfBackend
} from '../../engine/maktab/native-backend'

export function resolvePdfInspectorModelDirectory(runtime: {
  isPackaged: boolean
  appPath: string
  resourcesPath: string
  userDataPath?: string
}): string | undefined {
  const candidates = [
    runtime.isPackaged
      ? join(runtime.resourcesPath, 'pdf-inspector', 'pp-ocrv6-small')
      : join(runtime.appPath, 'resources', 'pdf-inspector', 'pp-ocrv6-small'),
    runtime.userDataPath
      ? join(runtime.userDataPath, 'pdf-inspector', 'pp-ocrv6-small')
      : undefined
  ].filter((p): p is string => Boolean(p))

  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  return undefined
}

export function createMainNativePdfBackend(options?: {
  modelDirectory?: string
}): MaktabNativePdfBackend {
  return {
    id: 'firecrawl-pdf-inspector-native',

    isAvailable(): boolean {
      return isNativePdfInspectorAvailable()
    },

    async classify(buffer: ArrayBuffer) {
      return classifyPdfNative(buffer)
    },

    async extract(buffer: ArrayBuffer, extractOptions?: NativeExtractOptions) {
      const modelDirectory =
        extractOptions?.modelDirectory ?? options?.modelDirectory ?? undefined
      return processPdfNative(buffer, {
        offline: extractOptions?.offline !== false,
        modelDirectory,
        dpi: extractOptions?.dpi
      })
    }
  }
}

/** Register native backend for main-process extractFromPdf (Masdar cache, etc.). */
export function registerMainNativePdfBackend(): void {
  try {
    // Lazy electron import so unit tests can load helpers without app ready.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    const modelDirectory = resolvePdfInspectorModelDirectory({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      userDataPath: app.getPath('userData')
    })
    setMaktabNativePdfBackend(createMainNativePdfBackend({ modelDirectory }))
  } catch {
    if (isNativePdfInspectorAvailable()) {
      setMaktabNativePdfBackend(createMainNativePdfBackend())
    }
  }
}
