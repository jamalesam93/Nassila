import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitationStore } from '../stores/citation-store'
import { Tabs } from './ui/tabs'
import IssuePanel from './IssuePanel'
import TargetSelector from './TargetSelector'
import JournalGuidelines from './JournalGuidelines'

type SidebarTab = 'issues' | 'target'

/** Issues / target style panel — used in bibliography drawer. */
export default function SidebarPanel() {
  const { t } = useTranslation()
  const issues = useCitationStore((s) => s.issues)
  const mismatches = useCitationStore((s) => s.verificationMismatches)
  const duplicates = useCitationStore((s) => s.duplicates)
  const registryLayerByCitationId = useCitationStore((s) => s.registryLayerByCitationId)
  const predatoryFlags = useCitationStore((s) => s.predatoryFlags)

  const issueTabCount = useMemo(() => {
    const registryKeyCount = Object.keys(registryLayerByCitationId).length
    return (
      issues.length +
      mismatches.length +
      duplicates.length +
      registryKeyCount +
      predatoryFlags.length
    )
  }, [
    issues.length,
    mismatches.length,
    duplicates.length,
    registryLayerByCitationId,
    predatoryFlags.length
  ])

  const [tab, setTab] = useState<SidebarTab>('target')

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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-3 py-2">
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
    </div>
  )
}
