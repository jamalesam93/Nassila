import type { LayerVerdict } from '../../../engine/manuscript/types'
import { useTranslation } from 'react-i18next'
import { layerVerdictI18nKey } from '../../utils/sanad-grounding'

const VERDICT_STYLES: Record<LayerVerdict['status'], string> = {
  pass: 'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100',
  fail: 'border-red-500/50 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100',
  warn: 'border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  insufficient_evidence:
    'border-slate-400/50 bg-slate-50 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200',
  skipped: 'border-border bg-muted text-muted-foreground'
}

interface VerdictChipProps {
  verdict: LayerVerdict
}

export default function VerdictChip({ verdict }: VerdictChipProps) {
  const { t } = useTranslation()
  const style = VERDICT_STYLES[verdict.status]

  const reasons =
    verdict.status === 'fail' || verdict.status === 'warn'
      ? verdict.reasons
      : verdict.status === 'insufficient_evidence'
        ? [verdict.reason]
        : []

  return (
    <div className={`rounded-md border px-3 py-2 ${style}`}>
      <span className="text-sm font-semibold">{t(layerVerdictI18nKey(verdict))}</span>
      {reasons.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs opacity-90">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
