import { useTranslation } from 'react-i18next'
import type { CitationFinding, CiteGroundingSite, L3Coverage } from '../../../engine/manuscript/types'
import VerdictChip from '../workers/VerdictChip'
import { claimVerdictI18nKey } from '../../utils/sanad-grounding'

function coverageLabelKey(coverage: L3Coverage): string {
  switch (coverage) {
    case 'full_text_oa_europe_pmc':
      return 'loop.coverage.fullTextEpmc'
    case 'full_text_oa_unpaywall':
      return 'loop.coverage.fullTextOa'
    case 'abstract_only_closed':
      return 'loop.coverage.abstractOnly'
    default:
      return 'loop.coverage.unavailable'
  }
}

function SiteBlock({ site, index }: { site: CiteGroundingSite; index: number }) {
  const { t } = useTranslation()
  return (
    <div className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium text-muted-foreground">
        {t('loop.siteLabel', { index: index + 1 })} — &ldquo;{site.inTextSpan.raw}&rdquo;
      </p>
      <div className="mt-2">
        <VerdictChip verdict={site.passageVerdict} />
      </div>
      {site.claimGrounding?.length ? (
        <ul className="mt-3 space-y-2">
          {site.claimGrounding.map((claim, ci) => (
            <li key={ci} className="rounded-md border border-border/80 bg-muted/20 p-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium">{claim.claim}</span>
                <span className="text-xs text-muted-foreground">
                  {t(claimVerdictI18nKey(claim.verdict))}
                </span>
              </div>
              {claim.rationale?.length ? (
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {claim.rationale.map((line, ri) => (
                    <li key={ri}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {site.llmParseWarning ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{site.llmParseWarning}</p>
      ) : null}
    </div>
  )
}

interface LoopAuditDetailProps {
  finding: CitationFinding | null
  attachedPdfPath?: string
  onAttachPdf: () => void
  onClearAttachedPdf: () => void
}

export default function LoopAuditDetail({
  finding,
  attachedPdfPath,
  onAttachPdf,
  onClearAttachedPdf
}: LoopAuditDetailProps) {
  const { t } = useTranslation()

  if (!finding) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {t('loop.selectSource')}
      </div>
    )
  }

  const title =
    finding.resolvedItem?.title?.trim() ||
    finding.evidence[0]?.text?.slice(0, 120) ||
    finding.bibKey

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <h3 className="text-base font-semibold leading-snug">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{finding.bibKey}</p>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">{t('loop.verdictSection')}</p>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {t('loop.layers.registry')}
          </p>
          <div className="mt-1">
            <VerdictChip verdict={finding.layers.registry} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {t('loop.layers.metadata')}
          </p>
          <div className="mt-1">
            <VerdictChip verdict={finding.layers.metadata} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {t('loop.layers.passage')}
          </p>
          <div className="mt-1">
            <VerdictChip verdict={finding.layers.passage} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t('loop.sourceCoverage')}: {t(coverageLabelKey(finding.l3Coverage))}
      </p>

      <div className="mt-4 rounded-md border border-dashed border-border bg-muted/20 p-3">
        <p className="text-xs font-medium">{t('loop.attachPdfTitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('loop.attachPdfNote')}</p>
        {attachedPdfPath ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="max-w-full truncate text-xs font-mono">{attachedPdfPath}</span>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={onClearAttachedPdf}
            >
              {t('loop.attachPdfClear')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-primary hover:underline"
            onClick={onAttachPdf}
          >
            {t('loop.attachPdfAction')}
          </button>
        )}
      </div>

      {finding.citeSites?.length ? (
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-semibold">{t('loop.groundingSites')}</h4>
          {finding.citeSites.map((site, i) => (
            <SiteBlock key={i} site={site} index={i} />
          ))}
        </div>
      ) : null}
    </div>
  )
}