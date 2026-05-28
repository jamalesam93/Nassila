import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import { useAppCommands } from '../hooks/use-app-commands'
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'
import WorkflowStrip from './WorkflowStrip'
import { MAX_VERIFICATION_ITEMS } from '../../shared/verification-limits'

export default function Toolbar() {
  const { t } = useTranslation()
  const [autocorrecting, setAutocorrecting] = useState(false)
  const [findingDois, setFindingDois] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const canUndo = useCitationStore((s) => s.canUndo)
  const canRedo = useCitationStore((s) => s.canRedo)
  const undo = useCitationStore((s) => s.undo)
  const redo = useCitationStore((s) => s.redo)
  const clearCitations = useCitationStore((s) => s.clearCitations)
  const citationCount = useCitationStore((s) => s.citations.length)
  const networkStatus = useCitationStore((s) => s.networkStatus)

  const {
    detectDuplicates,
    exportBibliography,
    findMissingDois,
    importReferences,
    runAutocorrect,
    verifyReferences
  } = useAppCommands()

  const handleAutocorrect = async () => {
    setAutocorrecting(true)
    try {
      await runAutocorrect(true)
    } finally {
      setAutocorrecting(false)
    }
  }

  const handleFindDois = async () => {
    setFindingDois(true)
    try {
      await findMissingDois()
    } finally {
      setFindingDois(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      await verifyReferences()
    } finally {
      setVerifying(false)
    }
  }

  const handleClearAll = () => {
    if (citationCount === 0) return
    const ok = typeof window !== 'undefined' ? window.confirm(t('toolbar.clearConfirm')) : false
    if (ok) clearCitations()
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 tracking-tight">
        <div className="min-w-0 shrink-0">
          <h1 className="text-lg font-bold leading-none text-primary">{t('app.productName')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('toolbar.brandSubtitle')}</p>
        </div>
        <div className="flex-1" />
      </div>

      <WorkflowStrip />

      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-4 py-2 rtl:flex-row-reverse">
        <Tooltip label={t('toolbar.importHint')} side="bottom">
          <Button onClick={() => void importReferences()} size="sm" variant="secondary">
            {t('toolbar.import')}
          </Button>
        </Tooltip>

        <Tooltip
          label={t('toolbar.verifyRegistryHint', { maxItems: MAX_VERIFICATION_ITEMS })}
          side="bottom"
        >
          <Button
            onClick={() => void handleVerify()}
            disabled={citationCount === 0 || verifying || networkStatus !== 'online'}
            size="sm"
          >
            {verifying ? t('toolbar.verifyingBusy') : t('toolbar.verifyRegistry')}
          </Button>
        </Tooltip>

        <Tooltip label={t('toolbar.exportHint')} side="bottom">
          <Button
            onClick={exportBibliography}
            size="sm"
            variant="secondary"
            disabled={citationCount === 0}
          >
            {t('toolbar.export')}
          </Button>
        </Tooltip>

        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
            {t('toolbar.more')}
          </summary>
          <div className="absolute start-0 top-full z-30 mt-1 min-w-[11rem] rounded-md border border-border bg-popover p-1 shadow-lg rtl:start-auto rtl:end-0">
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-start text-xs hover:bg-accent disabled:opacity-40"
              disabled={citationCount === 0 || autocorrecting}
              onClick={() => void handleAutocorrect()}
            >
              {autocorrecting ? t('toolbar.autocorrectBusy') : t('toolbar.autocorrect')}
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-start text-xs hover:bg-accent disabled:opacity-40"
              disabled={citationCount === 0 || findingDois || networkStatus !== 'online'}
              onClick={() => void handleFindDois()}
            >
              {findingDois ? t('toolbar.findingDoisBusy') : t('toolbar.findDois')}
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-start text-xs hover:bg-accent disabled:opacity-40"
              disabled={citationCount < 2}
              onClick={detectDuplicates}
            >
              {t('toolbar.duplicates')}
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-start text-xs hover:bg-accent disabled:opacity-40"
              disabled={!canUndo}
              onClick={undo}
            >
              {t('toolbar.undo')}
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-start text-xs hover:bg-accent disabled:opacity-40"
              disabled={!canRedo}
              onClick={redo}
            >
              {t('toolbar.redo')}
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-start text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
              disabled={citationCount === 0}
              onClick={handleClearAll}
            >
              {t('toolbar.clearAll')}
            </button>
          </div>
        </details>

        <div className="flex-1" />
      </div>
    </div>
  )
}
