import { useTranslation } from 'react-i18next'
import type { CitationFinding, CiteGroundingSite, EvidenceSource, L3Coverage, LayerVerdict } from '../../../engine/manuscript/types'
import { claimVerdictI18nKey, layerVerdictI18nKey, layerVerdictReasons } from '../../utils/sanad-grounding'

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

function sourceProviderKey(source: EvidenceSource | undefined): string {
  switch (source) {
    case 'europe_pmc':
      return 'loop.sourceProvider.europePmc'
    case 'unpaywall':
      return 'loop.sourceProvider.unpaywall'
    case 'abstract':
      return 'loop.sourceProvider.abstract'
    case 'crossref':
      return 'loop.sourceProvider.crossref'
    case 'pubmed':
      return 'loop.sourceProvider.pubmed'
    case 'openalex':
      return 'loop.sourceProvider.openalex'
    default:
      return 'loop.sourceProvider.unknown'
  }
}

const STATUS_PILL: Record<LayerVerdict['status'], string> = {
  pass: 'bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-100',
  fail: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
  insufficient_evidence: 'bg-slate-200 text-slate-800 dark:bg-slate-800/60 dark:text-slate-100',
  skipped: 'bg-muted text-muted-foreground'
}

function StatusPill({ verdict, compact }: { verdict: LayerVerdict; compact?: boolean }) {
  const { t } = useTranslation()
  const size = compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`inline-flex shrink-0 rounded font-medium ${size} ${STATUS_PILL[verdict.status]}`}>
      {t(layerVerdictI18nKey(verdict))}
    </span>
  )
}

function LayerRow({
  label,
  verdict,
  citeCount
}: {
  label: string
  verdict: LayerVerdict
  citeCount?: number
}) {
  const { t } = useTranslation()
  const reasons = layerVerdictReasons(verdict)

  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-3 gap-y-1 border-b border-border/80 py-2.5 last:border-b-0">
      <p className="text-xs font-medium leading-snug text-muted-foreground">{label}</p>
      <div className="min-w-0">
        <StatusPill verdict={verdict} />
        {reasons.length > 0 ? (
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-foreground">
            {reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        ) : null}
        {citeCount !== undefined && citeCount > 1 ? (
          <p className="mt-1 text-[10px] text-muted-foreground">{t('loop.citeSitesSummary', { count: citeCount })}</p>
        ) : null}
      </div>
    </div>
  )
}

function ExcerptBlock({ site }: { site: CiteGroundingSite }) {
  const { t } = useTranslation()
  if (!site.sourceExcerpt?.trim()) {
    return <p className="mt-2 text-xs text-muted-foreground">{t('loop.noSourceExcerpt')}</p>
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{t('loop.sourceExcerptHeading')}</p>
        <span className="text-[10px] text-muted-foreground">
          {t(sourceProviderKey(site.sourceExcerptSource))}
          {site.sourceExcerptLabel ? ` · ${site.sourceExcerptLabel}` : ''}
        </span>
      </div>
      {site.sourceExcerptUrl ? (
        <a
          href={site.sourceExcerptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-[11px] text-primary hover:underline"
        >
          {t('loop.sourceExcerptLink')}
        </a>
      ) : null}
      <p className="mt-1.5 whitespace-pre-wrap rounded border border-border/80 bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground">
        {site.sourceExcerpt}
      </p>
    </div>
  )
}

function SiteBlock({ site, index, defaultOpen }: { site: CiteGroundingSite; index: number; defaultOpen?: boolean }) {
  const { t } = useTranslation()
  const overlapPct = Math.round(site.deterministicScore * 100)

  return (
    <details
      className="border-b border-border/80 last:border-b-0 open:bg-muted/10"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-1 py-2.5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-xs font-medium text-foreground">
            {t('loop.siteLabel', { index: index + 1 })} — &ldquo;{site.inTextSpan.raw}&rdquo;
          </span>
          <StatusPill verdict={site.passageVerdict} compact />
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {t('loop.overlapHint', { pct: overlapPct, bucket: site.deterministicBucket })}
        </p>
      </summary>

      <div className="space-y-1 border-t border-border/60 px-1 pb-3 pt-2">
        <div>
          <p className="text-xs font-medium text-foreground">{t('loop.passageHeading')}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{site.passageWindow}</p>
        </div>

        <ExcerptBlock site={site} />

        {site.claimGrounding?.length ? (
          <ul className="mt-3 space-y-2">
            {site.claimGrounding.map((claim, ci) => (
              <li key={ci} className="rounded border border-border/80 bg-background p-2.5 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-xs font-medium leading-snug">{claim.claim}</span>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {t(claimVerdictI18nKey(claim.verdict))}
                  </span>
                </div>
                {claim.sourceQuotes?.length ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-muted-foreground">{t('loop.claimQuotes')}</p>
                    <ul className="mt-1 space-y-1">
                      {claim.sourceQuotes.map((quote, qi) => (
                        <li
                          key={qi}
                          className="border-s-2 border-primary/40 ps-2 text-xs italic leading-relaxed text-foreground"
                        >
                          {quote}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {claim.rationale?.length ? (
                  <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                    {claim.rationale.map((line, ri) => (
                      <li key={ri}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">{t('loop.noClaims')}</p>
        )}

        {site.llmParseWarning ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{site.llmParseWarning}</p>
        ) : null}
      </div>
    </details>
  )
}

interface LoopAuditDetailProps {
  finding: CitationFinding | null
}

export default function LoopAuditDetail({ finding }: LoopAuditDetailProps) {
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

  const citeCount = finding.citeSites?.length ?? 0

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{finding.bibKey}</p>
      </header>

      <section className="border-b border-border px-4 py-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('loop.verdictSection')}</h4>
        <div className="mt-2">
          <LayerRow label={t('loop.layers.registry')} verdict={finding.layers.registry} />
          <LayerRow label={t('loop.layers.metadata')} verdict={finding.layers.metadata} />
          <LayerRow
            label={t('loop.layers.passage')}
            verdict={finding.layers.passage}
            citeCount={citeCount > 1 ? citeCount : undefined}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t('loop.sourceCoverage')}: {t(coverageLabelKey(finding.l3Coverage))}
        </p>
      </section>

      {citeCount > 0 ? (
        <section className="min-h-0 flex-1 px-4 py-3">
          <h4 className="text-xs font-semibold text-foreground">
            {t('loop.groundingSites')}
            <span className="ms-1.5 font-normal text-muted-foreground">({citeCount})</span>
          </h4>
          <div className="mt-2">
            {finding.citeSites!.map((site, i) => (
              <SiteBlock key={i} site={site} index={i} defaultOpen={citeCount === 1} />
            ))}
          </div>
        </section>
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground">{t('loop.noCiteSites')}</p>
      )}
    </div>
  )
}
