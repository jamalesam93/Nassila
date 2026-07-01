import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuditReport } from '../../engine/manuscript/types'
import { notifyLongTaskComplete, pushToast } from '../lib/notify'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'

function countFindingStatuses(report: AuditReport): { pass: number; warn: number; fail: number } {
  let pass = 0
  let warn = 0
  let fail = 0

  for (const finding of report.findings) {
    const status =
      finding.layers.passage?.status ??
      finding.layers.metadata?.status ??
      finding.layers.registry?.status ??
      'warn'

    if (status === 'pass') pass += 1
    else if (status === 'fail' || status === 'insufficient_evidence') fail += 1
    else warn += 1
  }

  return { pass, warn, fail }
}

export function useTaskNotifier(): void {
  const { t } = useTranslation()
  const prevStepRef = useRef(useManuscriptAuditStore.getState().step)

  useEffect(() => {
    return useManuscriptAuditStore.subscribe((state) => {
      const prevStep = prevStepRef.current
      if (state.step === prevStep) return
      prevStepRef.current = state.step

      if (state.step === 'done' && state.report) {
        const { pass, warn, fail } = countFindingStatuses(state.report)
        const findings = state.report.findings.length
        const toastMessage = t('notifications.auditCompleteToast', { findings, pass, warn, fail })
        const title = t('notifications.auditCompleteTitle')
        const body = t('notifications.auditCompleteBody', { findings, pass, warn, fail })
        notifyLongTaskComplete({ title, body, toastMessage, kind: 'success' })
        return
      }

      if (state.step === 'error' && state.error) {
        pushToast('warn', state.error)
      }
    })
  }, [t])
}
