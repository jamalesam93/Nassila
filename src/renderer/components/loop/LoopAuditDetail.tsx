import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CitationFinding, L3Coverage } from '../../../engine/manuscript/types'
import type { ShahidEvidence } from '../../../engine/shahid/types'
import { formatFindingEvidenceMarkdown } from '../../../engine/audit/report'
import { manuscriptRefCitationId } from '../../../engine/manuscript/bibliography-bridge'
import {
  getOuroborosStage,
  OUROBOROS_LOOP_STAGE_IDS
} from '../../../shared/ouroboros-loop-stages'
import { copyToClipboard } from '../../utils/copy-to-clipboard'
import { scrollToCitationRow } from '../../utils/citation-row-dom'
import { notifyCopied, pushToast } from '../../lib/notify'
import { useShellStore } from '../../stores/shell-store'
import { useCitationStore } from '../../stores/citation-store'
import { useOuroborosLoopStore } from '../../stores/ouroboros-loop-store'
import { useManuscriptAuditStore } from '../../stores/manuscript-audit-store'
import { Button } from '../ui/button'
import { LayerRow, SiteBlock } from './LoopVerdictUi'

function coverageLabelKey(coverage: L3Coverage): string {
  switch (coverage) {
    case 'full_text_oa_europe_pmc':
      return 'loop.coverage.fullTextEpmc'
    case 'full_text_oa_unpaywall':
      return 'loop.coverage.fullTextOa'
    case 'full_text_attached_pdf':
      return 'loop.pdfAttached'
    case 'abstract_only_closed':
      return 'loop.coverage.abstractOnly'
    default:
      return 'loop.coverage.unavailable'
  }
}

interface LoopAuditDetailProps {
  finding: CitationFinding | null
  onReaudit: (bibKeys: string[]) => void
}

export default function LoopAuditDetail({ finding, onReaudit }: LoopAuditDetailProps) {
  const { t } = useTranslation()
  const [attaching, setAttaching] = useState(false)
  const setAppSurface = useShellStore((s) => s.setAppSurface)
  const citations = useCitationStore((s) => s.citations)
  const auditInFlight = useManuscriptAuditStore((s) => s.activeRunId !== null)
  const artifact = useOuroborosLoopStore((s) =>
    finding ? s.sourceArtifactsByBibKey[finding.bibKey] : undefined
  )
  const attachSourcePdf = useOuroborosLoopStore((s) => s.attachSourcePdf)
  const clearAttachedSourcePdf = useOuroborosLoopStore((s) => s.clearAttachedSourcePdf)

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
  const claims = finding.citeSites?.flatMap((site) => site.claimGrounding ?? []) ?? []
  const contradictionCount = claims.filter((claim) => claim.verdict === 'contradicted').length
  const otherCautionCount = claims.filter(
    (claim) => claim.verdict !== 'supported' && claim.verdict !== 'contradicted'
  ).length
  const shahidStage = getOuroborosStage(OUROBOROS_LOOP_STAGE_IDS.shahidEvidence)
  const shahidEvidence = finding.shahidEvidence ?? []
  const showShahid =
    shahidEvidence.length > 0 || shahidStage?.status === 'partial' || shahidStage?.status === 'live'

  const handleCopyEvidence = async () => {
    const ok = await copyToClipboard(formatFindingEvidenceMarkdown(finding))
    if (ok) notifyCopied(t('notifications.copied'))
    else pushToast('error', t('loop.copyEvidenceFailed'))
  }

  const handleJumpToBibliography = () => {
    const citationId = manuscriptRefCitationId(finding.bibKey)
    const exists = citations.some((c) => c.id === citationId)
    setAppSurface('bibliography')
    window.setTimeout(() => {
      if (!exists || !scrollToCitationRow(citationId)) {
        pushToast('info', t('loop.jumpToBibliographyMissing'))
      }
    }, 80)
  }

  const handleAttachPdf = async () => {
    setAttaching(true)
    try {
      const paths = await window.api.openFileDialog({
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
      const path = paths?.[0]
      if (!path) return
      const attached = await window.api.attachSourcePdf(path)
      attachSourcePdf(finding.bibKey, attached)
      onReaudit([finding.bibKey])
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : String(error))
    } finally {
      setAttaching(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{finding.bibKey}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => void handleCopyEvidence()}>
            {t('loop.copyEvidence')}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleJumpToBibliography}>
            {t('loop.jumpToBibliography')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={attaching || auditInFlight}
            onClick={() => void handleAttachPdf()}
          >
            {t('loop.attachPdfAction')}
          </Button>
          {artifact ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={auditInFlight}
              onClick={() => clearAttachedSourcePdf(finding.bibKey)}
            >
              {t('loop.attachPdfClear')}
            </Button>
          ) : null}
        </div>
        {artifact ? (
          <p className="mt-2 truncate text-[11px] text-muted-foreground" title={artifact.path}>
            {t('loop.pdfAttached')} · {artifact.pageCount} · {artifact.tier} · {artifact.sha256.slice(0, 12)}
          </p>
        ) : null}
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
        {finding.l3Coverage === 'abstract_only_closed' ? (
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
            {t('loop.coverage.abstractOnlyCaution')}
          </p>
        ) : null}
        {claims.length > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('loop.claimSummaryDetail', {
              supported: claims.filter((c) => c.verdict === 'supported').length,
              total: claims.length
            })}
            {' · '}
            {t('loop.contradictedClaims')}: {contradictionCount} · {t('loop.otherCautions')}:{' '}
            {otherCautionCount}
          </p>
        ) : null}
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

      {showShahid ? (
        <section className="border-t border-border px-4 py-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('loop.shahid.title')}
          </h4>
          {shahidEvidence.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t('loop.shahid.empty')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {shahidEvidence.map((row) => (
                <ShahidEvidenceRow key={row.id} row={row} />
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">{t('loop.shahid.note')}</p>
        </section>
      ) : null}
    </div>
  )
}

function ShahidEvidenceRow({ row }: { row: ShahidEvidence }) {
  const { t } = useTranslation()
  const summary =
    row.caption?.trim() ||
    row.cellEvidence?.trim() ||
    row.text?.trim().slice(0, 160) ||
    row.id
  const pageLabel = row.page != null ? t('loop.shahid.page', { page: row.page }) : null
  const reviewKey = `loop.shahid.review.${row.reviewState}` as const

  return (
    <li className="border-b border-border/80 py-2 last:border-b-0">
      <p className="text-xs font-medium text-foreground">
        {t(`loop.shahid.region.${row.regionKind}`)}
        {pageLabel ? <span className="ms-1.5 font-normal text-muted-foreground">{pageLabel}</span> : null}
        <span className="ms-1.5 font-normal text-muted-foreground">{t(reviewKey)}</span>
      </p>
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{summary}</p>
      {row.citeSiteId ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t('loop.shahid.linkedCite', { id: row.citeSiteId })}
        </p>
      ) : null}
    </li>
  )
}