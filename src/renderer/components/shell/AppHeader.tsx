import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useCitationStore } from '../../stores/citation-store'

import { useManuscriptAuditStore } from '../../stores/manuscript-audit-store'

import { useShellStore, type AppSurface } from '../../stores/shell-store'

import { useAppCommands } from '../../hooks/use-app-commands'

import { requestConfirm } from '../../stores/confirm-store'

import { Button } from '../ui/button'

import { Tooltip } from '../ui/tooltip'

import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu'

import { NetworkStatusIndicator } from '../NetworkStatusIndicator'

import { Icon } from '../ui/icon'

import { LuDownload, LuFileText, LuShieldCheck, LuUpload } from 'react-icons/lu'

import { MAX_VERIFICATION_ITEMS } from '../../../shared/verification-limits'



const MODES: { id: AppSurface; labelKey: string }[] = [

  { id: 'loop', labelKey: 'shell.mode.manuscript' },

  { id: 'bibliography', labelKey: 'shell.mode.bibliography' }

]



export default function AppHeader() {

  const { t } = useTranslation()

  const appSurface = useShellStore((s) => s.appSurface)

  const setAppSurface = useShellStore((s) => s.setAppSurface)

  const toggleBibliographyDrawer = useShellStore((s) => s.toggleBibliographyDrawer)

  const setBibliographyTask = useShellStore((s) => s.setBibliographyTask)



  const canUndo = useCitationStore((s) => s.canUndo)

  const canRedo = useCitationStore((s) => s.canRedo)

  const undo = useCitationStore((s) => s.undo)

  const redo = useCitationStore((s) => s.redo)

  const clearCitations = useCitationStore((s) => s.clearCitations)

  const citationCount = useCitationStore((s) => s.citations.length)

  const networkStatus = useCitationStore((s) => s.networkStatus)

  const report = useManuscriptAuditStore((s) => s.report)



  const {

    detectDuplicates,

    exportBibliography,

    exportManuscriptAuditJson,

    exportManuscriptAuditMarkdown,

    findMissingDois,

    importManuscript,

    importReferences,

    runAutocorrect,

    verifyReferences

  } = useAppCommands()



  const [autocorrecting, setAutocorrecting] = useState(false)

  const [findingDois, setFindingDois] = useState(false)

  const [verifying, setVerifying] = useState(false)



  const showBibActions = appSurface === 'bibliography'

  const showManuscriptActions = appSurface === 'loop'

  const showDrawerToggle = appSurface === 'bibliography'



  const handleAutocorrect = async () => {

    setAutocorrecting(true)

    setBibliographyTask('autocorrect')

    try {

      await runAutocorrect(true)

    } finally {

      setAutocorrecting(false)

      setBibliographyTask('idle')

    }

  }



  const handleFindDois = async () => {

    setFindingDois(true)

    setBibliographyTask('doi')

    try {

      await findMissingDois()

    } finally {

      setFindingDois(false)

      setBibliographyTask('idle')

    }

  }



  const handleVerify = async () => {

    setVerifying(true)

    setBibliographyTask('verify')

    try {

      await verifyReferences()

    } finally {

      setVerifying(false)

      setBibliographyTask('idle')

    }

  }



  const handleClearAll = async () => {

    if (citationCount === 0) return

    const ok = await requestConfirm(t('toolbar.clearConfirm'))

    if (ok) clearCitations()

  }



  return (

    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 rtl:flex-row-reverse">

      <div className="min-w-0 shrink-0">

        <span className="text-base font-bold leading-none text-primary">{t('app.productName')}</span>

      </div>



      <nav

        className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5"

        aria-label={t('loop.surface.navAria')}

      >

        {MODES.map((mode) => {

          const isActive = appSurface === mode.id

          return (

            <button

              key={mode.id}

              type="button"

              aria-current={isActive ? 'page' : undefined}

              className={`rounded px-2.5 py-1 text-sm font-medium transition ${

                isActive

                  ? 'bg-background text-foreground shadow-sm'

                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'

              }`}

              onClick={() => setAppSurface(mode.id)}

            >

              {t(mode.labelKey)}

            </button>

          )

        })}

      </nav>



      <div className="flex flex-1 flex-wrap items-center justify-center gap-2 empty:hidden">

        {showBibActions ? (

          <>

            <Tooltip label={t('toolbar.importHint')} side="bottom">

              <Button

                onClick={() => void importReferences()}

                onMouseDown={(e) => e.preventDefault()}

                size="sm"

                variant="secondary"

              >

                <Icon icon={LuUpload} size={14} className="me-1.5" />

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

                <Icon icon={LuShieldCheck} size={14} className="me-1.5" />

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

                <Icon icon={LuDownload} size={14} className="me-1.5" />

                {t('toolbar.export')}

              </Button>

            </Tooltip>

          </>

        ) : null}



        {showManuscriptActions ? (

          <>

            <Tooltip label={t('loop.intro')} side="bottom">

              <Button

                onClick={() => void importManuscript()}

                onMouseDown={(e) => e.preventDefault()}

                size="sm"

                variant="secondary"

              >

                <Icon icon={LuFileText} size={14} className="me-1.5" />

                {t('loop.importManuscript')}

              </Button>

            </Tooltip>

            {report ? (

              <DropdownMenu label={t('shell.exportAudit')} align="center">

                <DropdownMenuItem onSelect={() => void exportManuscriptAuditJson()}>

                  {t('manuscriptAudit.exportJson')}

                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => void exportManuscriptAuditMarkdown()}>

                  {t('manuscriptAudit.exportMarkdown')}

                </DropdownMenuItem>

              </DropdownMenu>

            ) : null}

          </>

        ) : null}

      </div>



      <div className="flex shrink-0 flex-wrap items-center gap-2 rtl:flex-row-reverse">

        {showBibActions ? (

          <DropdownMenu label={t('toolbar.more')} align="end">

            <DropdownMenuItem

              disabled={citationCount === 0 || autocorrecting}

              onSelect={() => void handleAutocorrect()}

            >

              {autocorrecting ? t('toolbar.autocorrectBusy') : t('toolbar.autocorrect')}

            </DropdownMenuItem>

            <DropdownMenuItem

              disabled={citationCount === 0 || findingDois || networkStatus !== 'online'}

              onSelect={() => void handleFindDois()}

            >

              {findingDois ? t('toolbar.findingDoisBusy') : t('toolbar.findDois')}

            </DropdownMenuItem>

            <DropdownMenuItem disabled={citationCount < 2} onSelect={() => detectDuplicates()}>

              {t('toolbar.duplicates')}

            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled={!canUndo} onSelect={() => undo()}>

              {t('toolbar.undo')}

            </DropdownMenuItem>

            <DropdownMenuItem disabled={!canRedo} onSelect={() => redo()}>

              {t('toolbar.redo')}

            </DropdownMenuItem>

            <DropdownMenuItem

              destructive

              disabled={citationCount === 0}

              onSelect={() => void handleClearAll()}

            >

              {t('toolbar.clearAll')}

            </DropdownMenuItem>

          </DropdownMenu>

        ) : null}



        {showDrawerToggle ? (

          <button

            type="button"

            className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

            onClick={toggleBibliographyDrawer}

          >

            {t('shell.drawerToggle')}

          </button>

        ) : null}



        <NetworkStatusIndicator />

      </div>

    </header>

  )

}


