// @vitest-environment jsdom

import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import IndraRuntimeSettings from '../../src/renderer/components/settings/IndraRuntimeSettings'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'settings.indra.statusReady') return `ready ${options?.version} ${options?.size}`
      if (key === 'settings.indra.progress') return `${options?.completed}/${options?.total}`
      if (key === 'settings.indra.failed') return `failed ${options?.message}`
      if (key.startsWith('settings.indra.phase.')) return key.split('.').pop()
      return key
    }
  })
}))

const missing = {
  ready: false,
  directory: 'C:\\data\\indra-ocr',
  modelBytes: 0,
  packageVersion: null,
  license: 'modified OpenRAIL-M'
}

describe('IndraRuntimeSettings', () => {
  beforeEach(() => {
    window.api = {
      indraRuntimeStatus: vi.fn().mockResolvedValue(missing),
      fetchIndraRuntime: vi.fn().mockResolvedValue({
        ready: true,
        directory: 'C:\\data\\indra-ocr',
        modelBytes: 96_000_000,
        packageVersion: '1.1.2',
        license: 'modified OpenRAIL-M'
      }),
      onIndraFetchProgress: vi.fn(() => () => {})
    } as unknown as typeof window.api
  })

  it('shows the missing state and fetches on demand', async () => {
    render(<IndraRuntimeSettings />)
    expect(await screen.findByText('settings.indra.statusMissing')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'settings.indra.fetch' }))

    await waitFor(() => expect(window.api.fetchIndraRuntime).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('ready 1.1.2 91.6 MB')).toBeTruthy()
  })

  it('renders fetch progress from the main-process push', async () => {
    let emit: ((progress: { phase: string; completed: number; total: number }) => void) | null = null
    window.api.onIndraFetchProgress = vi.fn((callback) => {
      emit = callback as typeof emit
      return () => {}
    }) as unknown as typeof window.api.onIndraFetchProgress

    render(<IndraRuntimeSettings />)
    await screen.findByText('settings.indra.statusMissing')

    act(() => {
      emit?.({ phase: 'models', completed: 3, total: 17 })
    })

    expect(await screen.findByText(/models · 3\/17/)).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('18')
  })

  it('reports a failed fetch without claiming success', async () => {
    window.api.fetchIndraRuntime = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof window.api.fetchIndraRuntime

    render(<IndraRuntimeSettings />)
    await screen.findByText('settings.indra.statusMissing')
    fireEvent.click(screen.getByRole('button', { name: 'settings.indra.fetch' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('failed network down')
  })
})
