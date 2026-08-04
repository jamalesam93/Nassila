// @vitest-environment jsdom

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import LoopEditorPane from '../../src/renderer/components/loop/LoopEditorPane'
import { useManuscriptAuditStore } from '../../src/renderer/stores/manuscript-audit-store'
import { useCitationStore } from '../../src/renderer/stores/citation-store'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

function createApiMock() {
  return {
    loadManuscriptAuditPrefs: vi.fn().mockResolvedValue({ version: 1 }),
    saveManuscriptAuditPrefs: vi.fn().mockResolvedValue(undefined)
  }
}

function resetStores() {
  useManuscriptAuditStore.setState({
    rawManuscriptText: '',
    report: null,
    step: 'idle',
    error: null,
    reviewNotice: null,
    auditProgress: null,
    importProgress: null,
    auditReferenceSource: 'manuscript',
    manuscriptSourceFormat: null,
    selectedTemplateId: 'imrad',
    templateStrict: false,
    templates: []
  })
  useCitationStore.setState({ citations: [], networkStatus: 'online' })
}

describe('review notice banner', () => {
  beforeEach(() => {
    window.api = createApiMock() as unknown as typeof window.api
    resetStores()
  })

  it('renders the review notice when set and dismisses it on click', async () => {
    useManuscriptAuditStore.setState({ reviewNotice: 'Extracted text needs review' })
    await act(async () => {
      render(<LoopEditorPane running={false} onRun={() => {}} onCancel={() => {}} />)
    })

    expect(screen.getByText('Extracted text needs review')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'manuscriptAudit.dismissReview' }))
    expect(useManuscriptAuditStore.getState().reviewNotice).toBeNull()
    expect(screen.queryByText('Extracted text needs review')).toBeNull()
  })

  it('does not render the banner when reviewNotice is null', async () => {
    await act(async () => {
      render(<LoopEditorPane running={false} onRun={() => {}} onCancel={() => {}} />)
    })
    expect(screen.queryByRole('button', { name: 'manuscriptAudit.dismissReview' })).toBeNull()
  })
})
