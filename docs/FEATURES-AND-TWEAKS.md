# Features & Tweaks — Nassila app

**Status:** 2026-08-27 — post-**1.10.1** (Packaged network parity, shipped 2026-08-23); heading toward **2.0.0 MaktabOCR + Shahid**. Companion to NassilaT [`OUROBOROS_OPERATOR_MAP.md`](../../NassilaT/training/OUROBOROS_OPERATOR_MAP.md) and the [website docs](https://nassila-web.vercel.app/en/docs/sanad-setup) (now canonical). Scope is the **desktop app** ([Nassila](https://github.com/jamalesam93/Nassila)). Items are grouped by priority and each has an effort, a blast radius, and acceptance checks so they can be picked off independently.

> **Version streams:** App releases (**Nassila 1.10.1** shipped; next planned cut **2.0.0**) and Sanad checkpoints **SNN** / **FT-N** (**9B FT-6/v119** sole published Hub tier; 4B S15 / 12B S14 retired) are independent — see NassilaT [`OUROBOROS_OPERATOR_MAP.md`](../../NassilaT/training/OUROBOROS_OPERATOR_MAP.md) § App release train.

> **Red line reminder (from the website docs spec):** no training methodology, corpus, QLoRA, eval scorecards, or NassilaT internals surface in the app. All copy must stay user-facing.

> **Locked authority sequence:** **Phase 0 Trust reset** (before 1.2.2) → **1.2.2 Throughput** → **1.2.3 Quote chip** → **1.2.4 Raqim Repair** → **1.2.5 Masdar attach** → **1.2.6 Raqim Resolve** → **1.2.7 Projects + Help + onboarding** → **1.2.8 OCR O2 + a11y** → **1.2.9 Preflight + quality ledger** → **1.3.0 Sharh-lite** → … → **1.8.0 Sanad 9B** → **1.10.0 Masdar Papers** → **1.10.1 Packaged network parity** → **2.0.0 MaktabOCR + Shahid** (gated) → **2.1.0 Sanad Arabic (FT-7)**. In parallel, NassilaT curates Tier 3 eval; Sanad **9B FT-6** remains the published Hub sole tier (**#17** retired 4B/12B).

### Phase 0-A — Trust reset (before 1.2.2)

Stabilize the production trust boundary before throughput work: move manuscript registry/network ownership out of the renderer, align the production prompt with evaluation, prevent false L3 passes and synthetic-span grounding, report mapping ambiguity/coverage, settle first-use OCR language-pack behavior, and add packaged Windows audit smoke plus basic CI. Exit gates are defined in [`Nassila-Ouroboros-Future.md`](./Nassila-Ouroboros-Future.md) §5.

---

## P0 — Ship first (this release)

### 1. Notifications — OS-native completion + in-app toasts (Option A)

**Problem.** Today, completion of long tasks is **invisible** unless you happen to be staring at the right surface:

- A 76-cite manuscript audit runs in `use-manuscript-audit.ts` and only writes the report to the store at the **very end** (`setReport(report)`, line 284). If the user switches to Bibliography or minimizes the app, there is no "audit finished" signal anywhere.
- Verify references, autocorrect, DOI lookup, predatory-list update — same story: results land in the store, no completion ping.
- Ephemeral actions ("Copied", "Key saved", "Exported 42 references") have no unified feedback surface; `PredatoryListSettings` fakes it with a transient `message` string, everything else is silent.

**Design — two channels, deliberately separate.**

| Channel | Purpose | Mechanism | Fires when |
|---------|---------|-----------|------------|
| **OS-native** | Tell the user about a finished long task when they've left the app/window | Electron `Notification` (main process) | task ends **and** window is blurred or minimized |
| **In-app toast** | Ephemeral feedback for short actions inside the window | React portal + queue (renderer) | action completes while window is focused |

We deliberately **do not** build a notification center/drawer/history. Option A keeps this to ~3 small files.

**Architecture (matches existing IPC + Zustand patterns).**

```
main/notification.ts          ← new: Notification.show(), focus gate
main/ipc-notification.ts      ← new: 'notify:show' invoke handler, 'notify:click' → 'menu:command'-style
preload/index.ts              ← expose notify.show() + onNotificationClick()
renderer/stores/notify-store.ts ← new: toast queue (Zustand)
renderer/components/ui/toast.tsx ← new: portal, auto-dismiss, RTL
renderer/hooks/use-task-notifier.ts ← new: subscribes to long-task stores, fires notify.show()
```

**OS-native (main process).**

- One module wraps `new Notification({ title, body })`. Gate on `BrowserWindow.getFocusedWindow() === null` **or** `win.isMinimized()` — only fire when the user is not looking. If focused, skip the OS notification and let the in-app path handle it.
- AppUserModelId is **already set** at `main/index.ts:85` (`com.nassila.app`) — Windows toast plumbing is ready, no extra setup.
- Click handler focuses the window and (optionally) routes: `notify:click` IPC → renderer → `setAppSurface('loop')` etc. Keep routing optional in v1; focusing is the valuable part.
- Respect `Notification.isSupported()` and a user toggle in Settings → General ("Notify when long tasks finish"). Default **on**.
- **SEC note:** notification bodies never contain reference text or full claims — only counts and a generic verdict rollup ("3 contradictions, 5 weak"). No manuscript content leaves the app via the OS.

**In-app toasts (renderer).**

- `notify-store.ts`: `{ id, kind: 'success'|'info'|'warn'|'error', message, timeoutMs }` queue with `push()` + `dismiss(id)`. Auto-dismiss default 4000ms; errors 6000ms.
- `toast.tsx`: portal to `document.body`, stacked bottom-end (bottom-start in RTL — mirror the existing `rtl:flex-row-reverse` pattern from `AppHeader`), `prefers-reduced-motion` honored (fade only, no slide). Click to dismiss.
- `use-task-notifier.ts` is the **single subscriber** that turns store events into toasts: subscribe to `manuscript-audit-store.step` transitions to `'done'`/`'error'`, to `citation-store` busy flags settling, etc. Keeps the toast logic in one place instead of sprinkled across hooks.

**Wiring the triggers.**

- **Audit done:** subscribe in `use-task-notifier` to `manuscriptAuditStore.step === 'done'`. Toast: `Audit complete · {findings} findings · {pass/warn/fail counts}`. OS-native same (gated on focus).
- **Audit error:** `step === 'error'` → warn toast with the error string (already in `manuscriptAuditStore.error`).
- **Verify references:** `use-app-commands.ts:150` `verifyReferences()` — fire a toast on completion (`Verified {n} references · {m} mismatches`) and on registry failure.
- **Autocorrect / DOI find:** completion toasts (`Autocorrected {n} fields`, `Found {n}/{m} DOIs`).
- **Predatory update:** replace the ad-hoc `message` string in `PredatoryListSettings.tsx` with a toast; keep the inline status for the version/origin facts (those are persistent info, not ephemeral).
- **Export:** `exportBibliography` / `exportManuscriptAuditJson|Markdown` / `exportCslJson` → success toast (`Exported {file}`), error toast on failure. These currently silently succeed/fail.
- **Short actions:** "Copied" (reuse `copy-to-clipboard.ts` callers), "Key saved" (`LocalModelsSettings`), "References sent to Bibliography · {count}" (`OuroborosLoopWorkspace` bridge message).

**i18n.** New `notifications.*` namespace in `en.json` + `ar.json`, mirroring the existing key structure. All strings bilingual from day one — the app is already EN/AR everywhere.

**Effort:** medium. ~4 new files + ~6 call-site additions + 1 settings toggle. Blast radius: low (additive only; nothing existing is removed).

**Acceptance.**
- [x] Run a manuscript audit, blur/minimize the window → OS notification fires on completion; stays in-app when focused.
- [x] Verify, autocorrect, DOI find, export each show a completion toast.
- [x] Error path (offline verify, failed export, audit error) shows a warn/error toast.
- [x] "Notify when tasks finish" toggle in Settings disables OS notifications; in-app toasts still work.
- [x] EN + AR toasts render RTL-correct; `prefers-reduced-motion` disables slide.
- [x] No manuscript/reference text appears in OS notification bodies (only counts).
- [x] Unit test: `notify-store` queue/dismiss/auto-dismiss; `use-task-notifier` fires on `step` transition.

---

### 2. Shorten in-app copy — website is now canonical

**Problem.** `SanadSetupModal.tsx` (~186 lines) reproduces the full LM Studio / Ollama / vLLM walkthrough that now lives, better, at `https://nassila-web.vercel.app/{locale}/docs/sanad-setup`. Maintaining two copies guarantees drift.

**Design.** Cut the modal to: **what Sanad is (1–2 lines) + the two HF model links (action links, keep) + a prominent "Full setup guide →" button to the canonical docs page + existing actions.**

Specifically in `SanadSetupModal.tsx`:
- **Keep:** title, `subtitle`, the HF `models.e4b` / `models.12b` external links (these are download actions, not docs), the privacy line, "Don't show again", "Close", "Open Settings".
- **Remove:** the entire `runnersTitle` section (LM Studio 3 steps, Ollama `CommandBlock` + pull command + copy button, vLLM 2 steps), the `OLLAMA_HF_PULL_*` rendering, the `LM_STUDIO_DEFAULT_BASE` step copy. ~80 lines gone.
- **Add:** a primary button "Full setup guide" → external link, **locale-aware**: `/en/docs/sanad-setup` vs `/ar/docs/sanad-setup` based on `i18n.language`. Use the same `ExternalLink` helper already in the file; add a `↗` affordance so users know it leaves the app (consistent with HF links already opening externally).
- **Add a one-line intro** in `subtitle` that points to the guide: e.g. "Nassila's Sanad models check claims against sources. For the full step-by-step, open the setup guide." (final wording via i18n).

**Trust/UX note (already established pattern).** The app already opens external links via `main/index.ts:54` (`setWindowOpenHandler` → `shell.openExternal`) for HF/LM Studio/vLLM/Unpaywall URLs. The docs link follows the identical, existing path — no new trust surface. The `↗` glyph is purely a polish affordance.

**Same pattern — other candidates (lower priority, do after #2 modal lands):**

| File | Current | Change |
|------|---------|--------|
| `SourceFetchSettings.tsx` | `institutionalNote` paragraph (Unpaywall ≠ paywall) | Keep the 1-line warning, add "Learn more → /docs/troubleshooting". Optional — it's already terse. |
| `AboutModal.tsx` | 3 short bullets | Fine as-is. Optionally add a "Documentation → /docs" link. |
| `LocalModelsSettings.tsx` | Already has a "Setup guide" link button that opens the modal | **No change** — automatically benefits from the shorter modal. The `subtitle` stays. |

**Effort:** small. ~1 file rewrite + i18n key additions. Blast radius: contained to one modal.

**Acceptance.**
- [x] Modal shows intro + HF links + "Full setup guide" + existing actions; no runner walkthrough.
- [x] Guide link is locale-aware (`/en/` vs `/ar/`).
- [x] Opens in system browser (existing `setWindowOpenHandler` path); works in packaged build (production CSP).
- [x] AR layout is RTL-correct; existing `dir` attribute handling unchanged.
- [x] "Open Settings" still routes to the Local Models tab.
- [x] No duplicated content between modal and `/docs/sanad-setup`.

---

## P1 — High-ROI engine/UX (recommended next)

These were identified in the cross-repo review and confirmed by the 2026-06-28 smoke sign-off. Listed here as the next batch after P0 ships.

### 3. Wire OA PDFs into grounding ("Masdar-lite")

`use-manuscript-audit.ts:399` sets `kind: 'pdf_pending'` for OA PDFs and `evaluateCiteSite` immediately returns *"PDF-to-text grounding not enabled yet."* Every OA **PDF** is fetched then thrown away. `pdfjs-dist` is already a dependency; `extractManuscriptFromPdf` already exists for ingest. Route the OA PDF bytes through pdf.js and treat as `kind: 'full_text'` (coverage `full_text_oa_unpaywall`). Biggest quality win; advances the Masdar Phase-3b stub without institutional-access work. **Acceptance:** OA-PDF references produce real L3 verdicts + quotes; new test mirroring `grounding-llm.test.ts`.

### 4. Incremental N/M audit progress

`setReport(report)` fires once at the end (`use-manuscript-audit.ts:284`). On the 76-cite smoke corpus the cited-sources table is blank for minutes. Add `appendFinding()` to the store, push each `CitationFinding` as it completes, render an `N / M` chip next to the phase label. The 2026-06-28 sign-off explicitly lists this as P1 operator pain. **Acceptance:** table populates incrementally; chip shows `processed/total`; cancel still aborts cleanly.

**Shipped in 1.2.0** — see **#4b** for loop-panel refinement (**1.2.1**).

### 4b. Audit in-progress panel (loop UX refinement)

**Problem.** **1.2.0 #4** fills the cited-sources table and auto-opens `LoopAuditDetail` while the audit is still running. On long manuscripts (50+ refs) the right panel shows partial verdicts ("Insufficient evidence", passage grounding) that read like final results and feel static/jumpy as rows append.

**Design (option 2 — table grows, detail locked).** While `running`:

- Keep **incremental table** — rows and passage-status dots append as each reference completes; `N / M` + phase stay on the left bar and status bar.
- **Hide `LoopAuditDetail`** until `step === 'done'` (no drill-down mid-run).
- **Disable auto-select** of `findings[0]` during the run; select first row only when the audit completes (or when the user clicks a row after done).
- Right panel header: short honest copy + current phase (no fake percentage). Optional muted progress affordance; honor `prefers-reduced-motion`.

**Ship:** **Shipped in 1.2.1** (pairs with #4c, #8, icon I2; #5–6 deferred) · **Effort:** small · **Blast radius:** `OuroborosLoopWorkspace.tsx`, `ouroboros-loop-store` selection effect, i18n `loop.auditInProgress*`

**Acceptance.**
- [x] During audit: table grows; detail pane shows in-progress message only (not verdict cards).
- [x] After audit: full table + detail behave as today.
- [x] No auto-open of first finding while `running`; cancel leaves UI consistent.
- [x] EN + AR strings; no training/corpus copy.

### 4c. DOI↔title conflict — manual-only resolution (Bibliography / Raqim)

**Problem (operator report, 2026-07-13).** After **Verify references**, the yellow **Title does not match this DOI** panel (`MismatchResolutionActions`) should stay until the user clicks **Find DOI for title** or **Use DOI's title**. Instead:

1. **Verify** can silently patch row fields from the **wrong** registry record (year, journal, volume, pages) while the title warning is still visible; title may auto-overwrite when `_original` is missing (guard in `apply-mismatches.ts` only checks `_original`, not `title` / `userValue` like `isDoiTitleConflict`).
2. **Predatory list sync** (`subscribePredatoryList` → `refreshDerivedCitationState`) clears `verificationMismatches` seconds later — panel vanishes while the user is still reading issues (feels like a timer).
3. **Autocorrect** auto-runs `resolveDoiForTitle` on every DOI conflict without button click (`use-citation-engine.ts` `runAutocorrect`).

**Design — no automatic resolution for identity conflicts.**

- **Verify:** partition mismatches by `isDoiTitleConflict`; for conflict rows, do **not** auto-apply *any* registry patch (title or other fields) until explicit user choice. Align `applyVerificationMismatches` title guard with `isDoiTitleConflict` anchor (`_original || title || userValue`).
- **Autocorrect:** remove the `doiConflicts` → `resolveDoiForTitle` loop; keep manual actions on the yellow panel only.
- **State:** `refreshDerivedCitationState` must not wipe `verificationMismatches` / `registryLayerByCitationId` on predatory-list refresh, undo, or duplicate merge unless the citation row is removed or the user resolves the conflict.
- **Optional later:** blocking modal for unresolved DOI conflicts before export/audit bridge (out of scope unless requested).

**Ship:** **Shipped in 1.2.1** (Bibliography trust; pairs with #4b loop progress) · **Effort:** small–medium · **Blast radius:** `verify-and-apply.ts`, `apply-mismatches.ts`, `use-citation-engine.ts`, `citation-store.ts`, tests (`apply-mismatches-title-guard`, new predatory-sync / autocorrect guard tests)

**Acceptance.**
- [x] After Verify on wrong-DOI row (Alshakka smoke case): yellow panel persists; row fields unchanged until user clicks a button.
- [x] Predatory list load / weekly check does not clear pending mismatch panels.
- [x] Autocorrect does not change DOI on conflict rows without explicit **Keep my title — find correct DOI**.
- [x] **Keep this DOI — update title** still works via button; cosmetic title patches (non-conflict) unchanged.
- [x] Unit tests cover `_original`-missing rows and predatory subscribe race.

### 5. Per-reference source PDF attach

**Ship:** **1.2.5 Masdar attach**, after Raqim Repair. The website itself documents this as a planned Masdar feature. Minimal version: on a selected `CitationFinding`, "Attach source PDF" → file picker → pdf.js extract → re-ground just that reference. Closes "Sanad without manual copy-paste" for the common case where the user has the PDF locally. Needs `runAudit` to accept an optional single-`bibKey` filter (small refactor). **Acceptance:** attach a local PDF → that finding's L3 updates from abstract-only/skipped to full-text grounded.

### 6. Per-claim quote-verification chip

**Ship:** **1.2.3 Quote chip** (with #15 header wordmark). The engine already validates quotes deterministically (`grounding-llm.ts` `findInvalidSourceQuotes`) but `LoopAuditDetail` folds the warning into the top-level layer reasons where it's easy to miss. Render a small amber chip on the offending claim row. Builds trust — shows the AI is checked, not trusted. **Acceptance:** a claim whose `sourceQuotes` fail substring verification shows an inline "quote not found" marker.

### 7. Bounded concurrency in the audit loop

**Ship:** **1.2.2 Throughput**. The entry loop (`use-manuscript-audit.ts`) and cite-site loop are fully sequential. A bounded pool (3–4 in flight, configurable) cuts wall-clock substantially and pairs with #4's progress UI. **Caveat:** keep concurrency modest to respect Crossref/PubMed rate limits — that's the only real constraint. **Acceptance:** audit wall-clock drops on a 50+ cite manuscript; no registry rate-limit errors; abort still works.

### 8. Navigation + shortcuts

**Ship:** **Shipped in 1.2.1** (without re-audit — that pairs with deferred #5).

- **Ctrl/Cmd+Enter** in the manuscript textarea → run audit.
- **Copy evidence** per finding → passage window + excerpt + verbatim quotes as markdown/text for notes.
- **Jump to Bibliography** per finding → scroll to `manuscript-ref:{bibKey}` row.
- **Re-audit this reference** — deferred with #5 (needs single-`bibKey` audit).

**Acceptance:** [x] Shortcuts are documented in website `shortcuts.mdx` and `HOW_TO_GUIDE.md`; shipped actions have toast feedback (#1). Re-audit remains scoped to #5.

### 13. Icon system (Lucide via react-icons)

**Problem.** Severity markers use unicode glyphs (`●` `▲` `ℹ`) in `IssuePanel` / `OutputPanel`; `TargetSelector` has a one-off inline SVG close. No shared sizing, RTL, or a11y pattern. Toolbar and toasts are text-only where compact affordances would help (#8 shortcuts batch).

**Design.** Add `react-icons` with **Lucide only** (`react-icons/lu`). Thin `Icon` wrapper: `currentColor`, fixed sizes (12/14/16px), `aria-hidden` when adjacent label exists. **DESIGN.md bans apply:** no icon tiles above section titles, no decorative card grids; verdict chips keep text labels.

| Phase | Scope | Ship |
|-------|-------|------|
| **I0** | dependency + wrapper + import rule | **1.2.0** — done |
| **I1** | replace ●▲ℹ + `TargetSelector` SVG | **1.2.0** — done |
| **I2** | toasts, dropdown chevron, network, external links, toolbar icons | **1.2.1** — done |

**Effort:** small (I0/I1) + medium (I2). Blast radius: low if Lucide-only discipline holds.

**Acceptance.**
- [x] Only `react-icons/lu` imports in renderer (lint or review gate).
- [x] Issue severity icons consistent size/color in EN + AR RTL layouts.
- [x] Icon-only controls have `aria-label` + existing `Tooltip` where applicable.
- [x] No new items from DESIGN.md **Absolute bans** (icon tiles, hero grids).

---

### 14. Raqim Repair — resolver & parser hardening (R1)

**Problem.** Bibliography **Verify** / **Autocorrect** flags are often correct, but repair is incomplete: PMCID-only refs skip L1 verify; arXiv and OUP URLs miss DOI extraction; Vancouver initials (`E. R., et al.`) mis-parse as titles; conference chapters get journal-volume APA warnings; software heuristics false-fire on journal titles mentioning "software."

**Design.** Deterministic engine work under **Raqim** + **Tasnif** + `plain-text` parser. Extends L1 multi-registry fallback (shipped 1.1.2); does not require Sanad training.

| Fix | Acceptance |
|-----|------------|
| **PMCID in L1 `resolveRegistry`** | PMC URL / `PMCID` field → `pmcidToPmid` → PubMed resolve in **verify**, not only enhance |
| **arXiv URL → DOI** | `arxiv.org/abs/{id}` → `10.48550/arXiv.{id}` (DataCite), symmetric with bioRxiv/medRxiv |
| **OUP `article-abstract`** | `academic.oup.com/.../article-abstract/...` yields DOI via URL helper or meta fetch |
| **Springer chapter + type** | `link.springer.com/chapter/` in journal hosts; Crossref `book-chapter` reclass; LNCS volume from registry |
| **DeLong-class parser** | `DeLong, E. R., et al.` does not produce title `R., et al`; PMID 3203132 repair fills title + authors |
| **Software false-positive** | JAMIA scoping-review titles with "open-source software" stay `article-journal` |
| **Genre-aware APA** | preprints / chapters / reports do not get `apa-volume-required` meant for journal articles |
| **Kaggle datasets** *(stretch)* | dataset refs with Kaggle publisher → URL lookup when no DOI |

**Ship:** **1.2.4**, before Masdar attach · **Effort:** medium · **Blast radius:** `src/engine/manuscript/verify.ts`, `autocorrect/enhance.ts`, `parser/plain-text.ts`, `resolver/*`, `validator/rules/`

**Regression fixtures:** operator manuscript cases documented in NassilaT `OUROBOROS_OPERATOR_MAP.md` § Raqim track.

---

### 14b. Raqim Resolve — repair panel & gray-lit hosts (R2–R3)

**Problem.** When L1 fails or metadata is garbled (Gemma report, wrong Nature/npj parse), the app shows pass/fail only — no ranked alternatives and no structured manual override path.

**Design.** Bibliography-row **repair panel** with two paths:

1. **Suggested matches** — ranked registry (and host) candidates on L1 fail / low confidence; optional manuscript-context boost (stretch → 1.3.0).
2. **Manual lookup key** — user types or pastes **title**, **DOI**, **PMID**, **PMCID**, or **URL** → **Verify** / **Autocorrect** on that row only.

**Gray-lit hosts (ML/AI audience):**

- **Hugging Face Hub** — search models/datasets for report/software cites (e.g. Gemma); label **Model card** vs **Report**; on-demand network.
- **Kaggle** — dataset URL lookup; manual-add prompt when not found.

**Ship:** **1.2.6** · **Effort:** medium–large (engine + Bibliography UI) · **Blast radius:** Raqim renderer panels, new resolver modules, IPC unchanged unless new host IPC needed

**Acceptance.**
- [ ] Unresolved row shows ≥1 suggested match when OpenAlex/Crossref/HF return near-misses (threshold documented in code).
- [ ] User can paste a DOI or PubMed URL and re-run Verify/Autocorrect without re-importing the whole bibliography.
- [ ] Gemma-class report cites can surface HF model-card suggestions; user picks before apply (no silent auto-fill).
- [ ] EN + AR strings for repair panel; no training/corpus copy in UI.

---

### 16. Qwen3.5 thinking traces — app-native handling (Sanad grounding)

**Problem.** The Qwen3.5 Sanad GGUFs (4B S15-class, 9B FT-5) embed a thinking chat template; with the default template in LM Studio / llama.cpp / Ollama the model emits ` thinking\n<reasoning>\n response\n\n<json>` text traces. Thinking-leak historically cut parse accuracy (75% vs 94% in eval), and today it forces users to configure a no-thinking template (CLI flag / LM Studio custom paste) just to use Passage grounding — LM Studio has no per-request control.

**Design.** Make the app tolerant of thinking traces, no server config needed, and ship the at-source fix:

- **A. Response stripper:** new `stripQwenThinkingTraces(raw)` in `src/engine/manuscript/grounding-json-repair.ts`, invoked as **first step** of `repairGroundingJsonText`: removes a leading `thinking\n … \n response\n\n` block (anchored to the ` response\n\n` marker line) plus a `<|start_thinking|>` variant as defense; **fires only when markers are present**, so clean output passes untouched. One code path fixes both 4B-class and 9B (same Qwen3.5 template family).
- **B. Token budget:** `src/main/ipc-llm.ts` — add `max_tokens: 2048` for Sanad models (thinking burns token budget → mid-JSON truncation).
- **C. No-thinking template on the web:** the `--chat-template-file` template (byte-identical to the NassilaT box publish kit) lives in the [Sanad setup guide](https://nassila-web.vercel.app/en/docs/sanad-setup) (llama.cpp tab). In `LocalModelsSettings.tsx`, the **Custom** provider preset shows a **"Sanad setup guide"** link pointing there. (An earlier draft bundled the jinja via `extraResources` + an in-app `SanadQwenTemplateCard`; removed to keep the app surface precious and short.)

**Effort:** small–medium. New helper + pipeline step + request-builder field + one settings card. **Blast radius:** grounding parse path, LLM request builder, `LocalModelsSettings` (additive; shared by every runner).

**Ship:** **1.8.0 Sanad 9B** (model-critical — 9B full-text ship depends on tolerant parsing). ✅ **Shipped 2026-08-13.**

**Acceptance.**
- [x] Thinking-wrapped JSON (with braces/quotes inside the reasoning) parses identically to clean JSON; clean output is byte-pass-through.
- [x] Truncated-JSON case behaves as today (repair still fails gracefully, no crash).
- [x] LM Studio + default-template 9B GGUF produces grounded verdicts with **no** user config (no-thinking template not applied).
- [x] Custom preset in Local Models shows the Sanad setup guide link; the no-thinking template renders inline on the nassila-web llama.cpp tab (EN/AR), replacing the earlier bundled-card approach.
- [x] Unit tests in `tests/unit/grounding-json-repair.test.ts`: thinking-wrapped, `<|start_thinking|>` variant, clean passthrough, 4B-format trace.

### 17. Sanad single tier — 4B/12B retired, 9B FT-6 on Hub

**Problem.** 4B (S15) and 12B (S14) are retired — both are abstract-only trains; the 9B grounding model (`nassila-sanad-9b`, 6 default + 6 MTP quants) is the sole Sanad tier. **Hub weights are FT-6 (v119)** as of 2026-08-21.

**Design.** Registry + defaults rework (9B single tier; 4B/12B removed from presets/links/UI; E4B stays legacy):

| File | Change |
|---|---|
| `src/shared/nassila-agent-tasks.ts` | drop `sanad4b` + `groundingE4bV1` alias; mark `sanad12b` deprecated; add `sanad9b: 'nassila-sanad-9b'`; task-map entry |
| `src/renderer/utils/llm-config-utils.ts` | `SanadTier = '9b'`; `sanadTierFromModel` → `'9b'`; `modelForSanadTier` → sanad9b; `isNassilaSanadModel` = 9b (12b/E4b legacy) |
| `src/renderer/settings/llm-presets.ts` | hints = [sanad9b] |
| `src/shared/sanad-setup-links.ts` | `SANAD_HF_9B_URL`, `OLLAMA_HF_PULL_9B`, `SANAD_DEFAULT_MODEL_ID` = sanad9b; drop 4B/12B variants + `SANAD_QUALITY_MODEL_ID` |
| `SanadSetupModal.tsx` | 4B/12B HF links → single 9B link — model displays as **Sanad 9B**, linking the HF repo where the user picks their quant (6 GGUFs Q2_K–Q8_0) (+ i18n key swap) |
| `ManuscriptSanadBar.tsx:155`, `LocalModelsSettings.tsx` | single 9B chip (tier array `(['9b'])`) |
| `manuscript-audit-store.ts:94`, `use-manuscript-audit-prefs-sync.ts:59` | default model = sanad9b |

**Effort:** small–medium. **Blast radius:** shared registry constants, tier UI, defaults, tests. Stored user ids referencing the retired ids simply fall out of the Sanad registry (grounding still works — registry only drives UI/presets).

**Ship:** **1.8.0 Sanad 9B** (with #16). ✅ **Shipped 2026-08-13.**

**Acceptance.**
- [x] Fresh install default selectable Sanad model = `nassila-sanad-9b`; tier chip shows 9B only.
- [x] `sanad-setup-prompt.test.ts` / `sharh-lite-panel.test.tsx` / `manuscript-audit-contract.test.ts` updated green.
- [x] EN + AR copy updated (no training/corpus wording); `sanadSetup.models.4b` / `.12b` retired.
- [x] Doc-refresh batch in same PR: `README.md`, `BRAND.md`, `DESIGN.md`, `PRODUCT.md`, `USER_GUIDE.md`, `TRAINING.md`, `OUROBOROS.md`, `OUROBOROS_CONTEXT.md`, `Nassila-Ouroboros-Future.md`, `WEBPAGE_ROADMAP.md`, `AR_I18N_GLOSSARY.md` — Sanad references moved to sole `nassila-sanad-9b` (FT-5); 4B S15 / 12B S14 marked retired.

### 18. Wayback availability-gated archive links

**Problem.** Every URL row shows an unconditional `[Wayback ↗]` link (`OutputPanel.tsx`); `RaqimResolvePanel` also hand-rolls archive URLs and can pass a `doi.org` URL instead of the page URL. Users click through to empty archive searches when no snapshot exists.

**Design.**

- **Delete** the unconditional Wayback link from every URL row in `OutputPanel.tsx`.
- **Keep** the "Wayback archive ↗" button in `RaqimResolvePanel` but **gate** it: on panel open, main process queries the Wayback availability API (`archive.org/wayback/available?url=…` via `fetchWithPolicy` — production CSP requires main, like other registry IPC).
- **New IPC** `registry:checkWaybackAvailability` in `ipc-registry.ts` + preload + `ipc-policy.ts` inventory + validation test.
- **Reuse/fix** `buildWaybackUrl()` in `webpage-metadata.ts` (or equivalent) — single canonical helper; fix DOI-as-target bug in Resolve.
- If a snapshot exists → render button linking **directly to the snapshot** (`web.archive.org/web/<timestamp>/<url>`); if not → **do not render** the button ("show nothing").
- New `queryWaybackSnapshot()` in `webpage-metadata.ts`; update its tests + new availability tests (mocked fetch).

**Effort:** small–medium. **Blast radius:** `OutputPanel`, `RaqimResolvePanel`, main registry IPC, preload, i18n (remove hardcoded `[Wayback ↗]` English).

**Ship:** **1.10.0 Masdar Papers**

**Acceptance.**
- [x] No unconditional Wayback link on bibliography URL rows.
- [x] Resolve panel shows archive button only when availability API returns a snapshot; link goes to snapshot URL, not `web/*/`.
- [x] Availability check runs in main process; IPC registered in policy inventory with validation test (`registry:checkWaybackAvailability`, `tests/unit/ipc-policy.test.ts` self-scan).
- [x] `buildWaybackUrl` is the single URL builder (no third copy); DOI rows use page URL for archive lookup when URL field is present.
- [x] EN + AR strings for archive affordance (existing `raqimResolve.waybackArchive` key reused — no new copy needed).

✅ **Implemented 2026-08-22** — `queryWaybackSnapshot` in `webpage-metadata.ts`; panel gating covered in `tests/unit/raqim-resolve-panel.test.tsx`; API tests in `tests/unit/webpage-metadata.test.ts`.

### 19. Papers dedupe + folder-scan PDF attach

**Problem.** Duplicate bibliography entries (same paper under different keys) inflate audit work and split cite sites. Attaching PDFs one-by-one per finding is slow when the user has a folder of source PDFs.

**Design.**

- **Dedupe:** new pure `dedupeBibEntries()` in `mapping.ts` — merge by normalized DOI, else normalized title **+ year**; title-only matches → **ambiguous** (not auto-merged); emits number→canonicalKey aliases so ranges/numbers still map. Applied in `prepareAudit` (`audit-runner.ts`) for both manuscript-References and bibliography-library sources.
- **Folder scan:** new IPC `papers:scanFolder` — main-process folder dialog, recursive `*.pdf` scan under chosen root only (SEC-01 allow-list, no renderer-supplied paths, count/size caps); registered in `ipc-handlers.ts`, preload, `ipc-policy.ts`, with validation tests.
- **Matcher:** `src/engine/papers/match.ts` — per PDF, DOI from first-page text (pdf.js) + filename heuristics, title from first page; match to findings by DOI exact → title normalized → unmatched/ambiguous.
- **UI:** "Attach papers…" button in Sources panel header (`LoopSourcesPanel`) → folder picker → scan + match → review list (matched ✓ / unmatched / ambiguous) → confirm → existing `attachSourcePdf` per matched bibKey → re-audit. **Attach review restricted to mapped findings** (unmapped keys re-audit nothing).
- **Contract:** extend `bibKeyFilter` to `string[]` in `manuscript-audit-contract.ts` (+ sanitizer with per-item and array length caps + tests) so one run re-grounds only attached refs.
- Per-finding "Attach PDF" in `LoopAuditDetail` stays.

**Effort:** medium. **Blast radius:** `mapping.ts`, `audit-runner.ts`, new `papers/` engine module, IPC, loop Sources UI, audit contract.

**Ship:** **1.10.0 Masdar Papers**

**Acceptance.**
- [x] Same paper under `[3]` and `[18]` (same DOI or title+year) → 1 finding after dedupe; citeSites from both numbers preserved via aliases.
- [x] Title-only match without year → ambiguous bucket, not silent merge.
- [x] Folder scan returns matched/unmatched/ambiguous review list; confirm attaches only matched **mapped** bibKeys.
- [x] Re-audit with `bibKeyFilter: string[]` re-grounds only selected refs; existing findings for other keys preserved (legacy single-string filters normalize to `[string]`).
- [x] IPC + contract changes have matching validation tests (`papers-scan-match.test.ts`, `manuscript-audit-contract.test.ts`, `ipc-policy.test.ts`).
- [x] EN + AR strings added (`loop.attachPapers*`, `loop.papers*`, `sharhLite.dedupeSummary`) — Arabic wording pending glossary review.

✅ **Implemented 2026-08-22** — `dedupeBibEntries`/`applyDedupeAliases` in `mapping.ts`, wired in `prepareAudit`; `papers:scanFolder` + `papers:identify` in `ipc-handlers.ts`; `engine/papers/{scan,match}.ts`; LoopSourcesPanel review flow.

### 20. Raqim Resolve: URL/title lookup fixes

**Problem.** Two shipped defects made Resolve appear to work "only with DOI": (a) any URL row short-circuited to a grey-web catalogue stub because the stub's fallthrough always produced a candidate, so the registry title fallback never ran — paper landing pages returned a junk "webpage — /path" card at 0.82 confidence; (b) non-exact title candidates scored `0.62 × similarity` against the 0.42 threshold, requiring ≥0.68 token overlap just to appear — correct papers with subtitle/punctuation variants were silently dropped. Additionally the panel auto-copied only the title into the key box and Verify-row searched identifiers invisibly to the user.

**Design.**
- Remove `buildGreyWebPageItem` from `resolveHostUrl`; recognized hosts keep their exact candidates. The URL branch always runs `titleRegistryCandidates` when a usable title exists (legislation URLs excepted), and the grey-web stub becomes a last resort appended only when nothing matched.
- Non-exact base → `min(0.8, 0.24 + 0.58 × similarity)`; threshold stays `RAQIM_CANDIDATE_THRESHOLD = 0.42`; bonuses/penalties unchanged; exact DOI/PMID paths unaffected.
- Panel prefill parity: kind switch copies the row's matching field into the key box unless the user edited it; Verify-row syncs kind+key via the engine's DOI→PMID→PMCID→URL→title chain.

**Effort:** small–medium. **Blast radius:** `raqim-resolve.ts`, `RaqimResolvePanel.tsx`, tests.

**Ship:** **1.10.0 Masdar Papers**

**Acceptance.**
- [x] Paper landing-page URL + real title → registry candidates returned; no grey stub present.
- [x] URL-only row with no matches anywhere → grey stub still returned (1.5.0 parity).
- [x] ~0.55+ similarity titles clear the threshold; ≤~0.3 garbage stays filtered; non-exact base capped at 0.8 before bonuses.
- [x] Kind-switch prefill per field; dirty input never clobbered; verify-sync shows the identifier actually searched.
- [x] Tests: `tests/unit/raqim-url-title-fallback.test.ts` + `tests/unit/raqim-resolve-panel.test.tsx`.

✅ **Implemented 2026-08-22.**

### 21. Packaged network parity — renderer fetch → main IPC

**Problem.** Production CSP is `connect-src 'self'` (SEC hardening, 1.1.x): the packaged renderer can only reach the network through IPC. Four user-facing paths still called network-bound engine functions directly from the renderer and **silently did nothing in installed builds** (dev worked, masking them):

1. **"Keep my title — find correct DOI"** (`resolveDoiForTitle` → Crossref/PubMed/OpenAlex) — reported via the DOI↔title conflict buttons.
2. **DOI lookup** — row action + "Find Missing DOIs" menu (`enhanceCitationsOnline`).
3. **Autocorrect's online step** (`enhanceCitationsOnline` over the whole library).
4. **Input-bar "Resolve"** (`resolveIdentifier`/`batchResolve`).

**Design.**
- Keep-my-title: registry search via the existing `registry:lookupRaqimCandidates` IPC (main, ranked by the #20-tuned scorer); new pure core `resolveDoiFromCandidates` in `enhance.ts` ports the guards (same-DOI short-circuit, ≥0.6 title similarity, fill-missing via exported `mergeFields`). Semantics preserved: title is the trusted anchor, the replacement DOI must belong to it.
- New `registry:enhanceCitations` IPC: `sanitizeCitations` + `MAX_VERIFICATION_ITEMS` cap → `enhanceCitationsOnline` in main. Used by DOI lookup and the autocorrect online step (abort callback can't cross IPC; post-call empty-library guard covers it).
- New `registry:resolveIdentifiers` IPC: trimmed string inputs (200×500 caps) → `batchResolve` in main.
- Renderer call sites use IPC when `window.api` exposes it; direct engine paths remain as dev fallbacks (pattern parity with `registry:verifyUnified`).
- **Guard:** `tests/unit/renderer-network-boundary.test.ts` fails CI if renderer code imports network-bound engine modules (`engine/resolver`, `autocorrect/enhance`, `network/http`) outside the guarded fallback site — this bug class cannot be silently reintroduced.
- Sweep fix: predatory "Update list" banner button now toasts failure instead of ignoring it.

**Effort:** medium. **Blast radius:** `use-citation-engine.ts`, `enhance.ts` (exports), `ipc-registry.ts`, preload, `ipc-policy.ts`, `IssuePanel.tsx`, tests.

**Ship:** **1.10.1** ✅ **Shipped 2026-08-23.**

**Acceptance.**
- [x] Keep-my-title swaps the DOI in the packaged app; same-DOI and low-similarity candidates rejected (unit-tested via `resolveDoiFromCandidates`).
- [x] DOI lookup + autocorrect online step + input-bar Resolve all run in main; renderer falls back to engine paths only when `window.api` is absent.
- [x] New IPCs registered in the policy inventory (self-scanning test) with input caps.
- [x] Boundary guard test green; only `use-citation-engine.ts` may import network-bound engine modules.
- [x] Predatory Update-list failure shows a toast (EN/AR).

---

### 22. 2.0.0 MaktabOCR + Shahid — مكتب OCR + شاهد (freeze contract)

**Problem.** Abstract-only grounding and Latin OCR leave scanned Arabic PDFs and table/figure claims outside a reviewable evidence chain. Shahid never shipped in **1.8.0** (Sanad 9B only); it stays gated with MaktabOCR to **2.0.0**. Users need honest ingest → attach → ground → evidence → export in the existing **loop vs bibliography** IA (old seven-worker navigation is gone), without fake progress or implying Arabic L3 is validated (**FT-7 → 2.1.0**).

**Design — one executable contract.**

#### User journey

1. Open **Manuscript** (default) or **Bibliography**.
2. Upload / import manuscript (**Maktab**): native pdf-inspector classifies pages; selective OCR where needed; pretrained Arabic adapter for Arabic scans; DOCX via bounded anydoc parity; low-confidence pages → `needsReview`.
3. Attach / resolve cited sources (**Masdar**): OA fetch, folder scan, or local PDF; grey-lit CSL suggestions remain **confirm-before-apply**.
4. Run audit (**Sanad** FT-6/v119): claim verdicts + quote validity are primary; coverage and guardrails visible; finding-pill color is a rollup, not the model gate.
5. Review table/figure evidence (**Shahid**) when available: region, page, caption/cell, confidence, abstention — stage stays non-`live` until both gates pass.
6. Explain / export: deterministic Sharh + citeproc; only accepted fields leave the session.

#### Process boundaries

| Layer | Owns | Must not |
|-------|------|----------|
| **Renderer** | Loop UX, review UI, confirm/reject | Node FS, OCR natives, network, model weights |
| **Preload** | Validated `window.api` surface | Broad Node exposure |
| **Main** | Native `@firecrawl/pdf-inspector`, anydoc, OCR model paths, IPC caps, cancellation | Trust unvalidated renderer paths |
| **Engine** | Contracts, quote guards, CSL, audit orchestration | Bundle native OCR DLLs in renderer |
| **NassilaT** | Frozen eval suites, contamination, GO/NO-GO memo | Drive app UX copy from train scores |

#### Data contracts (lock before implementation)

**Maktab OCR output** (per page / artifact): page text; layout regions; language; confidence + review flag; source hash; page locator; engine provenance (inspector / fallback / Arabic adapter revision).

**Shahid evidence** (per claim/cite site): claim ↔ cite-site linkage; table or figure region; page; caption/cell evidence; extraction method; confidence; review state (`supported` evidence / `needs-review` / abstain). Failure → honest **unsupported** / **needs-review**; never auto-accept or fake progress.

#### Performance / package budgets (frozen 2026-09-06 for 2.0.0 GO)

| Budget | Measured Value |
|--------|----------------|
| Installer size (1.10.1 baseline / NSIS) | **~158.97 MB** (166,692,148 bytes, SHA256: `2DE182E2EA95A0BE83F1BD066A85895EFDF28A7A8FC37D22AFE97BB47D738ABD`); +5.59 MB vs 1.10.0 (160.83 MB) |
| Unpacked executable (`Nassila.exe`) | **~213.73 MB** (224,107,520 bytes) |
| Main app archive (`app.asar`) | **~153.42 MB** (160,874,594 bytes) |
| Bundled Tesseract langpacks (`eng` + `fra`) | **5.00 MB** (5,243,453 bytes) under `resources/tesseract/` |
| First-run assets (offline model cache) | PP-OCRv6 Small: ~31 MB uncompressed (`resources/pdf-inspector/pp-ocrv6-small/`); runtime DLLs: ~250–350 MB optional operator runtime |
| CPU / GPU / RAM (Windows x64 workstation) | Min 4 GB RAM (8 GB recommended); 64-bit dual-core CPU; 0 GPU / CUDA required (zero local model inference on client) |
| Per-page latency (native text vs OCR page) | Native text: 15–40 ms/page; WASM fallback: 30–80 ms/page; Tesseract OCR: 800–1800 ms/page; Arabic adapter: 350–700 ms/page |
| Extraction / source-artifact cache limits | Max 500 entries / 100 MB on disk under `%APPDATA%/…/source-artifacts/`, keyed by `sha256(file) + page + dpi + lang` |
| Supported Windows hardware | Windows 10/11 x64; Electron N-API load of pinned natives (`@firecrawl/pdf-inspector-win32-x64-msvc`, `@firecrawl/anydoc-win32-x64-msvc`) |

#### Security limits

- On-device OCR/model/file work by default; path pinning; request caps; cancellation; SEC-aligned IPC inventory.
- No manuscript text/images in OS notifications or logs.
- Pin Firecrawl natives + OCR artifacts by version + checksum; inventory transitive licenses (MIT top-level ≠ full OCR stack).
- Model / OCR output advisory + schema-validated; threat-model prompt injection via PDF/image.

#### Test matrix

| Layer | Coverage |
|-------|----------|
| Engine / contracts | Schema parse, locators, cache v2+, low-confidence, grey-lit confirm/reject/undo |
| Extraction / OCR | PDF + DOCX parity; Arabic/mixed/scan goldens; packaged Windows native probe |
| Shahid | Native PDF + scan fixtures; negative/abstention; cite-site linkage; export provenance |
| Boundaries | New IPC policy, preload exposure, renderer network boundary, caps |
| Full app | `npm test` / lint / typecheck / build / unpack / clean-machine offline smoke |
| NassilaT | Contamination; Tier 3 retrieval / gold-excerpt / e2e; separate multimodal Shahid holdout; signed memo |

**Eval gates (NassilaT canonical):** three Tier 3 suites — retrieval, gold-excerpt grounding, e2e product. Quote **≥98%** e2e; report retrieval separately; bar **false-supported** and **false-contradicted**; score **claim verdicts** separately from finding-pill color. Aug 27 field-audit sidecar is **diagnostic-only**, not the 100-doc product gate. Shahid: pilot → lock bars → frozen multimodal holdout. See [`PHASE3_TIER3_GROUNDWORK.md`](../../NassilaT/training/PHASE3_TIER3_GROUNDWORK.md), [`TIER3_EVAL_SUITES.md`](../../NassilaT/training/TIER3_EVAL_SUITES.md), [`EVAL_GONOGO.md`](../../NassilaT/training/EVAL_GONOGO.md). **Operator runbooks:** [`2.0_OPERATOR_INDEX.md`](../../NassilaT/training/2.0_OPERATOR_INDEX.md).

#### GO / NO-GO owners

| Gate | Owner | Artifact |
|------|-------|----------|
| App ship readiness (IPC, packaging, UX honesty, installer smoke) | **Product (Nassila)** | `STATE.md` + CHANGELOG cut only after GO |
| Tier 3 + multimodal eval (contamination, holdouts, bars) | **Training (NassilaT)** | Signed [`EVAL_GONOGO_TIER3_MEMO.md`](../../NassilaT/training/EVAL_GONOGO_TIER3_MEMO.md) |
| Public EN/AR facts (roadmap, changelog, download metadata) | **Docs (nassila-web)** | Release-train + changelog sync after app+training GO |

**Hard rule:** no `package.json` 2.0.0 bump, Shahid `live`, or public launch copy until **both** Tier 3 full-text and multimodal Shahid gates pass. Failed gate → remediation + fresh/predeclared holdout — do not weaken the milestone.

**OCR strategy (locked):** Firecrawl-first — native `@firecrawl/pdf-inspector` + selective OCR; Arabic gap closed with a **pretrained Arabic recognizer adapter** (not custom OCR train by default; not “vision/LLM OCR” as primary framing). **FT-7 Arabic L3** stays **2.1.0**.

**Effort:** large (cross-repo). **Blast radius:** `src/engine/maktab/`, manuscript audit, main/preload IPC, packaging, NassilaT eval, nassila-web docs. **Ship:** **2.0.0** — gated; not version-bumped until GO.

**Acceptance.**
- [x] FEATURES / Future / STATE / CONTEXT / PRODUCT / operator map agree: **1.10.1 shipped**; next cut **2.0.0**; Shahid not in 1.8; loop vs bibliography only; Sanad **9B FT-6/v119** sole tier.
- [x] Maktab + Shahid contracts implemented end-to-end with honest failure states.
- [x] Resource budgets filled with measured numbers before GO (installer ~158.97 MB, unpacked ~213.73 MB, langpacks 5.00 MB).
- [x] Tier 3 three-suite + multimodal Shahid holdouts pass published bars; Aug 27 sidecar diagnostic only.
- [x] Packaged Windows OCR/Shahid smoke + clean-machine offline pass (verified 2026-09-06, probe:ocr exit 0, probe:ocr:golden exit 0, probe:native exit 0).
- [x] EN/AR UX strings approved before any Arabic UI edit; public site strips training internals.
- [x] Combined GO signed by product + training; docs sync follows — then and only then bump to 2.0.0.
  - **2026-09-06:** **GO 2.0.0** signed in NassilaT `training/EVAL_GONOGO_TIER3_MEMO.md` (all 5 suites PASS: Grounding PASS, Retrieval PASS, E2E PASS, Shahid Multimodal PASS, Maktab OCR PASS).

---

## P2 — Polish / when loop IA work continues

### 9. Sharh-lite plain explanations

`OUROBOROS_OPERATOR_MAP.md` flags Sharh as deterministic copy only. Small step: when Sanad already ran for a cite site, template a one-sentence summary from the structured claims ("2 of 3 claims supported; 1 contradicted on dosing") — no new LLM call, deterministic. Feels like explanations without the Sharh LLM facet.

### 10. Cancel granularity

`controller.signal.aborted` is only checked at entry boundaries (`:141`, `:205`), not mid-LLM-call. A long local grounding call can't be interrupted. If `window.api.llmChat` can accept an abort signal, thread it through so Cancel feels responsive. **Verify the IPC shape first** — may be medium effort.

### 11. In-app Help → deep-link to website

`OUROBOROS_OPERATOR_MAP.md` defers "End-user Help → full reference" until loop IA stable. It's stable now. **Don't duplicate content** — the website docs are canonical. Ship a small Help menu / "Documentation" link to the docs index and specific pages (`/docs/sanad-setup`, `/docs/verification`, `/docs/troubleshooting`). One source of truth, consistent with #2.

### 12. Public Sanad metrics on the website `local-models` page (cross-repo, optional)

The HF model cards already publish `89.27% / 92.98% / 3.81%` (E4B) and `90.43% / 100% / 2.86%` (12B). These are **not** red-lined — they're on the public HF cards. A small "Validation" table on [`nassila-web`](https://github.com/jamalesam93/nassila-web)'s `local-models` page builds trust and stays within the site's own honesty rules. Optional — the page is honest without it. **Repo:** `nassila-web`, not the app.

### 15. Header chrome — drop redundant product wordmark

**Problem.** `AppHeader` renders bold `app.productName` (“Nassila” / ناسيلا) next to the Manuscript / Bibliography switcher. The Windows title bar already shows the app icon + product name, so the in-app wordmark reads as leftover chrome (same weight as nav, no job).

**Design.** Remove the in-app product-name span. Let the mode switcher be the left anchor; keep a little leading padding so it isn’t flush to the edge. **Do not** replace it with a marketing logo lockup or header glyph — window chrome is enough identity for a workstation UI (`DESIGN.md`).

**Ship:** **1.2.3 Quote chip** (with #6) · **Effort:** tiny · **Blast radius:** `AppHeader.tsx` (+ spacing only)

**Acceptance.**
- [ ] No duplicate product name in the in-app header; title bar icon/name remain.
- [ ] Mode switcher still clear as the first chrome control in EN and AR (RTL).
- [ ] No new brand mark / logo treatment introduced in the header.

---

## Explicitly out of scope (research tracks — not small)

Do not pull these into a tweak batch outside the **2.0.0 freeze contract** (`#22`):
- **MaktabOCR + Shahid** beyond the locked 2.0 slice (full multimodal, custom OCR train) — see NassilaT `PHASE3_TIER3_GROUNDWORK.md`.
- **Institutional full-text access** / proxy / login webview — needs SEC-06 security review.
- **FT-7 Arabic L3** — **2.1.0**, not 2.0.0.

---

## Implementation order

1. **Shipped:** #1–#2 in **1.1.3**; #3–#4 + icon I0/I1 in **1.2.0**; #4b–#4c + #8 + #13 I2 in **1.2.1**.
2. **Phase 0 Trust reset** — stabilization and exit gates before any 1.2.2 implementation.
3. **P1 #7** → **1.2.2 Throughput**.
4. **P1 #6 + #15** → **1.2.3 Quote chip**.
5. **P1 #14 (R1)** → **1.2.4 Raqim Repair**.
6. **P1 #5** → **1.2.5 Masdar attach** (including single-reference re-audit).
7. **P1 #14b (R2–R3)** → **1.2.6 Raqim Resolve**.
8. **1.2.7 Projects + Help + onboarding** — local save/open/recovery, website Help links, first-run bibliography path.
9. **1.2.8 OCR O2 + a11y** — offline/bundled language packs, golden fixtures, OCR controls/provenance/cache, loop-table keyboard navigation.
10. **1.2.9 Preflight + quality ledger** — unresolved-identity gate, mapping coverage, accessibility pass, local diagnostic/quality-ledger export.
11. **P1 #9–11 remainder** → **1.3.0 Sharh-lite**.
12. **∥ NassilaT:** field-note curation / Tier 3 data; **S15 shipped** (Qwen 3.5 4B); **#17** sole 9B tier (4B/12B retired); **FT-6 Hub ship 2026-08-21**.
13. **P1 #16 + #17 → 1.8.0 Sanad 9B** — sole-tier registry + Qwen3.5 thinking handling + no-thinking template on the web. ✅ **Shipped 2026-08-13.**
14. **P1 #18 + #19 + #20 → 1.10.0 Masdar Papers** — Wayback availability gating + papers dedupe/folder attach + Raqim Resolve URL/title fixes (`Nassila-Ouroboros-Future.md` §5). ✅ **Shipped 2026-08-22** — installer `Nassila Setup 1.10.0.exe`.
15. **∥ NassilaT:** **FT-6** Hub **SHIPPED 2026-08-21** (no 1.9.0 installer); **FT-7 Arabic** → **2.1.0**.
16. **P1 #21 → 1.10.1 Packaged network parity** — Keep-my-title / DOI lookup / autocorrect online / input-Resolve through main IPC + renderer network-boundary guard. ✅ **Shipped 2026-08-23.**
17. **P1 #22 → 2.0.0 MaktabOCR + Shahid** — Firecrawl native pdf-inspector + pretrained Arabic adapter; Shahid table/figure evidence; Tier 3 + multimodal gates (see #22 freeze contract). ✅ **Shipped 2026-09-06** — installer `Nassila Setup 2.0.0.exe`.

**Red-line check before each merge:** no training/corpus/eval content surfaces in app UI or copy (see top of file).
