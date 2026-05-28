// @vitest-environment jsdom

import { useEffect } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/App'
import { useCitationStore } from '../../src/renderer/stores/citation-store'
import { useKeyboardShortcuts } from '../../src/renderer/hooks/use-keyboard-shortcuts'
import { useCitationEngine } from '../../src/renderer/hooks/use-citation-engine'
import type { ElectronApi } from '../../src/preload'
import type { PredatoryListMeta } from '../../src/shared/predatory'
import bundledPredatory from '../../src/engine/predatory/data.json'

const { verifyUnifiedRegistryWithPatchesMock } = vi.hoisted(() => ({
  verifyUnifiedRegistryWithPatchesMock: vi.fn()
}))

vi.mock('../../src/engine/verifier/verify-and-apply', () => ({
  prioritizeForUnifiedRegistryCheck: (items: unknown[], max: number) =>
    (items as { id: string }[]).slice(0, max),
  verifyUnifiedRegistryWithPatches: verifyUnifiedRegistryWithPatchesMock
}))

function ShortcutHarness() {
  useKeyboardShortcuts()
  return null
}

function EngineHarness(props: {
  onReady: (engine: ReturnType<typeof useCitationEngine>) => void
}) {
  const engine = useCitationEngine()

  useEffect(() => {
    props.onReady(engine)
  }, [engine, props])

  return null
}

function defaultPredatoryMeta(): PredatoryListMeta {
  const b = bundledPredatory as { version: string; sourceUrl: string; journals: unknown[]; publishers: unknown[] }
  return {
    version: b.version,
    sourceUrl: b.sourceUrl,
    fetchedAt: null,
    lastCheckedAt: null,
    lastNetworkAttemptAt: null,
    etag: null,
    entryCount: b.journals.length + b.publishers.length,
    origin: 'bundled',
    updateAvailablePending: false,
    remoteFingerprint: null
  }
}

function resetStoreState(): void {
  useCitationStore.setState({
    citations: [],
    selectedStyleId: null,
    selectedJournal: null,
    issues: [],
    verificationMismatches: [],
    registryLayerByCitationId: {},
    duplicates: [],
    duplicateGroupByCitation: {},
    predatoryFlags: [],
    predatoryByCitation: {},
    dismissedPredatoryIds: new Set(),
    predatoryListMeta: null,
    predatoryUpdateAvailable: false,
    detectedStyle: null,
    formattedBibliography: '',
    networkStatus: 'online',
    recentStyles: [],
    presets: [],
    citationStatuses: {},
    preAutocorrectIssueIds: new Set(),
    canUndo: false,
    canRedo: false
  })
}

function createApiMock(overrides: Partial<ElectronApi> = {}): ElectronApi {
  return {
    openFileDialog: vi.fn().mockResolvedValue(null),
    saveFileDialog: vi.fn().mockResolvedValue(null),
    readFile: vi.fn().mockResolvedValue(''),
    readFileBinary: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    writeFile: vi.fn().mockResolvedValue(undefined),
    loadPresets: vi.fn().mockResolvedValue([]),
    savePresets: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue({}),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemTheme: vi.fn().mockResolvedValue('light'),
    setNativeTheme: vi.fn().mockResolvedValue(undefined),
    onSystemThemeChanged: vi.fn().mockReturnValue(() => {}),
    onMenuCommand: vi.fn().mockReturnValue(() => {}),
    checkNetwork: vi.fn().mockResolvedValue('online'),
    unpaywall: vi.fn().mockResolvedValue(null),
    europePmcJatsByPmcid: vi.fn(),
    fetchOaUrl: vi.fn(),
    isEncryptionAvailable: vi.fn().mockResolvedValue(false),
    hasLlmKey: vi.fn().mockResolvedValue(false),
    setLlmKey: vi.fn().mockResolvedValue(undefined),
    clearLlmKey: vi.fn().mockResolvedValue(undefined),
    llmChat: vi.fn().mockResolvedValue(''),
    loadManuscriptAuditPrefs: vi.fn().mockResolvedValue({ version: 1 }),
    saveManuscriptAuditPrefs: vi.fn().mockResolvedValue(undefined),
    listTemplates: vi.fn().mockResolvedValue([]),
    saveTemplate: vi.fn().mockResolvedValue(undefined),
    deleteTemplate: vi.fn().mockResolvedValue(undefined),
    getAppAbout: vi.fn().mockResolvedValue({ name: 'Test', version: '0' }),
    setMenuLocale: vi.fn().mockResolvedValue(undefined),
    setAppMode: vi.fn().mockResolvedValue(undefined),
    convertPdfWithMarker: vi.fn().mockResolvedValue({ ok: false, error: 'noop', stderr: '' }),
    predatory: {
      getList: vi.fn().mockResolvedValue(bundledPredatory),
      getStatus: vi.fn().mockResolvedValue(defaultPredatoryMeta()),
      checkForUpdates: vi.fn().mockResolvedValue({
        upToDate: true,
        remoteVersion: null,
        localVersion: (bundledPredatory as { version: string }).version,
        updateAvailable: false
      }),
      applyUpdate: vi.fn().mockRejectedValue(new Error('applyUpdate not mocked'))
    },
    ...overrides
  }
}

