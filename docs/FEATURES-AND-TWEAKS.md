# Features & Tweaks — Nassila app

**Status:** 2026-06-29. Companion to [`POST_V114_MAP.md`](../../NassilaT/training/POST_V114_MAP.md) and the [website docs](https://nassila-web.vercel.app/en/docs/sanad-setup) (now canonical). Scope is the **desktop app** ([Nassila](https://github.com/jamalesam93/Nassila)). Items are grouped by priority and each has an effort, a blast radius, and acceptance checks so they can be picked off independently.

> **Version streams:** App semver (**Nassila 1.1.x**) and Sanad checkpoint **SNN** (**S12** / **S14**) are independent — see NassilaT [`POST_V114_MAP.md`](../../NassilaT/training/POST_V114_MAP.md) § App release train.

> **Red line reminder (from the website docs spec):** no training methodology, corpus, QLoRA, eval scorecards, or NassilaT internals surface in the app. All copy must stay user-facing.

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
- [ ] Run a manuscript audit, blur/minimize the window → OS notification fires on completion; stays in-app when focused.
- [ ] Verify, autocorrect, DOI find, export each show a completion toast.
- [ ] Error path (offline verify, failed export, audit error) shows a warn/error toast.
- [ ] "Notify when tasks finish" toggle in Settings disables OS notifications; in-app toasts still work.
- [ ] EN + AR toasts render RTL-correct; `prefers-reduced-motion` disables slide.
- [ ] No manuscript/reference text appears in OS notification bodies (only counts).
- [ ] Unit test: `notify-store` queue/dismiss/auto-dismiss; `use-task-notifier` fires on `step` transition.

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
- [ ] Modal shows intro + HF links + "Full setup guide" + existing actions; no runner walkthrough.
- [ ] Guide link is locale-aware (`/en/` vs `/ar/`).
- [ ] Opens in system browser (existing `setWindowOpenHandler` path); works in packaged build (production CSP).
- [ ] AR layout is RTL-correct; existing `dir` attribute handling unchanged.
- [ ] "Open Settings" still routes to the Local Models tab.
- [ ] No duplicated content between modal and `/docs/sanad-setup`.

---

## P1 — High-ROI engine/UX (recommended next)

These were identified in the cross-repo review and confirmed by the 2026-06-28 smoke sign-off. Listed here as the next batch after P0 ships.

### 3. Wire OA PDFs into grounding ("Masdar-lite")

`use-manuscript-audit.ts:399` sets `kind: 'pdf_pending'` for OA PDFs and `evaluateCiteSite` immediately returns *"PDF-to-text grounding not enabled yet."* Every OA **PDF** is fetched then thrown away. `pdfjs-dist` is already a dependency; `extractManuscriptFromPdf` already exists for ingest. Route the OA PDF bytes through pdf.js and treat as `kind: 'full_text'` (coverage `full_text_oa_unpaywall`). Biggest quality win; advances the Masdar Phase-3b stub without institutional-access work. **Acceptance:** OA-PDF references produce real L3 verdicts + quotes; new test mirroring `grounding-llm.test.ts`.

### 4. Incremental N/M audit progress

`setReport(report)` fires once at the end (`use-manuscript-audit.ts:284`). On the 76-cite smoke corpus the cited-sources table is blank for minutes. Add `appendFinding()` to the store, push each `CitationFinding` as it completes, render an `N / M` chip next to the phase label. The 2026-06-28 sign-off explicitly lists this as P1 operator pain. **Acceptance:** table populates incrementally; chip shows `processed/total`; cancel still aborts cleanly.

### 5. Per-reference source PDF attach

The website itself documents this as a planned Masdar feature. Minimal version: on a selected `CitationFinding`, "Attach source PDF" → file picker → pdf.js extract → re-ground just that reference. Closes "Sanad without manual copy-paste" for the common case where the user has the PDF locally. Needs `runAudit` to accept an optional single-`bibKey` filter (small refactor). **Acceptance:** attach a local PDF → that finding's L3 updates from abstract-only/skipped to full-text grounded.

### 6. Per-claim quote-verification chip

The engine already validates quotes deterministically (`grounding-llm.ts:204` `findInvalidSourceQuotes`) but `LoopAuditDetail.tsx:148` folds the warning into the top-level layer reasons where it's easy to miss. Render a small amber chip on the offending claim row. Builds trust — shows the AI is checked, not trusted. **Acceptance:** a claim whose `sourceQuotes` fail substring verification shows an inline "quote not found" marker.

### 7. Bounded concurrency in the audit loop

The entry loop (`use-manuscript-audit.ts:140`) and cite-site loop (`:204`) are fully sequential. A bounded pool (3–4 in flight, configurable) cuts wall-clock substantially and pairs with #4's progress UI. **Caveat:** keep concurrency modest to respect Crossref/PubMed rate limits — that's the only real constraint. **Acceptance:** audit wall-clock drops on a 50+ cite manuscript; no registry rate-limit errors; abort still works.

### 8. Navigation + shortcuts

- **Ctrl/Cmd+Enter** in the manuscript textarea → run audit (no loop binding exists today in `use-keyboard-shortcuts.ts`).
- **Copy evidence** per finding → passage window + excerpt + verbatim quotes as markdown/text for notes.
- **Jump to Bibliography** per finding → the bridge already sends refs with `manuscript-ref:N` keys; link the finding back to that row.
- **Re-audit this reference** action (pairs with #5) — avoids re-running all cites after a fix.

**Acceptance:** shortcuts documented in `shortcuts.md` (website) and `HOW_TO_GUIDE.md`; each action has a toast (#1).

---

## P2 — Polish / when loop IA work continues

### 9. Sharh-lite plain explanations

`POST_V114_MAP.md` flags Sharh as deterministic copy only. Small step: when Sanad already ran for a cite site, template a one-sentence summary from the structured claims ("2 of 3 claims supported; 1 contradicted on dosing") — no new LLM call, deterministic. Feels like explanations without the Sharh LLM facet.

### 10. Cancel granularity

`controller.signal.aborted` is only checked at entry boundaries (`:141`, `:205`), not mid-LLM-call. A long local grounding call can't be interrupted. If `window.api.llmChat` can accept an abort signal, thread it through so Cancel feels responsive. **Verify the IPC shape first** — may be medium effort.

### 11. In-app Help → deep-link to website

`POST_V114_MAP.md:132` defers "End-user Help → full reference" until loop IA stable. It's stable now. **Don't duplicate content** — the website docs are canonical. Ship a small Help menu / "Documentation" link to the docs index and specific pages (`/docs/sanad-setup`, `/docs/verification`, `/docs/troubleshooting`). One source of truth, consistent with #2.

### 12. Public Sanad metrics on the website `local-models` page (cross-repo, optional)

The HF model cards already publish `89.27% / 92.98% / 3.81%` (E4B) and `90.43% / 100% / 2.86%` (12B). These are **not** red-lined — they're on the public HF cards. A small "Validation" table on [`nassila-web`](https://github.com/jamalesam93/nassila-web)'s `local-models` page builds trust and stays within the site's own honesty rules. Optional — the page is honest without it. **Repo:** `nassila-web`, not the app.

---

## Explicitly out of scope (research tracks — not small)

Do not pull these into a tweak batch:
- **Maktab** LLM ingest facet, **Shahid** multimodal, merged `nassila-agent-e12b-v1` model (`POST_V114_MAP.md` Tier 3+).
- **Institutional full-text access** / proxy / login webview — needs SEC-06 security review.
- **v1.15+** training refinement — corpus work, lives in **NassilaT**, not the app. Next Sanad train: **S15+** (see POST_V114_MAP).

---

## Implementation order

1. **P0 #1 (notifications)** and **P0 #2 (modal shortening)** — independent, ship together as a "polish" release. Both are additive/contained and visibly improve the app.
2. **P1 #3 + #4** as one PR ("Masdar-lite + responsive audit") — both live in `use-manuscript-audit.ts`, both confirmed by the smoke sign-off.
3. **P1 #5 + #6 + #8** as a UX batch (attach/re-audit + quote chip + shortcuts/copy/jump). **#6** may ship in the 1.2.0 batch if ready (independent of #3/#4).
4. **P1 #7** (concurrency) once #4's progress UI is stable.
5. P2 items opportunistically.

**Red-line check before each merge:** no training/corpus/eval content surfaces in app UI or copy (see top of file).
