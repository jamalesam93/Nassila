import { useTranslation } from 'react-i18next'
import type { WorkerId } from '../../workers/worker-registry'
import { getWorkerMeta } from '../../workers/worker-registry'

interface StubWorkerPanelProps {
  workerId: WorkerId
}

export default function StubWorkerPanel({ workerId }: StubWorkerPanelProps) {
  const { t } = useTranslation()
  const meta = getWorkerMeta(workerId)

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-8 text-center">
      <div className="max-w-lg space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          {t(`workers.availability.${meta.availability}`)}
        </p>
        <h2 className="text-2xl font-semibold text-foreground">{t(meta.nameKey)}</h2>
        <p className="text-sm text-muted-foreground">{t(meta.taglineKey)}</p>
        <p className="text-sm leading-relaxed text-foreground/80">{t(`workers.${workerId}.stubBody`)}</p>
        {meta.availability === 'stub' ? (
          <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            {t('workers.stubTier3Note')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
