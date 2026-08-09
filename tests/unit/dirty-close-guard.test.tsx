// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useDirtyCloseGuard } from '../../src/renderer/hooks/use-dirty-close-guard'
import { useManuscriptAuditStore } from '../../src/renderer/stores/manuscript-audit-store'
import { useCitationStore } from '../../src/renderer/stores/citation-store'
import { useConfirmStore } from '../../src/renderer/stores/confirm-store'
import { useOuroborosLoopStore } from '../../src/renderer/stores/ouroboros-loop-store'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string) => key })
}))

function cleanSession() {
  useManuscriptAuditStore.setState({
    rawManuscriptText: '',
    report: null,
    manuscriptSourceFormat: null
  })
  useCitationStore.setState({ citations: [] })
  useOuroborosLoopStore.setState({ sourceArtifactsByBibKey: {}, selectedBibKey: null })
  useConfirmStore.setState({ open: false, resolve: null })
}

function createApiMock() {
  return {
    onCloseRequested: vi.fn(),
    confirmClose: vi.fn().mockResolvedValue(true)
  }
}

describe('useDirtyCloseGuard', () => {
  let onCloseRequestedCallback: (() => void) | undefined

  beforeEach(() => {
    cleanSession()
    const api = createApiMock()
    onCloseRequestedCallback = undefined
    api.onCloseRequested.mockImplementation((cb: () => void) => {
      onCloseRequestedCallback = cb
      return () => {}
    })
    window.api = api as unknown as typeof window.api
  })

  afterEach(() => {
    onCloseRequestedCallback = undefined
  })

  it('confirms close immediately when the session is clean', async () => {
    renderHook(() => useDirtyCloseGuard())

    onCloseRequestedCallback?.()
    await vi.waitFor(() => {
      expect(window.api.confirmClose).toHaveBeenCalled()
    })
  })

  it('shows the confirm dialog when the session has unsaved manuscript text', async () => {
    useManuscriptAuditStore.setState({ rawManuscriptText: 'Draft manuscript body' })
    renderHook(() => useDirtyCloseGuard())

    onCloseRequestedCallback?.()

    expect(useConfirmStore.getState().open).toBe(true)
    expect(window.api.confirmClose).not.toHaveBeenCalled()

    useConfirmStore.getState().cancel()
    expect(window.api.confirmClose).not.toHaveBeenCalled()
  })

  it('closes for real after the user confirms the dirty dialog', async () => {
    useCitationStore.setState({ citations: [{ id: 'c1', title: 'X' } as never] })
    renderHook(() => useDirtyCloseGuard())

    onCloseRequestedCallback?.()
    expect(useConfirmStore.getState().open).toBe(true)

    useConfirmStore.getState().confirm()
    await vi.waitFor(() => {
      expect(window.api.confirmClose).toHaveBeenCalled()
    })
  })

  it('does nothing when the bridge lacks the close-guard API', () => {
    delete (window.api as { confirmClose?: unknown }).confirmClose
    delete (window.api as { onCloseRequested?: unknown }).onCloseRequested
    renderHook(() => useDirtyCloseGuard())
    expect(useConfirmStore.getState().open).toBe(false)
  })
})
