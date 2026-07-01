import { useCallback, useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { findPresetByBaseUrl } from '../../settings/llm-presets'

import { Button } from '../ui/button'

import { useManuscriptAuditStore } from '../../stores/manuscript-audit-store'

import { useManuscriptAuditPrefsSync } from '../../hooks/use-manuscript-audit-prefs-sync'

import { patchSanadSetupPrefs, useSanadSetupPrompt } from '../../hooks/use-sanad-setup-prompt'

import { pushToast } from '../../lib/notify'

import { useShellStore } from '../../stores/shell-store'

import {

  allowsShortLlmKey,

  applyLlmPreset,

  CLOUD_LLM_PRESET_ID,

  defaultBaseUrlForPreset,

  ensureLlmKeyReady,

  getLlmPreset,

  inferCloudEndpointFromKey,

  isLocalRunnerPreset,

  isNassilaSanadModel,

  LLM_PROVIDER_GROUPS,

  modelForSanadTier,

  presetLabelKey,

  sanadTierFromModel,

  type CloudProviderKind,

  type SanadTier

} from '../../utils/llm-config-utils'



export default function LocalModelsSettings() {

  const { t } = useTranslation()

  useManuscriptAuditPrefsSync({ loadOnMount: true, saveEnabled: true })

  const { maybeOpenSanadSetup } = useSanadSetupPrompt()

  const openSanadSetup = useShellStore((s) => s.openSanadSetup)

  const llmPrefsHydrated = useManuscriptAuditStore((s) => s.llmPrefsHydrated)



  const llmEnabled = useManuscriptAuditStore((s) => s.llmEnabled)

  const llmPresetId = useManuscriptAuditStore((s) => s.llmPresetId)

  const llmBaseUrl = useManuscriptAuditStore((s) => s.llmBaseUrl)

  const llmModel = useManuscriptAuditStore((s) => s.llmModel)

  const setLlmEnabled = useManuscriptAuditStore((s) => s.setLlmEnabled)

  const setLlmPresetId = useManuscriptAuditStore((s) => s.setLlmPresetId)

  const setLlmBaseUrl = useManuscriptAuditStore((s) => s.setLlmBaseUrl)

  const setLlmModel = useManuscriptAuditStore((s) => s.setLlmModel)



  const [llmKeyDraft, setLlmKeyDraft] = useState('')

  const [hasLlmKey, setHasLlmKey] = useState(false)

  const [connTest, setConnTest] = useState<string | null>(null)

  const [testing, setTesting] = useState(false)

  const [cloudDetected, setCloudDetected] = useState<CloudProviderKind | null>(null)



  const preset = getLlmPreset(llmPresetId)

  const tier = sanadTierFromModel(llmModel)

  const isCloud = llmPresetId === CLOUD_LLM_PRESET_ID

  const showNassilaTier = isLocalRunnerPreset(llmPresetId)

  const shortKeyAllowed = allowsShortLlmKey(llmPresetId, llmBaseUrl)



  const refreshKeyState = useCallback(async () => {

    try {

      const has = await window.api?.hasLlmKey()

      setHasLlmKey(Boolean(has))

    } catch {

      setHasLlmKey(false)

    }

  }, [])



  useEffect(() => {

    void refreshKeyState()

  }, [refreshKeyState])



  useEffect(() => {

    if (!llmPrefsHydrated) return

    void maybeOpenSanadSetup()

  }, [llmPrefsHydrated, maybeOpenSanadSetup])



  const onPresetChange = useCallback(

    (id: string) => {

      const wasLocal = allowsShortLlmKey(llmPresetId, llmBaseUrl)

      const goingCloud = id === CLOUD_LLM_PRESET_ID



      setLlmPresetId(id)

      const next = applyLlmPreset(id)

      if (next.baseUrl) setLlmBaseUrl(next.baseUrl)



      if (goingCloud) {

        setCloudDetected(null)

        if (wasLocal) {

          void window.api?.clearLlmKey().then(() => refreshKeyState())

        }

      }

    },

    [llmBaseUrl, llmPresetId, refreshKeyState, setLlmBaseUrl, setLlmPresetId]

  )



  const applyTier = useCallback(

    (next: SanadTier) => {

      setLlmModel(modelForSanadTier(next))

      if (!llmBaseUrl.trim()) {

        setLlmBaseUrl(defaultBaseUrlForPreset(llmPresetId) || defaultBaseUrlForPreset('lmstudio'))

      }

    },

    [llmBaseUrl, llmPresetId, setLlmBaseUrl, setLlmModel]

  )



  const onKeyDraftChange = useCallback(

    (value: string) => {

      setLlmKeyDraft(value)

      if (isCloud && value.trim()) {

        setCloudDetected(inferCloudEndpointFromKey(value).providerKind)

      } else {

        setCloudDetected(null)

      }

    },

    [isCloud]

  )



  const saveLlmKey = useCallback(async () => {

    const k = llmKeyDraft.trim()

    if (!k) return

    try {

      if (isCloud) {

        const inferred = inferCloudEndpointFromKey(k)

        if (inferred.baseUrl && !llmBaseUrl.trim()) {

          setLlmBaseUrl(inferred.baseUrl)

        }

        setCloudDetected(inferred.providerKind)

      }

      await window.api?.setLlmKey(k, { allowShortPlaceholder: shortKeyAllowed })

      setLlmKeyDraft('')

      await refreshKeyState()

      setConnTest(t('manuscriptAudit.keySaved'))

      pushToast('success', t('notifications.keySaved'))

    } catch (e) {

      setConnTest(`${t('manuscriptAudit.keySaveFailed')}: ${(e as Error).message}`)

    }

  }, [isCloud, llmBaseUrl, llmKeyDraft, refreshKeyState, setLlmBaseUrl, shortKeyAllowed, t])



  const clearLlmKey = useCallback(async () => {

    await window.api?.clearLlmKey()

    setCloudDetected(null)

    await refreshKeyState()

    setConnTest(t('manuscriptAudit.keyCleared'))

  }, [refreshKeyState, t])



  const testConnection = useCallback(async () => {

    setTesting(true)

    setConnTest(null)

    try {

      const baseUrl = llmBaseUrl.trim() || preset.baseUrl || defaultBaseUrlForPreset(llmPresetId)

      if (!baseUrl) throw new Error(t('settings.localModels.endpointRequired'))

      if (!llmModel.trim()) throw new Error(t('settings.localModels.modelRequired'))



      const matched = findPresetByBaseUrl(baseUrl)

      const effectivePresetId = matched?.id ?? llmPresetId

      await ensureLlmKeyReady(effectivePresetId, baseUrl)

      await refreshKeyState()

      await window.api?.llmChat(

        { baseUrl, model: llmModel },

        [{ role: 'user', content: 'Reply with the single word: ok' }]

      )

      setConnTest(t('settings.localModels.testOk'))

      void patchSanadSetupPrefs({ sanadConnectionTested: true })

    } catch (e) {

      setConnTest(`${t('settings.localModels.testFailed')}: ${(e as Error).message}`)

    } finally {

      setTesting(false)

    }

  }, [llmBaseUrl, llmModel, llmPresetId, preset.baseUrl, refreshKeyState, t])



  const runnerHintKey = `settings.localModels.runnerHint.${llmPresetId}`

  const runnerHint = t(runnerHintKey, { defaultValue: '' })



  return (

    <section className="space-y-4" id="settings-local-models">

      <div>

        <h3 className="text-sm font-semibold text-foreground">{t('settings.localModels.title')}</h3>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">

          {t('settings.localModels.subtitle')}

        </p>

        <button

          type="button"

          className="mt-2 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

          onClick={() => openSanadSetup()}

        >

          {t('settings.localModels.setupGuide')}

        </button>

      </div>



      <label className="flex cursor-pointer items-start gap-2">

        <input

          type="checkbox"

          className="mt-0.5"

          checked={llmEnabled}

          onChange={(e) => setLlmEnabled(e.target.checked)}

        />

        <span className="text-sm">{t('settings.localModels.enable')}</span>

      </label>



      <div>

        <label className="block text-xs font-medium text-foreground">

          {t('settings.localModels.providerLabel')}

        </label>

        <select

          value={llmPresetId}

          disabled={!llmEnabled}

          onChange={(e) => onPresetChange(e.target.value)}

          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"

        >

          {LLM_PROVIDER_GROUPS.map((group) => (

            <optgroup key={group.labelKey} label={t(group.labelKey)}>

              {group.presetIds.map((id) => (

                <option key={id} value={id}>

                  {t(presetLabelKey(id), { defaultValue: getLlmPreset(id).label })}

                </option>

              ))}

            </optgroup>

          ))}

        </select>

        {runnerHint ? (

          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{runnerHint}</p>

        ) : null}

        {isCloud ? (

          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">

            {t('settings.localModels.cloudDisclaimer')}

          </p>

        ) : null}

      </div>



      {showNassilaTier ? (

        <div className="rounded-md border border-border bg-muted/20 p-3">

          <p className="text-xs font-medium text-foreground">{t('settings.localModels.nassilaTierTitle')}</p>

          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('settings.localModels.nassilaTierHint')}</p>

          <div className="mt-2 flex flex-wrap gap-2">

            {(['e4b', '12b'] as const).map((id) => {

              const active = tier === id && isNassilaSanadModel(llmModel)

              return (

                <button

                  key={id}

                  type="button"

                  disabled={!llmEnabled}

                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${

                    active

                      ? 'border-primary bg-primary/10 text-primary'

                      : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'

                  }`}

                  onClick={() => applyTier(id)}

                >

                  {t(`settings.localModels.tier.${id}`)}

                </button>

              )

            })}

          </div>

        </div>

      ) : null}



      <label className="block">

        <span className="text-xs font-medium text-foreground">{t('settings.localModels.endpointLabel')}</span>

        <input

          value={llmBaseUrl}

          disabled={!llmEnabled}

          onChange={(e) => {

            const v = e.target.value

            setLlmBaseUrl(v)

            const matched = findPresetByBaseUrl(v)

            if (matched) {

              setLlmPresetId(matched.id)

            } else if (isCloud) {

              setLlmPresetId(CLOUD_LLM_PRESET_ID)

            } else {

              setLlmPresetId('custom')

            }

          }}

          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"

          placeholder={t('settings.localModels.endpointPlaceholder')}

          autoComplete="off"

        />

      </label>



      <label className="block">

        <span className="text-xs font-medium text-foreground">{t('settings.localModels.modelLabel')}</span>

        <input

          value={llmModel}

          disabled={!llmEnabled}

          onChange={(e) => setLlmModel(e.target.value)}

          list={`settings-models-${llmPresetId}`}

          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"

          placeholder={t('settings.localModels.modelPlaceholder')}

          autoComplete="off"

        />

        {preset.modelHints.length > 0 ? (

          <datalist id={`settings-models-${llmPresetId}`}>

            {preset.modelHints.map((m) => (

              <option key={m} value={m} />

            ))}

          </datalist>

        ) : null}

      </label>



      <div className="rounded-md border border-border p-3">

        <p className="text-xs font-medium text-foreground">{t('manuscriptAudit.apiKeyField')}</p>

        <p className="mt-0.5 text-[11px] text-muted-foreground">

          {hasLlmKey ? t('manuscriptAudit.keyStateSet') : t('manuscriptAudit.keyStateEmpty')}

          {shortKeyAllowed ? ` · ${t('settings.localModels.localKeyHint')}` : null}

          {isCloud && cloudDetected && cloudDetected !== 'unknown'

            ? ` · ${t(`settings.localModels.cloudDetected.${cloudDetected}`)}`

            : null}

        </p>

        <input

          type="password"

          value={llmKeyDraft}

          disabled={!llmEnabled}

          onChange={(e) => onKeyDraftChange(e.target.value)}

          autoComplete="off"

          placeholder={

            shortKeyAllowed

              ? t('manuscriptAudit.apiKeyPlaceholderLocal')

              : t('manuscriptAudit.apiKeyPlaceholder')

          }

          className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"

        />

        <div className="mt-2 flex flex-wrap gap-2">

          <Button size="sm" variant="secondary" disabled={!llmEnabled || !llmKeyDraft.trim()} onClick={() => void saveLlmKey()}>

            {t('manuscriptAudit.saveKey')}

          </Button>

          <Button size="sm" variant="ghost" disabled={!llmEnabled || !hasLlmKey} onClick={() => void clearLlmKey()}>

            {t('manuscriptAudit.clearKey')}

          </Button>

        </div>

      </div>



      <div className="flex flex-wrap items-center gap-2">

        <Button size="sm" variant="secondary" disabled={!llmEnabled || testing || !llmModel.trim()} onClick={() => void testConnection()}>

          {testing ? t('settings.localModels.testing') : t('settings.localModels.testConnection')}

        </Button>

        {connTest ? <p className="text-xs text-muted-foreground">{connTest}</p> : null}

      </div>



      <p className="text-[11px] leading-relaxed text-muted-foreground">{t('settings.localModels.privacy')}</p>

    </section>

  )

}


