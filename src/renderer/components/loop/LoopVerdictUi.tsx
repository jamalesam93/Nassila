import { useTranslation } from 'react-i18next'
import { LuExternalLink } from 'react-icons/lu'
import type {
  CiteGroundingSite,
  EvidenceSource,
  LayerVerdict
} from '../../../engine/manuscript/types'
import { claimVerdictI18nKey, layerVerdictI18nKey, layerVerdictReasons } from '../../utils/sanad-grounding'
import { Icon } from '../ui/icon'

export function sourceProviderKey(source: EvidenceSource | undefined): string {
  switch (source) {
    case 'europe_pmc':
      return 'loop.sourceProvider.europePmc'
    case 'unpaywall':
      return 'loop.sourceProvider.unpaywall'
    case 'local_pdf':
      return 'loop.attachPdfTitle'
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

export function StatusPill({ verdict, compact }: { verdict: LayerVerdict; compact?: boolean }) {
  const { t } = useTranslation()
  const size = compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`inline-flex shrink-0 rounded font-medium ${size} ${STATUS_PILL[verdict.status]}`}>
      {t(layerVerdictI18nKey(verdict))}
    </span>
  )
}

export function QuoteValidationChip({ status }: { status: 'found' | 'not_found' }) {
  const { t } = useTranslation()
  const tone =
    status === 'found'
      ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100'
      : 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100'
  return (
    <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {t(status === 'found' ? 'loop.quoteFound' : 'loop.quoteNotFound')}
    </span>
  )
}

export function LayerRow({
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

export function ExcerptBlock({ site }: { site: CiteGroundingSite }) {
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
          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-primary hover:underline"
        >
          <Icon icon={LuExternalLink} size={12} />
          <span className="truncate">{t('loop.sourceExcerptLink')}</span>
        </a>
      ) : null}
      <p className="mt-1.5 whitespace-pre-wrap rounded border border-border/80 bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground">
        {site.sourceExcerpt}
      </p>
    </div>
  )
}

export function SiteBlock({ site, index, defaultOpen }: { site: CiteGroundingSite; index: number; defaultOpen?: boolean }) {
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
        {site.inTextSpan.locator ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {t('loop.locator')}: {site.inTextSpan.locator}
          </p>
        ) : null}
      </summary>

      <div className="space-y-1 border-t border-border/60 px-1 pb-3 pt-2">
        <div>
          <p className="text-xs font-medium text-foreground">{t('loop.passageHeading')}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{site.passageWindow}</p>
        </div>

        <ExcerptBlock site={site} />

        {site.claimGrounding?.length ? (
          <>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{t('loop.quoteMatchCaveat')}</p>
            <ul className="mt-2 space-y-2">
              {site.claimGrounding.map((claim, ci) => (
                <li key={ci} className="rounded border border-border/80 bg-background p-2.5 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-xs font-medium leading-snug">{claim.claim}</span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {t('loop.sanadVerdictLabel')}: {t(claimVerdictI18nKey(claim.verdict))}
                      </span>
                      {claim.quoteValidation?.status === 'found' || claim.quoteValidation?.status === 'not_found' ? (
                        <QuoteValidationChip status={claim.quoteValidation.status} />
                      ) : null}
                    </div>
                  </div>
                  {claim.sourceQuotes?.length ? (
                    <div className="mt-2">
                      <p className="text-[10px] font-medium text-muted-foreground">{t('loop.claimQuotes')}</p>
                      <ul className="mt-1 space-y-1">
                        {claim.sourceQuotes.map((quote, qi) => (
                          <li
                            key={qi}
                            className="border-s-2 border-primary/40 ps-2 text-xs italic leading-relaxed text-foreground rtl:border-s-0 rtl:border-e-2 rtl:ps-0 rtl:pe-2"
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
          </>
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