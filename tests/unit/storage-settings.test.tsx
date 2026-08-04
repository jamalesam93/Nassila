// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import StorageSettings from '../../src/renderer/components/settings/StorageSettings'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'settings.storage.cacheCount') return `${opts?.count} file(s) · ${opts?.bytes}`
      return key
    }
  })
}))

describe('StorageSettings', () => {
  beforeEach(() => {
    window.api = {
      extractionCacheInfo: vi.fn().mockResolvedValue({ count: 2, bytes: 1536 }),
      clearExtractionCache: vi.fn().mockResolvedValue({ clearedCount: 2, freedBytes: 1536 })
    } as unknown as typeof window.api
  })

  it('shows cached entry count and size from the bridge', async () => {
    render(<StorageSettings />)
    expect(await screen.findByText('2 file(s) · 1.5 KB')).toBeTruthy()
  })

  it('clears the cache via the bridge and refreshes the summary', async () => {
    window.api.extractionCacheInfo = vi
      .fn()
      .mockResolvedValueOnce({ count: 2, bytes: 1536 })
      .mockResolvedValue({ count: 0, bytes: 0 })
    render(<StorageSettings />)
    const clearButton = await screen.findByRole('button', { name: 'settings.storage.clearCache' })
    fireEvent.click(clearButton)
    await waitFor(() => {
      expect(window.api.clearExtractionCache).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText('settings.storage.cacheEmpty')).toBeTruthy()
  })

  it('disables the clear button while nothing is cached', async () => {
    window.api.extractionCacheInfo = vi.fn().mockResolvedValue({ count: 0, bytes: 0 })
    render(<StorageSettings />)
    const clearButton = await screen.findByRole('button', { name: 'settings.storage.clearCache' })
    expect((clearButton as HTMLButtonElement).disabled).toBe(true)
  })
})
