import { useTranslation } from 'react-i18next'
import type { CitationFinding, CiteGroundingSite, EvidenceSource, L3Coverage } from '../../../engine/manuscript/types'
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
      <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-border/80 bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground">
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
      className="rounded-md border border-border bg-muted/15 open:bg-muted/25"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">
            {t('loop.siteLabel', { index: index + 1 })} — &ldquo;{site.inTextSpan.raw}&rdquo;
          </span>
          <VerdictChip verdict={site.passageVerdict} />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t('loop.overlapHint', { pct: overlapPct, bucket: site.deterministicBucket })}
        </p>
      </summary>

      <div className="space-y-1 border-t border-border px-3 py-3">
        <div>
          <p className="text-xs font-medium text-foreground">{t('loop.passageHeading')}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{site.passageWindow}</p>
        </div>

        <ExcerptBlock site={site} />

        {site.claimGrounding?.length ? (
          <ul className="mt-3 space-y-2">
            {site.claimGrounding.map((claim, ci) => (
              <li key={ci} className="rounded-md border border-border/80 bg-background p-2.5 text-sm">
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

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <h3 className="text-base font-semibold leading-snug">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{finding.bibKey}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('loop.layers.registry')}</p>
          <div className="mt-1">
            <VerdictChip verdict={finding.layers.registry} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('loop.layers.metadata')}</p>
          <div className="mt-1">
            <VerdictChip verdict={finding.layers.metadata} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('loop.layers.passage')}</p>
          <div className="mt-1">
            <VerdictChip verdict={finding.layers.passage} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t('loop.sourceCoverage')}: {t(coverageLabelKey(finding.l3Coverage))}
      </p>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t('loop.masdarPlanned')}</p>

      {finding.citeSites?.length ? (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold">{t('loop.groundingSites')}</h4>
          {finding.citeSites.map((site, i) => (
            <SiteBlock key={i} site={site} index={i} defaultOpen={finding.citeSites!.length === 1} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{t('loop.noCiteSites')}</p>
      )}
    </div>
  )
}