beforeEach(() => {
  resetStoreState()
  verifyUnifiedRegistryWithPatchesMock.mockReset().mockImplementation(async (citations: { id: string }[]) => ({
    nextCitations: citations,
    remainingMismatches: [],
    layersByCitationId: {}
  }))

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  window.api = createApiMock()
})

afterEach(() => {
  cleanup()
})

describe('renderer flows', () => {
  it('hydrates presets on app startup', async () => {
    const preset = {
      id: 'preset-1',
      label: 'Nature',
      styleId: 'nature',
      createdAt: Date.now()
    }

    window.api = createApiMock({
      loadPresets: vi.fn().mockResolvedValue([preset])
    })

    render(<App />)

    await waitFor(() => {
      expect(useCitationStore.getState().presets).toEqual([preset])
    })
  })

  it('imports a selected file from the keyboard shortcut', async () => {
    window.api = createApiMock({
      openFileDialog: vi.fn().mockResolvedValue(['import.json']),
      readFile: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: 'imported-item',
            type: 'article-journal',
            title: 'Imported via Shortcut'
          }
        ])
      )
    })

    render(<ShortcutHarness />)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', ctrlKey: true }))
    })

    await waitFor(() => {
      expect(useCitationStore.getState().citations).toHaveLength(1)
    })
    expect(window.api.readFile).toHaveBeenCalledWith('import.json')
  })

  it('exports citations from the keyboard shortcut', async () => {
    useCitationStore.setState({
      citations: [
        {
          id: 'export-item',
          type: 'article-journal',
          title: 'Exported Item'
        }
      ],
      formattedBibliography: 'Exported Item'
    })

    window.api = createApiMock({
      saveFileDialog: vi.fn().mockResolvedValue('export.txt')
    })

    render(<ShortcutHarness />)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }))
    })

    await waitFor(() => {
      expect(window.api.writeFile).toHaveBeenCalledWith('export.txt', 'Exported Item')
    })
  })

  it('stores verification mismatches after ingesting verifiable items', async () => {
    verifyUnifiedRegistryWithPatchesMock.mockResolvedValue({
      nextCitations: [
        {
          id: 'verify-item',
          type: 'article-journal',
          title: 'Local title',
          DOI: '10.1234/example'
        }
      ],
      remainingMismatches: [
        {
          id: 'mismatch-1',
          citationId: 'verify-item',
          field: 'title',
          userValue: 'Local title',
          canonicalValue: 'Canonical title',
          source: 'crossref' as const
        }
      ],
      layersByCitationId: {
        'verify-item': {
          l1: { status: 'pass' as const },
          l2: { status: 'fail' as const, reasons: ['Title mismatch against registry record'] },
          source: 'crossref' as const,
          updatedAt: Date.now()
        }
      }
    })

    let engine: ReturnType<typeof useCitationEngine> | null = null
    render(<EngineHarness onReady={(value) => { engine = value }} />)

    await waitFor(() => {
      expect(engine).not.toBeNull()
    })

    act(() => {
      engine?.ingestItems([
        {
          id: 'verify-item',
          type: 'article-journal',
          title: 'Local title',
          DOI: '10.1234/example'
        }
      ])
    })

    await waitFor(() => {
      expect(useCitationStore.getState().verificationMismatches).toHaveLength(1)
    })
    expect(verifyUnifiedRegistryWithPatchesMock).toHaveBeenCalled()
  })
})
