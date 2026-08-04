import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildQualityLedgerEntry,
  buildSharhLiteSummary,
  buildSubmissionIntegrityBundle,
  evaluateSubmissionPreflight
} from '../../../engine/manuscript/sharh-lite'
import type { AuditReport } from '../../../engine/manuscript/types'
import { buildFindingExplanation, buildSharhHeadline } from '../../utils/sharh-copy'
import { pushToast } from '../../lib/notify'

type Props = {
  report: AuditReport | null
}

export default function SharhLitePanel({ report }: Props) {
  const { t } = useTranslation()
  const summary = useMemo(() => (report ? buildSharhLiteSummary(report) : null), [report])
  const preflight = useMemo(() => evaluateSubmissionPreflight(report), [report])
  const headline = useMemo(
    () => (summary ? buildSharhHeadline(t, summary) : null),
    [summary, t]
  )

  if (!report || !summary) {
    return (
      <p className="px-4 py-2 text-xs text-muted-foreground">{t('sharhLite.empty')}</p>
    )
  }

  const exportDiagnostic = async () => {
    if (!window.api) return
    const about = await window.api.getAppAbout().catch(() => ({ version: report.appVersion }))
    const entry = buildQualityLedgerEntry(report, about.version || report.appVersion)
    const path = await window.api.saveFileDialog({
      defaultPath: 'nassila-diagnostic.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (!path) return
    await window.api.writeFile(path, `${JSON.stringify(entry, null, 2)}\n`)
    pushToast('success', t('sharhLite.diagnosticExported'))
  }

  const exportSubmissionBundle = async () => {
    if (!window.api) return
    const about = await window.api.getAppAbout().catch(() => ({ version: report.appVersion }))
    const bundle = buildSubmissionIntegrityBundle(report, about.version || report.appVersion)
    const path = await window.api.saveFileDialog({
      defaultPath: 'nassila-submission-integrity.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (!path) return
    await window.api.writeFile(path, `${JSON.stringify(bundle, null, 2)}\n`)
    pushToast('success', t('sharhLite.submissionBundleExported'))
  }

  return (
    <section className="border-t border-border px-4 py-3 text-sm" aria-label={t('sharhLite.title')}>
      <h3 className="text-sm font-semibold">{t('sharhLite.title')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('sharhLite.subtitle')}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{t('sharhLite.supported')}</dt>
          <dd className="font-medium">{summary.supported}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('sharhLite.weak')}</dt>
          <dd className="font-medium">{summary.weak}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('sharhLite.contradicted')}</dt>
          <dd className="font-medium">{summary.contradicted}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('sharhLite.notInSource')}</dt>
          <dd className="font-medium">{summary.notInSource}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('sharhLite.unmapped')}</dt>
          <dd className="font-medium">{summary.unmappedCitations}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('sharhLite.invalidQuotes')}</dt>
          <dd className="font-medium">{summary.invalidQuotes}</dd>
        </div>
      </dl>

      {headline ? (
        <p className="mt-3 text-xs leading-relaxed text-foreground">{headline}</p>
      ) : null}

      <div className="mt-3 space-y-1">
        <h4 className="text-xs font-semibold">{t('sharhLite.preflight')}</h4>
        {preflight.ok ? (
          <p className="text-xs text-green-700 dark:text-green-400">{t('sharhLite.preflightOk')}</p>
        ) : (
          <ul className="list-inside list-disc text-xs text-red-700 dark:text-red-400">
            {preflight.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
        {preflight.warnings.length > 0 ? (
          <ul className="list-inside list-disc text-xs text-amber-700 dark:text-amber-400">
            {preflight.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {preflight.mappingCoverage !== undefined ? (
          <p className="text-xs text-muted-foreground">
            {t('sharhLite.mappingCoverage', {
              percent: Math.round(preflight.mappingCoverage * 100)
            })}
          </p>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        <h4 className="text-xs font-semibold">{t('sharhLite.nextActions')}</h4>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          {summary.nextActions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      {summary.claimBreakdownByFinding.length > 0 ? (
        <div className="mt-3 space-y-1">
          <h4 className="text-xs font-semibold">{t('sharhLite.perFinding')}</h4>
          <p className="text-[11px] text-muted-foreground">{t('sharhLite.perFindingHint')}</p>
          <ul className="space-y-1.5">
            {summary.claimBreakdownByFinding.map((row) => (
              <li key={row.bibKey} className="rounded border border-border/80 px-2.5 py-2">
                <span className="text-[11px] font-semibold text-foreground">{row.bibKey}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {buildFindingExplanation(t, row)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
          onClick={() => void exportSubmissionBundle()}
        >
          {t('sharhLite.exportSubmissionBundle')}
        </button>
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
          onClick={() => void exportDiagnostic()}
        >
          {t('sharhLite.exportDiagnostic')}
        </button>
      </div>
    </section>
  )
}
