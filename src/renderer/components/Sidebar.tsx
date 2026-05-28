import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import { Tabs } from './ui/tabs'
import IssuePanel from './IssuePanel'
import TargetSelector from './TargetSelector'
import JournalGuidelines from './JournalGuidelines'

type SidebarTab = 'issues' | 'target'

export default function Sidebar() {
  const { t } = useTranslation()
  const issues = useCitationStore((s) => s.issues)
  const mismatches = useCitationStore((s) => s.verificationMismatches)
  const duplicates = useCitationStore((s) => s.duplicates)
  const registryLayerByCitationId = useCitationStore((s) => s.registryLayerByCitationId)
  const predatoryFlags = useCitationStore((s) => s.predatoryFlags)
  const citationStatuses = useCitationStore((s) => s.citationStatuses)

  const issueTabCount = useMemo(() => {
    const registryKeyCount = Object.keys(registryLayerByCitationId).length
    const fixedCount = Object.values(citationStatuses).filter((s) => s === 'fixed').length
    const partialCount = Object.values(citationStatuses).filter((s) => s === 'partially-fixed').length
    const errorCount = Object.values(citationStatuses).filter((s) => s === 'has-issues').length
    const totalCount =
      issues.length + mismatches.length + duplicates.length + registryKeyCount + predatoryFlags.length
    return totalCount + fixedCount + partialCount + (errorCount > 0 ? errorCount : 0)
  }, [
    issues.length,
    mismatches.length,
    duplicates.length,
    registryLayerByCitationId,
    predatoryFlags.length,
    citationStatuses
  ])

  const initialized = useRef(false)
  const [tab, setTab] = useState<SidebarTab>('target')

  useEffect(() => {
    if (initialized.current) return
    if (issueTabCount > 0) {
      setTab('issues')
      initialized.current = true
    }
  }, [issueTabCount])

  const tabs = [
    {
      value: 'issues' as const,
      label:
        issueTabCount > 0
          ? `${t('sidebar.tabIssues')} (${issueTabCount})`
          : t('sidebar.tabIssues')
    },
    { value: 'target' as const, label: t('sidebar.tabTarget') }
  ]

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <Tabs options={tabs} value={tab} onChange={setTab} ariaLabel={t('sidebar.tabsAria')} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'issues' ? <IssuePanel /> : null}
        {tab === 'target' ? (
          <>
            <TargetSelector />
            <JournalGuidelines />
          </>
        ) : null}
      </div>
    </aside>
  )
}
