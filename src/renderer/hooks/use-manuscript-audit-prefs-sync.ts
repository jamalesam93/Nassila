import { useEffect, useRef } from 'react'

import type { ManuscriptAuditPrefsV1 } from '../../shared/manuscript-audit-prefs'

import { NASSILA_MODEL_ARTIFACTS } from '../../shared/nassila-agent-tasks'

import { resolveLlmPreset } from '../components/ManuscriptAudit/llm-presets'

import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'

import { LM_STUDIO_DEFAULT_URL, migrateLlmPresetId } from '../utils/llm-config-utils'



interface UseManuscriptAuditPrefsSyncOptions {

  /** Load persisted prefs into the store on mount (Settings modal). */

  loadOnMount?: boolean

  /** Debounced save when LLM fields change. */

  saveEnabled?: boolean

}



export function applyPrefsToStore(p: ManuscriptAuditPrefsV1) {

  const store = useManuscriptAuditStore.getState()

  if (typeof p.unpaywallEmail === 'string') store.setUnpaywallEmail(p.unpaywallEmail)

  if (typeof p.llmEnabled === 'boolean') store.setLlmEnabled(p.llmEnabled)

  if (typeof p.llmBaseUrl === 'string') store.setLlmBaseUrl(p.llmBaseUrl)

  if (typeof p.llmModel === 'string') store.setLlmModel(p.llmModel)

  if (typeof p.selectedTemplateId === 'string') store.setSelectedTemplateId(p.selectedTemplateId)



  const migratedPresetId = migrateLlmPresetId(p.llmPresetId ?? 'lmstudio')

  store.setLlmPresetId(migratedPresetId)



  const preset = resolveLlmPreset(migratedPresetId)

  if (!p.llmBaseUrl && preset.baseUrl) store.setLlmBaseUrl(preset.baseUrl)

  if (!p.llmModel && preset.defaultModel) store.setLlmModel(preset.defaultModel)

  if (p.llmEnabled === undefined) store.setLlmEnabled(true)

  if (!p.llmModel) store.setLlmModel(NASSILA_MODEL_ARTIFACTS.sanadE4b)

  if (!store.llmBaseUrl && migratedPresetId !== 'cloud') store.setLlmBaseUrl(LM_STUDIO_DEFAULT_URL)

}



/** Debounced persistence for manuscript audit LLM prefs (merged with existing on disk). */

export function useManuscriptAuditPrefsSync(options: UseManuscriptAuditPrefsSyncOptions = {}) {

  const { loadOnMount = false, saveEnabled = true } = options

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)



  const llmEnabled = useManuscriptAuditStore((s) => s.llmEnabled)

  const llmPresetId = useManuscriptAuditStore((s) => s.llmPresetId)

  const llmBaseUrl = useManuscriptAuditStore((s) => s.llmBaseUrl)

  const llmModel = useManuscriptAuditStore((s) => s.llmModel)

  const unpaywallEmail = useManuscriptAuditStore((s) => s.unpaywallEmail)

  const llmPrefsHydrated = useManuscriptAuditStore((s) => s.llmPrefsHydrated)

  const setLlmPrefsHydrated = useManuscriptAuditStore((s) => s.setLlmPrefsHydrated)



  useEffect(() => {

    if (!loadOnMount) return

    let cancelled = false

    void window.api

      ?.loadManuscriptAuditPrefs()

      .then((prefs) => {

        if (cancelled) return

        if (prefs) applyPrefsToStore(prefs as ManuscriptAuditPrefsV1)

        setLlmPrefsHydrated(true)

      })

      .catch(() => {

        if (!cancelled) setLlmPrefsHydrated(true)

      })

    return () => {

      cancelled = true

    }

  }, [loadOnMount, setLlmPrefsHydrated])



  useEffect(() => {

    if (!saveEnabled || !llmPrefsHydrated) return

    if (saveTimer.current) clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(() => {

      void (async () => {

        const existing = ((await window.api?.loadManuscriptAuditPrefs()) ?? { version: 1 }) as ManuscriptAuditPrefsV1

        await window.api?.saveManuscriptAuditPrefs({

          ...existing,

          version: 1,

          unpaywallEmail: unpaywallEmail.trim() || undefined,

          llmEnabled,

          llmPresetId,

          llmBaseUrl,

          llmModel

        })

      })()

    }, 500)

    return () => {

      if (saveTimer.current) clearTimeout(saveTimer.current)

    }

  }, [llmBaseUrl, llmEnabled, llmModel, llmPresetId, llmPrefsHydrated, saveEnabled, unpaywallEmail])

}


