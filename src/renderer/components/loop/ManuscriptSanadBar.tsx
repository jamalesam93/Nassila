import { useEffect, useRef } from 'react'

import { useTranslation } from 'react-i18next'

import { useManuscriptAuditStore } from '../../stores/manuscript-audit-store'

import { useShellStore } from '../../stores/shell-store'

import { useManuscriptAuditPrefsSync } from '../../hooks/use-manuscript-audit-prefs-sync'

import { useSanadSetupPrompt } from '../../hooks/use-sanad-setup-prompt'

import {

  CLOUD_LLM_PRESET_ID,

  defaultBaseUrlForPreset,

  getLlmPreset,

  isLocalRunnerPreset,

  isNassilaSanadModel,

  modelForSanadTier,

  presetLabelKey,

  sanadTierFromModel,

  type SanadTier

} from '../../utils/llm-config-utils'



export default function ManuscriptSanadBar() {

  const { t } = useTranslation()

  useManuscriptAuditPrefsSync({ saveEnabled: true })

  const { maybeOpenSanadSetup } = useSanadSetupPrompt()

  const prevEnabledRef = useRef<boolean | null>(null)



  const llmEnabled = useManuscriptAuditStore((s) => s.llmEnabled)

  const llmPresetId = useManuscriptAuditStore((s) => s.llmPresetId)

  const llmBaseUrl = useManuscriptAuditStore((s) => s.llmBaseUrl)

  const llmModel = useManuscriptAuditStore((s) => s.llmModel)

  const setLlmEnabled = useManuscriptAuditStore((s) => s.setLlmEnabled)

  const setLlmBaseUrl = useManuscriptAuditStore((s) => s.setLlmBaseUrl)

  const setLlmModel = useManuscriptAuditStore((s) => s.setLlmModel)

  const openSettingsModal = useShellStore((s) => s.openSettingsModal)

  const openSanadSetup = useShellStore((s) => s.openSanadSetup)



  const tier = sanadTierFromModel(llmModel)

  const showNassilaTier = isLocalRunnerPreset(llmPresetId)

  const providerShort = t(presetLabelKey(llmPresetId), {

    defaultValue: getLlmPreset(llmPresetId).label

  })



  const setTier = (next: SanadTier) => {

    setLlmModel(modelForSanadTier(next))

    if (!llmBaseUrl.trim()) {

      setLlmBaseUrl(defaultBaseUrlForPreset(llmPresetId) || defaultBaseUrlForPreset('lmstudio'))

    }

  }



  const modelSummary = llmModel.length > 28 ? `${llmModel.slice(0, 26)}…` : llmModel



  useEffect(() => {

    const prev = prevEnabledRef.current

    prevEnabledRef.current = llmEnabled

    if (prev === false && llmEnabled) {

      void maybeOpenSanadSetup()

    }

  }, [llmEnabled, maybeOpenSanadSetup])



  return (

    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm rtl:flex-row-reverse">

      <label className="flex cursor-pointer items-center gap-2">

        <input

          type="checkbox"

          checked={llmEnabled}

          onChange={(e) => setLlmEnabled(e.target.checked)}

          className="rounded border-input"

        />

        <span className="text-xs font-medium">{t('loop.sanadBar.grounding')}</span>

      </label>



      {llmEnabled ? (

        <>

          <span className="hidden text-muted-foreground sm:inline" aria-hidden>

            ·

          </span>



          {showNassilaTier ? (

            <div className="flex items-center gap-1">

              {(['e4b', '12b'] as const).map((id) => {

                const active = tier === id && isNassilaSanadModel(llmModel)

                return (

                  <button

                    key={id}

                    type="button"

                    className={`rounded px-2 py-0.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${

                      active

                        ? 'bg-primary/15 text-primary'

                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'

                    }`}

                    onClick={() => setTier(id)}

                  >

                    {t(`loop.sanadBar.tier.${id}`)}

                  </button>

                )

              })}

            </div>

          ) : (

            <span className="max-w-[14rem] truncate text-xs text-muted-foreground" title={llmModel}>

              {llmPresetId === CLOUD_LLM_PRESET_ID ? providerShort : `${providerShort} · ${modelSummary}`}

            </span>

          )}



          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">

            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />

            {t('loop.sanadBar.statusOn')}

          </span>

        </>

      ) : (

        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">

          <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden />

          {t('loop.sanadBar.statusOff')}

        </span>

      )}



      <button

        type="button"

        className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

        onClick={() => openSanadSetup()}

      >

        {t('loop.sanadBar.setup')}

      </button>



      <button

        type="button"

        className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

        onClick={() => openSettingsModal('localModels')}

      >

        {t('loop.sanadBar.configure')}

      </button>

    </div>

  )

}


