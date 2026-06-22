import { useEffect } from 'react'
import { applyPrefsToStore } from './use-manuscript-audit-prefs-sync'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'

const BUILTIN_TEMPLATES = [
  {
    id: 'imrad',
    name: 'Empirical (IMRAD)',
    headings: {
      introduction: ['introduction'],
      methods: ['methods', 'materials and methods'],
      results: ['results'],
      discussion: ['discussion', 'conclusion']
    }
  },
  {
    id: 'review',
    name: 'Review',
    headings: {
      introduction: ['introduction', 'background'],
      methods: ['methods', 'search strategy'],
      results: ['results', 'findings'],
      discussion: ['discussion', 'conclusion']
    }
  },
  {
    id: 'case_report',
    name: 'Case report',
    headings: {
      introduction: ['introduction'],
      case: ['case presentation', 'case report'],
      discussion: ['discussion', 'conclusion']
    }
  },
  {
    id: 'letter',
    name: 'Letter / Commentary',
    headings: { body: ['letter', 'commentary', 'correspondence'] }
  }
]

/** Load manuscript-audit prefs and structure templates once for the Ouroboros loop. */
export function useOuroborosLoopBootstrap() {
  const setTemplates = useManuscriptAuditStore((s) => s.setTemplates)
  const setLlmPrefsHydrated = useManuscriptAuditStore((s) => s.setLlmPrefsHydrated)

  useEffect(() => {
    void window.api
      ?.listTemplates()
      .then((custom) => {
        const merged = [
          ...BUILTIN_TEMPLATES,
          ...(custom ?? []).filter((x) => !BUILTIN_TEMPLATES.some((b) => b.id === x.id))
        ]
        setTemplates(merged)
      })
      .catch(() => setTemplates(BUILTIN_TEMPLATES))
  }, [setTemplates])

  useEffect(() => {
    void window.api
      ?.loadManuscriptAuditPrefs()
      .then((prefs) => {
        if (prefs) applyPrefsToStore(prefs)
      })
      .catch(() => {})
      .finally(() => setLlmPrefsHydrated(true))
  }, [setLlmPrefsHydrated])
}
