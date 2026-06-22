import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useManuscriptAuditStore } from '../../stores/manuscript-audit-store'
import { Button } from '../ui/button'
import { Tabs } from '../ui/tabs'
import { useManuscriptAudit } from '../../hooks/use-manuscript-audit'
import { useAppCommands } from '../../hooks/use-app-commands'
import { exportReportJson, exportReportMarkdown } from '../../../engine/audit/report'
import { manuscriptAuditExportTimestamp } from '../../utils/export-timestamp'
import { LLM_PRESETS, findPresetByBaseUrl } from './llm-presets'
import { allowsShortLlmKey } from '../../utils/llm-config-utils'
import type { AuditReport, ReferenceIntegrityRisk, CitationFinding, CiteGroundingSite } from '../../../engine/manuscript/types'

function findingIntegrityCardClass(risk: ReferenceIntegrityRisk): string {
  switch (risk) {
    case 'high_unverified':
      return 'border-l-[5px] border-violet-600 bg-violet-500/[0.09] shadow-sm dark:border-violet-400 dark:bg-violet-500/15'
    case 'manual_review':
      return 'border-l-[5px] border-amber-600 bg-amber-500/[0.08] dark:border-amber-400 dark:bg-amber-500/15'
    default:
      return ''
  }
}

function passageStatusLabel(v: CiteGroundingSite['passageVerdict']): string {
  switch (v.status) {
    case 'pass':
      return 'pass'
    case 'warn':
      return `warn (${v.reasons.join('; ')})`
    case 'fail':
      return `fail (${v.reasons.join('; ')})`
    case 'skipped':
      return `skipped (${v.reason})`
    case 'insufficient_evidence':
      return `insufficient (${v.reason})`
    default:
      return 'unknown'
  }
}

function rollupSummary(report: AuditReport) {
  const c = { pass: 0, warn: 0, fail: 0, skipped: 0, insufficient: 0 }
  for (const f of report.findings) {
    switch (f.layers.passage.status) {
      case 'pass':
        c.pass++
        break
      case 'warn':
        c.warn++
        break
      case 'fail':
        c.fail++
        break
      case 'skipped':
        c.skipped++
        break
      case 'insufficient_evidence':
        c.insufficient++
        break
      default:
        break
    }
  }
  return c
}

