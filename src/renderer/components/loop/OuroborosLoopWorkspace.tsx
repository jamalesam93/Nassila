import { useCallback, useEffect, useMemo } from 'react'
import { useManuscriptAudit } from '../../hooks/use-manuscript-audit'
import { useOuroborosLoopBootstrap } from '../../hooks/use-ouroboros-loop-bootstrap'
import { useManuscriptAuditStore, type AuditStep } from '../../stores/manuscript-audit-store'
import { useOuroborosLoopStore } from '../../stores/ouroboros-loop-store'
import LoopEditorPane from './LoopEditorPane'
import LoopSourcesPanel from './LoopSourcesPanel'

const RUNNING_STEPS: AuditStep[] = ['parsing', 'l1', 'l2', 'oa_fetch', 'l3', 'llm']

export default function OuroborosLoopWorkspace() {
  useOuroborosLoopBootstrap()

  const raw = useManuscriptAuditStore((s) => s.rawManuscriptText)
  const report = useManuscriptAuditStore((s) => s.report)
  const step = useManuscriptAuditStore((s) => s.step)
  const auditProgress = useManuscriptAuditStore((s) => s.auditProgress)
  const selectedBibKey = useOuroborosLoopStore((s) => s.selectedBibKey)
  const setSelectedBibKey = useOuroborosLoopStore((s) => s.setSelectedBibKey)

  const { runAudit, cancel } = useManuscriptAudit()

  const running = RUNNING_STEPS.includes(step)

  const findings = useMemo(() => report?.findings ?? [], [report?.findings])

  useEffect(() => {
    if (findings.length === 0) {
      setSelectedBibKey(null)
      return
    }
    // Only auto-select after a completed audit (#4b) — mid-run detail stays locked.
    if (step !== 'done') return
    if (!selectedBibKey || !findings.some((f) => f.bibKey === selectedBibKey)) {
      setSelectedBibKey(findings[0]!.bibKey)
    }
  }, [findings, selectedBibKey, setSelectedBibKey, step])

  useEffect(() => {
    if (step === 'idle' || step === 'error') {
      setSelectedBibKey(null)
    }
  }, [step, setSelectedBibKey])

  const handleRun = useCallback(() => {
    if (!raw.trim() || running) return
    void runAudit(raw)
  }, [raw, runAudit, running])

  const handleReaudit = useCallback((bibKey: string) => {
    if (!raw.trim() || running) return
    void runAudit(raw, { bibKeyFilter: bibKey })
  }, [raw, runAudit, running])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <LoopEditorPane running={running} onRun={handleRun} onCancel={cancel} />
      <LoopSourcesPanel
        report={report}
        running={running}
        step={step}
        auditProgress={auditProgress}
        onReaudit={handleReaudit}
      />
    </div>
  )
}