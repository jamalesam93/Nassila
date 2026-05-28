import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'

type StepId = 'import' | 'parse' | 'verify' | 'export'

function stepState(
  id: StepId,
  citationCount: number,
  issueCount: number,
  verifiedCount: number,
  online: boolean
): 'idle' | 'active' | 'done' {
  switch (id) {
    case 'import':
      return citationCount > 0 ? 'done' : 'active'
    case 'parse':
      if (citationCount === 0) return 'idle'
      return issueCount > 0 ? 'active' : 'done'
    case 'verify':
      if (citationCount === 0) return 'idle'
      if (verifiedCount > 0) return 'done'
      return online ? 'active' : 'idle'
    case 'export':
      if (citationCount === 0) return 'idle'
      return verifiedCount > 0 || issueCount === 0 ? 'active' : 'idle'
    default:
      return 'idle'
  }
}

export default function WorkflowStrip() {
  const { t } = useTranslation()
  const citationCount = useCitationStore((s) => s.citations.length)
  const issueCount = useCitationStore((s) => s.issues.length)
  const registryLayerByCitationId = useCitationStore((s) => s.registryLayerByCitationId)
  const networkStatus = useCitationStore((s) => s.networkStatus)
  const verifiedCount = Object.keys(registryLayerByCitationId).length
  const online = networkStatus === 'online'

  const steps: { id: StepId; label: string; emphasize?: boolean }[] = [
    { id: 'import', label: t('workflow.import') },
    { id: 'parse', label: t('workflow.parse') },
    { id: 'verify', label: t('workflow.verify'), emphasize: true },
    { id: 'export', label: t('workflow.export') }
  ]

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-t border-border/70 px-4 py-1.5 text-xs rtl:flex-row-reverse"
      aria-label={t('workflow.aria')}
    >
      {steps.map((step, i) => {
        const state = stepState(step.id, citationCount, issueCount, verifiedCount, online)
        const isVerify = step.id === 'verify'
        return (
          <span key={step.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/50">→</span>}
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                state === 'done'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                  : state === 'active'
                    ? isVerify && step.emphasize
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                      : 'bg-muted text-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </span>
        )
      })}
    </div>
  )
}
