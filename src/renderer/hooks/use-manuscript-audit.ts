import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ManuscriptAuditProgressEvent,
  ManuscriptAuditStartRequest
} from '../../shared/manuscript-audit-contract'
import { useCitationStore } from '../stores/citation-store'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useOuroborosLoopStore } from '../stores/ouroboros-loop-store'

export function useManuscriptAudit() {
  const { t } = useTranslation()
  const runIdRef = useRef<string | null>(null)
  const consumeAuditProgress = useManuscriptAuditStore((state) => state.consumeAuditProgress)
  const clearAuditProgress = useManuscriptAuditStore((state) => state.clearAuditProgress)
  const setError = useManuscriptAuditStore((state) => state.setError)
  const setReport = useManuscriptAuditStore((state) => state.setReport)
  const setStep = useManuscriptAuditStore((state) => state.setStep)

  useEffect(() => {
    if (typeof window.api?.onManuscriptAuditProgress !== 'function') return
    return window.api.onManuscriptAuditProgress((progress) => {
      if (progress.runId !== runIdRef.current) return
      consumeAuditProgress(localizeFailure(progress, t))
    })
  }, [consumeAuditProgress, t])

  const cancel = useCallback(() => {
    const runId = runIdRef.current
    runIdRef.current = null
    if (runId) {
      consumeAuditProgress({ runId, kind: 'cancelled' })
      void window.api.cancelManuscriptAudit(runId)
    }
    clearAuditProgress()
    setStep('idle')
  }, [clearAuditProgress, consumeAuditProgress, setStep])

  const runAudit = useCallback(
    async (rawText: string, options: { bibKeyFilter?: string } = {}) => {
      const previousRunId = runIdRef.current
      if (previousRunId) {
        runIdRef.current = null
        consumeAuditProgress({ runId: previousRunId, kind: 'cancelled' })
        await window.api.cancelManuscriptAudit(previousRunId).catch(() => false)
      }

      const runId = crypto.randomUUID()
      runIdRef.current = runId
      setError(null)
      if (!options.bibKeyFilter) setReport(null)
      clearAuditProgress()
      setStep('parsing')

      const auditState = useManuscriptAuditStore.getState()
      const previousReport = auditState.report
      const request: ManuscriptAuditStartRequest = {
        runId,
        rawText,
        manuscriptSourceFormat:
          auditState.manuscriptSourceFormat === 'docx' || auditState.manuscriptSourceFormat === 'pdf'
            ? auditState.manuscriptSourceFormat
            : 'paste',
        referenceSource: auditState.auditReferenceSource,
        libraryCitations: useCitationStore.getState().citations,
        userActionsByBibKey: auditState.userActionsByBibKey,
        networkStatus: useCitationStore.getState().networkStatus,
        template: {
          selectedId: auditState.selectedTemplateId,
          strict: auditState.templateStrict,
          templates: auditState.templates
        },
        llm: {
          enabled: auditState.llmEnabled,
          presetId: auditState.llmPresetId,
          baseUrl: auditState.llmBaseUrl,
          model: auditState.llmModel
        },
        unpaywallEmail: auditState.unpaywallEmail,
        sourceArtifactsByBibKey: useOuroborosLoopStore.getState().sourceArtifactsByBibKey,
        bibKeyFilter: options.bibKeyFilter,
        priorRuns: previousReport
          ? [
              ...(previousReport.priorRuns ?? []),
              {
                generatedAt: previousReport.generatedAt,
                appVersion: previousReport.appVersion,
                promptContractVersion: previousReport.promptContractVersion,
                bibKeyFilter: options.bibKeyFilter
              }
            ].slice(-100)
          : undefined
      }

      try {
        const report = await window.api.startManuscriptAudit(request)
        // Apply completion from invoke result: progress `completed` can arrive after
        // finally clears runIdRef and get dropped, leaving the UI stuck on Auditing.
        if (runIdRef.current === runId && report) {
          consumeAuditProgress({
            runId,
            kind: 'completed',
            report,
            bibKeyFilter: options.bibKeyFilter
          })
        }
      } catch (error) {
        if (runIdRef.current !== runId) return
        const message = error instanceof Error ? error.message : String(error)
        setError(translateAuditError(message, t))
        setStep('error')
      } finally {
        if (runIdRef.current === runId) runIdRef.current = null
      }
    },
    [clearAuditProgress, consumeAuditProgress, setError, setReport, setStep, t]
  )

  return { runAudit, cancel }
}

function localizeFailure(
  progress: ManuscriptAuditProgressEvent,
  t: (key: string) => string
): ManuscriptAuditProgressEvent {
  if (progress.kind !== 'failed') return progress
  return { ...progress, message: translateAuditError(progress.message, t) }
}

function translateAuditError(message: string, t: (key: string) => string): string {
  if (message.includes('no_references')) return t('loop.error.noReferencesSection')
  if (message.includes('bibliography_empty')) return t('loop.error.bibliographyEmpty')
  if (message.includes('no_in_text_cites')) return t('loop.error.noInTextCites')
  return message
}