export default function AuditView() {
  const { t } = useTranslation()
  const [auditTab, setAuditTab] = useState<'manuscript' | 'settings' | 'results'>('manuscript')
  const raw = useManuscriptAuditStore((s) => s.rawManuscriptText)
  const setRaw = useManuscriptAuditStore((s) => s.setRawManuscriptText)
  const report = useManuscriptAuditStore((s) => s.report)
  const step = useManuscriptAuditStore((s) => s.step)
  const error = useManuscriptAuditStore((s) => s.error)
  const clear = useManuscriptAuditStore((s) => s.clear)
  const setUserAction = useManuscriptAuditStore((s) => s.setUserAction)
  const llmEnabled = useManuscriptAuditStore((s) => s.llmEnabled)
  const setLlmEnabled = useManuscriptAuditStore((s) => s.setLlmEnabled)
  const llmPresetId = useManuscriptAuditStore((s) => s.llmPresetId)
  const setLlmPresetId = useManuscriptAuditStore((s) => s.setLlmPresetId)
  const llmBaseUrl = useManuscriptAuditStore((s) => s.llmBaseUrl)
  const setLlmBaseUrl = useManuscriptAuditStore((s) => s.setLlmBaseUrl)
  const llmModel = useManuscriptAuditStore((s) => s.llmModel)
  const setLlmModel = useManuscriptAuditStore((s) => s.setLlmModel)
  const manuscriptSourceFormat = useManuscriptAuditStore((s) => s.manuscriptSourceFormat)
  const unpaywallEmail = useManuscriptAuditStore((s) => s.unpaywallEmail)
  const setUnpaywallEmail = useManuscriptAuditStore((s) => s.setUnpaywallEmail)
  const selectedTemplateId = useManuscriptAuditStore((s) => s.selectedTemplateId)
  const setSelectedTemplateId = useManuscriptAuditStore((s) => s.setSelectedTemplateId)
  const templateStrict = useManuscriptAuditStore((s) => s.templateStrict)
  const setTemplateStrict = useManuscriptAuditStore((s) => s.setTemplateStrict)
  const templates = useManuscriptAuditStore((s) => s.templates)
  const setTemplates = useManuscriptAuditStore((s) => s.setTemplates)
  const { runAudit, cancel } = useManuscriptAudit()

  const { importManuscript, importManuscriptFromPath } = useAppCommands()
  const [manuscriptDragOver, setManuscriptDragOver] = useState(false)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [hasLlmKey, setHasLlmKey] = useState(false)
  const [llmKeyDraft, setLlmKeyDraft] = useState('')
  const [connTest, setConnTest] = useState<string | null>(null)
  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const auditRunLocked = ['parsing', 'l1', 'l2', 'oa_fetch', 'l3'].includes(step)
  const auditPhaseWorking = auditRunLocked || step === 'llm'

  const summary = useMemo(() => (report ? rollupSummary(report) : null), [report])

  const refreshKeyState = useCallback(() => {
    void window.api?.hasLlmKey().then(setHasLlmKey).catch(() => setHasLlmKey(false))
  }, [])

  useEffect(() => {
    refreshKeyState()
  }, [refreshKeyState])

  useEffect(() => {
    const builtIn = [
      { id: 'imrad', name: 'Empirical (IMRAD)', headings: { introduction: ['introduction'], methods: ['methods', 'materials and methods'], results: ['results'], discussion: ['discussion', 'conclusion'] } },
      { id: 'review', name: 'Review', headings: { introduction: ['introduction', 'background'], methods: ['methods', 'search strategy'], results: ['results', 'findings'], discussion: ['discussion', 'conclusion'] } },
      { id: 'case_report', name: 'Case report', headings: { introduction: ['introduction'], case: ['case presentation', 'case report'], discussion: ['discussion', 'conclusion'] } },
      { id: 'letter', name: 'Letter / Commentary', headings: { body: ['letter', 'commentary', 'correspondence'] } }
    ]
    void window.api
      ?.listTemplates()
      .then((custom) => {
        const merged = [...builtIn, ...(custom ?? []).filter((x) => !builtIn.some((b) => b.id === x.id))]
        setTemplates(merged)
      })
      .catch(() => setTemplates(builtIn))
  }, [setTemplates])

  useEffect(() => {
    void window.api
      ?.loadManuscriptAuditPrefs()
      .then((p) => {
        if (typeof p.unpaywallEmail === 'string') setUnpaywallEmail(p.unpaywallEmail)
        if (typeof p.llmEnabled === 'boolean') setLlmEnabled(p.llmEnabled)
        if (typeof p.llmPresetId === 'string') setLlmPresetId(p.llmPresetId)
        if (typeof p.llmBaseUrl === 'string') setLlmBaseUrl(p.llmBaseUrl)
        if (typeof p.llmModel === 'string') setLlmModel(p.llmModel)
        if (typeof p.selectedTemplateId === 'string') setSelectedTemplateId(p.selectedTemplateId)
        setPrefsLoaded(true)
      })
      .catch(() => setPrefsLoaded(true))
  }, [setLlmBaseUrl, setLlmEnabled, setLlmModel, setLlmPresetId, setSelectedTemplateId, setTemplateStrict, setUnpaywallEmail])

  useEffect(() => {
    if (!prefsLoaded) return
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
    prefsSaveTimer.current = setTimeout(() => {
      void window.api?.saveManuscriptAuditPrefs({
        version: 1,
        unpaywallEmail,
        llmEnabled,
        llmPresetId,
        llmBaseUrl,
        llmModel,
        selectedTemplateId,
        templateStrict
      })
    }, 500)
    return () => {
      if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
    }
  }, [
    prefsLoaded,
    unpaywallEmail,
    llmEnabled,
    llmPresetId,
    llmBaseUrl,
    llmModel,
    selectedTemplateId,
    templateStrict
  ])

  const saveLlmKey = useCallback(async () => {
    const k = llmKeyDraft.trim()
    if (!k) return
    const allowShort = allowsShortLlmKey(llmPresetId, llmBaseUrl)
    try {
      await window.api?.setLlmKey(k, { allowShortPlaceholder: allowShort })
      setLlmKeyDraft('')
      refreshKeyState()
      setConnTest(t('manuscriptAudit.keySaved'))
    } catch (e) {
      setConnTest(`${t('manuscriptAudit.keySaveFailed')}: ${(e as Error).message}`)
    }
  }, [llmBaseUrl, llmKeyDraft, llmPresetId, refreshKeyState, t])

  const clearLlmKey = useCallback(async () => {
    await window.api?.clearLlmKey()
    refreshKeyState()
    setConnTest(t('manuscriptAudit.keyCleared'))
  }, [refreshKeyState, t])

  const testLlmConnection = useCallback(async () => {
    setConnTest(null)
    try {
      await window.api?.llmChat({ baseUrl: llmBaseUrl, model: llmModel }, [{ role: 'user', content: 'Reply with the single word: ok' }])
      setConnTest(t('manuscriptAudit.testOk'))
    } catch (e) {
      setConnTest(`${t('manuscriptAudit.testFailed')}: ${(e as Error).message}`)
    }
  }, [llmBaseUrl, llmModel, t])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Tabs
              ariaLabel={t('manuscriptAudit.tabsAria')}
              value={auditTab}
              onChange={setAuditTab}
              options={[
                { value: 'manuscript', label: t('manuscriptAudit.tabManuscript') },
                { value: 'settings', label: t('manuscriptAudit.tabSettings') },
                { value: 'results', label: t('manuscriptAudit.tabResults') }
              ]}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {manuscriptSourceFormat === 'pdf' && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">{t('manuscriptAudit.badgePdf')}</span>
              )}
              {manuscriptSourceFormat === 'docx' && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">{t('manuscriptAudit.badgeDocx')}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('manuscriptAudit.subtitle')}</p>
            {auditPhaseWorking && (
              <p className="mt-2 text-[11px] leading-snug text-amber-800/95 dark:text-amber-200/90">{t('manuscriptAudit.auditRunning')}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={clear}>
              {t('manuscriptAudit.clear')}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel} disabled={step === 'idle' || step === 'done' || step === 'error'}>
              {t('manuscriptAudit.cancel')}
            </Button>
            <Button size="sm" disabled={auditRunLocked || !raw.trim()} onClick={() => void runAudit(raw)}>
              {t('manuscriptAudit.run')}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {auditTab === 'manuscript' && (
          <div
            className={`flex min-h-0 flex-1 flex-col transition-colors ${
              manuscriptDragOver ? 'bg-primary/[0.05] ring-2 ring-primary/30 ring-inset' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setManuscriptDragOver(true)
            }}
            onDragLeave={() => setManuscriptDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setManuscriptDragOver(false)
              const f = e.dataTransfer.files?.[0] as File & { path?: string }
              const p = f?.path
              if (typeof p === 'string' && /\.(docx|pdf|txt|md)$/i.test(p)) {
                void importManuscriptFromPath(p)
              }
            }}
          >
            {!raw.trim() && (
              <div className="shrink-0 space-y-3 border-b border-border bg-muted/35 px-6 py-7 text-center md:py-8">
                <p className="text-sm font-medium text-foreground">{t('manuscriptAudit.emptyManuscriptTitle')}</p>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">{t('manuscriptAudit.emptyManuscriptHint')}</p>
                <Button size="sm" variant="secondary" type="button" onClick={() => void importManuscript()}>
                  {t('manuscriptAudit.emptyManuscriptImport')}
                </Button>
              </div>
            )}
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              aria-label={t('manuscriptAudit.editorPlaceholder')}
              placeholder={t('manuscriptAudit.editorPlaceholder')}
              spellCheck={false}
              className={`min-h-[14rem] flex-1 resize-none bg-background p-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            />
          </div>
        )}

        {auditTab === 'settings' && (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <section className="mx-auto max-w-xl space-y-4 md:max-w-2xl xl:max-w-3xl">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">{t('manuscriptAudit.structureTitle')}</h3>
                <div className="mt-3 space-y-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input type="checkbox" checked={templateStrict} onChange={(e) => setTemplateStrict(e.target.checked)} />
                    {t('manuscriptAudit.strictMode')}
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">{t('manuscriptAudit.connectionsTitle')}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t('manuscriptAudit.connectionsPrivacy')}</p>

                <label className="mt-3 block text-[11px] font-medium text-foreground">{t('manuscriptAudit.unpaywallEmail')}</label>
                <input
                  value={unpaywallEmail}
                  onChange={(e) => setUnpaywallEmail(e.target.value)}
                  autoComplete="off"
                  type="email"
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                  placeholder={t('manuscriptAudit.unpaywallPlaceholder')}
                />

                <div className="mt-4 border-t border-border pt-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                    <input type="checkbox" checked={llmEnabled} onChange={(e) => setLlmEnabled(e.target.checked)} />
                    {t('manuscriptAudit.enableLlm')}
                  </label>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{t('manuscriptAudit.llmDisclaimer')}</p>

                  <div className="mt-3 space-y-2">
                    <select
                      value={llmPresetId}
                      onChange={(e) => {
                        const id = e.target.value
                        setLlmPresetId(id)
                        const preset = LLM_PRESETS.find((p) => p.id === id)
                        if (preset && preset.id !== 'custom') {
                          setLlmBaseUrl(preset.baseUrl)
                          setLlmModel(preset.defaultModel)
                        }
                      }}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                    >
                      {LLM_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={llmBaseUrl}
                      onChange={(e) => {
                        const v = e.target.value
                        setLlmBaseUrl(v)
                        const matched = findPresetByBaseUrl(v)
                        setLlmPresetId(matched?.id ?? 'custom')
                      }}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                      placeholder={t('manuscriptAudit.baseUrlPlaceholder')}
                    />
                    <input
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      list={`models-${llmPresetId}`}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                      placeholder={t('manuscriptAudit.modelPlaceholder')}
                    />
                    {(() => {
                      const preset = LLM_PRESETS.find((p) => p.id === llmPresetId)
                      if (!preset?.modelHints.length) return null
                      return (
                        <datalist id={`models-${llmPresetId}`}>
                          {preset.modelHints.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      )
                    })()}
                  </div>

                  <p className="mt-3 text-[10px] text-muted-foreground">
                    {hasLlmKey ? t('manuscriptAudit.keyStateSet') : t('manuscriptAudit.keyStateEmpty')}
                  </p>

                  <label className="mt-2 block text-[11px] font-medium text-foreground">{t('manuscriptAudit.apiKeyField')}</label>
                  <input
                    type="password"
                    value={llmKeyDraft}
                    onChange={(e) => setLlmKeyDraft(e.target.value)}
                    autoComplete="off"
                    placeholder={allowsShortLlmKey(llmPresetId, llmBaseUrl) ? t('manuscriptAudit.apiKeyPlaceholderLocal') : t('manuscriptAudit.apiKeyPlaceholder')}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void saveLlmKey()} disabled={!llmKeyDraft.trim()}>
                      {t('manuscriptAudit.saveKey')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void clearLlmKey()}>
                      {t('manuscriptAudit.clearKey')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void testLlmConnection()} disabled={!hasLlmKey}>
                      {t('manuscriptAudit.testConnection')}
                    </Button>
                  </div>
                  {connTest ? <p className="mt-2 text-[11px] text-muted-foreground">{connTest}</p> : null}
                </div>
              </div>
            </section>
          </div>
        )}

        {auditTab === 'results' && (
          <div className="h-full min-h-0 overflow-y-auto bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('manuscriptAudit.statusTitle')}</h3>
              <div className="mt-1 text-xs text-muted-foreground">
                {t('manuscriptAudit.stepLabel')}:{' '}
                <span className="font-mono text-foreground">{t(`manuscriptAudit.phase.${step}`, { defaultValue: step })}</span>
              </div>
              {error && <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
            </div>

            {!report ? (
              <p className="p-4 text-xs text-muted-foreground">{t('manuscriptAudit.noReport')}</p>
            ) : (
              <div className="space-y-4 p-4 pb-24">
                {summary ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                    {[
                      { k: 'words', label: t('manuscriptAudit.summaryWords'), v: String(report.manuscript.wordCount), tone: '' },
                      { k: 'l3p', label: t('manuscriptAudit.summaryL3Pass'), v: String(summary.pass), tone: 'text-green-700 dark:text-green-400' },
                      { k: 'l3w', label: t('manuscriptAudit.summaryL3Warn'), v: String(summary.warn), tone: 'text-amber-700 dark:text-amber-400' },
                      { k: 'l3f', label: t('manuscriptAudit.summaryL3Fail'), v: String(summary.fail), tone: 'text-destructive' },
                      { k: 'l3s', label: t('manuscriptAudit.summaryL3Skipped'), v: String(summary.skipped), tone: '' },
                      { k: 'l3i', label: t('manuscriptAudit.summaryL3Insufficient'), v: String(summary.insufficient), tone: '' }
                    ].map((x) => (
                      <div key={x.k} className="rounded-md border border-border bg-background px-3 py-2">
                        <div className="text-[10px] font-medium text-muted-foreground">{x.label}</div>
                        <div className={`mt-0.5 text-lg font-semibold tabular-nums ${x.tone || 'text-foreground'}`}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {report.findings.length === 0 && (
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    {t('manuscriptAudit.resultsCleanHint')}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const stamp = manuscriptAuditExportTimestamp()
                      const path = await window.api?.saveFileDialog({
                        defaultPath: `manuscript-audit_${stamp}.json`,
                        filters: [{ name: 'JSON', extensions: ['json'] }]
                      })
                      if (!path) return
                      await window.api?.writeFile(path, exportReportJson(report))
                    }}
                  >
                    {t('manuscriptAudit.exportJson')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const stamp = manuscriptAuditExportTimestamp()
                      const path = await window.api?.saveFileDialog({
                        defaultPath: `manuscript-audit_${stamp}.md`,
                        filters: [{ name: 'Markdown', extensions: ['md'] }]
                      })
                      if (!path) return
                      await window.api?.writeFile(path, exportReportMarkdown(report))
                    }}
                  >
                    {t('manuscriptAudit.exportMarkdown')}
                  </Button>
                </div>

                {report.findings.some((x) => x.referenceIntegrityRisk === 'high_unverified') && (
                  <div className="rounded-md border border-violet-500/35 bg-violet-500/[0.12] px-3 py-2 dark:border-violet-400/40 dark:bg-violet-500/20">
                    <div className="text-[11px] font-semibold text-violet-950 dark:text-violet-50">
                      {t('integrity.summaryHigh', {
                        count: report.findings.filter((x) => x.referenceIntegrityRisk === 'high_unverified').length
                      })}
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-violet-900/85 dark:text-violet-100/90">{t('audit.integrityNotice')}</p>
                  </div>
                )}

                {report.checklist.length > 0 && (
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-xs font-semibold text-foreground">{t('manuscriptAudit.checklist')}</div>
                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      {report.checklist.map((c) => (
                        <li key={c.id}>
                          <span className={c.passed ? 'text-green-700 dark:text-green-400' : 'text-destructive'}>{c.passed ? '✓' : '✕'}</span>{' '}
                          <span className="text-foreground">{c.label}</span>
                          {c.detail ? <span className="text-muted-foreground"> — {c.detail}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <FindingSections report={report} setUserAction={setUserAction} t={t} />

                <p className="text-[10px] italic text-muted-foreground">{t('integrity.footnote')}</p>
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="text-xs font-semibold text-foreground">{t('manuscriptAudit.dataSourcesTitle')}</div>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    {report.sources.map((s) => (
                      <li key={s.name}>
                        <span className="text-foreground">{s.name}</span> — {s.attribution}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FindingSections({
  report,
  setUserAction,
  t
}: {
  report: AuditReport
  setUserAction: (bibKey: string, action: { kind: 'acknowledged' } | { kind: 'ignored_for_session' }) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  if (!report.findings.length) {
    return <p className="text-xs text-muted-foreground">{t('manuscriptAudit.noMappedCitations')}</p>
  }
  return (
    <div className="space-y-2">
      {report.findings.slice(0, 50).map((f) => (
        <FindingCard key={f.bibKey} f={f} setUserAction={setUserAction} t={t} />
      ))}
      {report.findings.length > 50 ? <p className="text-[11px] text-muted-foreground">{t('manuscriptAudit.truncateFindings', { count: 50 })}</p> : null}
    </div>
  )
}

function FindingCard({
  f,
  setUserAction,
  t
}: {
  f: CitationFinding
  setUserAction: (bibKey: string, action: { kind: 'acknowledged' } | { kind: 'ignored_for_session' }) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <details className="group rounded-md border border-border bg-background open:border-primary/35 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/35">
      <summary className="cursor-pointer px-3 py-2 outline-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground">
              Ref {f.bibKey} · L3 {f.layers.passage.status}
              {f.l3Score ? ` · overlap ${f.l3Score}` : ''}
            </span>
            <div className="text-[11px] text-muted-foreground">
              L1 {f.layers.registry.status} · L2 {f.layers.metadata.status} · {f.l3Coverage}
            </div>
          </div>
        </div>
      </summary>
      <div className={['border-t border-border px-3 pb-3 pt-2', findingIntegrityCardClass(f.referenceIntegrityRisk)].join(' ')}>
        {(f.referenceIntegrityRisk === 'high_unverified' || f.referenceIntegrityRisk === 'manual_review') && (
          <div
            className={[
              'mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold text-white',
              f.referenceIntegrityRisk === 'high_unverified' ? 'bg-violet-700 dark:bg-violet-600' : 'bg-amber-700 dark:bg-amber-600'
            ].join(' ')}
          >
            {f.referenceIntegrityRisk === 'high_unverified' ? t('integrity.highBadge') : t('integrity.manualBadge')}
          </div>
        )}
        {f.referenceIntegrityRisk === 'high_unverified' && (
          <>
            <p className="text-[11px] font-medium text-violet-950 dark:text-violet-50">{t('integrity.highTitle')}</p>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{t('integrity.highBody')}</p>
          </>
        )}
        {f.referenceIntegrityRisk === 'manual_review' && <p className="text-[10px] leading-snug text-muted-foreground">{t('integrity.manualBody')}</p>}

        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" className="text-[11px]" onClick={() => setUserAction(f.bibKey, { kind: 'acknowledged' })}>
            {t('manuscriptAudit.acknowledgeAction')}
          </Button>
          <Button size="sm" variant="ghost" className="text-[11px]" onClick={() => setUserAction(f.bibKey, { kind: 'ignored_for_session' })}>
            {t('manuscriptAudit.ignoreAction')}
          </Button>
        </div>

        {f.citeSites && f.citeSites.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold text-foreground">{t('manuscriptAudit.citeSitesTitle')}</div>
            {f.citeSites.map((site, idx) => (
              <SiteBlock key={`${idx}-${site.inTextSpan.start}-${site.inTextSpan.end}`} idx={idx} site={site} />
            ))}
          </div>
        ) : (
          <>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Evidence:{' '}
              <span className="text-foreground">{f.evidence[0]?.text.slice(0, 200)}
              {(f.evidence[0]?.text.length ?? 0) > 200 ? '…' : ''}</span>
            </p>
          </>
        )}
      </div>
    </details>
  )
}

function SiteBlock({ idx, site }: { idx: number; site: CiteGroundingSite }) {
  return (
    <details className="rounded border border-border/80 bg-muted/40 open:bg-muted/60">
      <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-medium [&::-webkit-details-marker]:hidden">
        Cite #{idx + 1} · {passageStatusLabel(site.passageVerdict)} · overlap {(site.deterministicScore * 100).toFixed(0)}% ({site.deterministicBucket})
      </summary>
      <div className="space-y-2 border-t border-border px-2 py-2 text-[11px]">
        <div>
          <span className="text-muted-foreground">Span: </span>
          <span className="font-mono text-foreground">{site.inTextSpan.raw || '—'}</span>
        </div>
        <div>
          <div className="text-muted-foreground">Passage</div>
          <p className="mt-0.5 whitespace-pre-wrap text-foreground">{site.passageWindow}</p>
        </div>
        {site.matchedTermsSample.length > 0 && (
          <div>
            <span className="text-muted-foreground">Matched tokens: </span>
            <span>{site.matchedTermsSample.join(', ')}</span>
          </div>
        )}
        {site.llmParseWarning ? <div className="text-amber-800 dark:text-amber-400">Note: {site.llmParseWarning}</div> : null}
        {site.llmRawResponse ? (
          <details>
            <summary className="cursor-pointer text-[10px] text-muted-foreground">Raw LLM (trunc.)</summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px]">{site.llmRawResponse}</pre>
          </details>
        ) : null}
        {site.claimGrounding && site.claimGrounding.length > 0 ? (
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-1 pr-2">Claim</th>
                <th className="py-1 pr-2">Verdict</th>
                <th className="py-1">Quotes</th>
              </tr>
            </thead>
            <tbody>
              {site.claimGrounding.map((c, i) => (
                <tr key={i} className="align-top border-b border-border/60">
                  <td className="py-1 pr-2 text-foreground">{c.claim}</td>
                  <td className="py-1 pr-2 capitalize">{c.verdict}</td>
                  <td className="py-1 text-muted-foreground">{(c.sourceQuotes ?? []).join(' | ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </details>
  )
}
