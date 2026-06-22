import { useTranslation } from 'react-i18next'
import { useShellStore } from '../../stores/shell-store'
import SidebarPanel from '../SidebarPanel'

export default function BibliographyDrawer() {
  const { t } = useTranslation()
  const open = useShellStore((s) => s.bibliographyDrawerOpen)
  const setOpen = useShellStore((s) => s.setBibliographyDrawerOpen)

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20 bg-black/20"
        aria-label={t('shell.drawerClose')}
        onClick={() => setOpen(false)}
      />
      <aside
        className="fixed inset-y-0 end-0 z-30 flex w-full max-w-sm flex-col border-s border-border bg-card shadow-lg"
        aria-label={t('shell.drawerAria')}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">{t('shell.drawerTitle')}</span>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(false)}
          >
            {t('shell.drawerClose')}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <SidebarPanel />
        </div>
      </aside>
    </>
  )
}
