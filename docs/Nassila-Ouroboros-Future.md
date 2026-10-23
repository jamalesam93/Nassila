# Nassila-Ouroboros Future

**Date:** 2026-10-23 (2.1.1 Arabic OCR fidelity; FT-7 paused for budget; original synthesis 2026-07-20)  
**Scope:** Nassila (app) · NassilaT (training) · nassila-web (docs)  
**Sources reviewed:** `NassilaT/training/OUROBOROS_OPERATOR_MAP.md`, `Nassila/docs/FEATURES-AND-TWEAKS.md`, `STATE.md`, `PRODUCT.md`, `OUROBOROS_CONTEXT.md`, `CHANGELOG.md`, engine/renderer code, field notes, website release train

**App baseline:** **2.1.1** (Arabic OCR fidelity, 2026-10-23; 2.1.0 Maktab Arabic 2026-09-18; 2.0.0 MaktabOCR + Shahid 2026-09-06). **Sanad model (Hub):** 9B **FT-6** (sole published tier, v119, 2026-08-21). **Next planned cut:** **2.2.0 Sanad Arabic** — FT-7 and FT-7b **NO-GO**; FT-7c frozen and **paused for budget**. Vast is the only training ground when it resumes. **Shahid deterministic LIVE in 2.0.0**. Arabic scan OCR: Indra when downloaded (2.1.1), Paddle otherwise (2.1.0 pack). **IA:** loop vs bibliography only.

---

## Executive conclusion

Nassila has a strong and differentiated product idea: a local-first submission-integrity workstation that connects a manuscript claim to its citation, canonical record, source text, verbatim evidence, correction, and final export.

The “Ouroboros, not Hydra” direction is correct. The deterministic-core / LLM-assistant boundary is also exactly right.

However, the product must keep prioritizing **trust and production parity** over feature cadence. The **1.2.2–1.2.9** train shipped consolidated as **1.3.0**; post-1.3.0 work should follow the **Future release map** in §5 before new model facets or multimodal scope.

### Recommended priority

1. Correctness and production parity.
2. Evidence provenance and false-pass prevention.
3. Reliable orchestration, cancellation, then throughput.
4. Bibliography repair and single-reference closed-loop re-audit.
5. Project save/resume.
6. Real full-text and Arabic evaluation.
7. Only then trained Maktab/Masdar facets (**gated**), institutional access (**2.3 / 5.0**), or Shahid Vision (**4.2**). A merged GGUF is a **non-goal**.

### Key conceptual change

> **Tier 3 should be a capability gate, not a requirement to train or merge more models.**

If deterministic Maktab and Masdar satisfy extraction, retrieval, and provenance benchmarks, they do not need LLM facets merely to preserve seven-worker symmetry.

---

## 1. What the two planning files get right

### `OUROBOROS_OPERATOR_MAP.md`

Its strongest qualities are:

- It records failures honestly. Declaring v1.13 a NO-GO instead of rationalizing the regression is excellent model governance.
- It separates app versions from Sanad checkpoints (SNN).
- S12 and S14 have documented roles instead of presenting 12B as an automatic replacement for the laptop tier.
- It keeps registries, citeproc, parsers, quote validation, and security controls deterministic.
- It treats workers as pipeline stages rather than seven products.
- It records concrete operator cases instead of relying entirely on synthetic model metrics.
- It recognizes that S15 should not be a blind hyperparameter escalation.

This is much more disciplined than most small AI-product roadmaps.

### `FEATURES-AND-TWEAKS.md`

This file is especially good when it:

- Starts from observed user problems.
- Specifies blast radius and acceptance criteria.
- Refuses silent DOI/title identity changes.
- Keeps training language out of the desktop UI.
- Separates short feedback, long-task notifications, and persistent state.
- Makes PDF attachment and re-audit a concrete user workflow.
- Keeps invalid quote checking deterministic.
- Rejects a notification center and other unnecessary scope.

The manual-only DOI conflict decision is particularly strong. It demonstrates the right Nassila principle: uncertainty should become an explicit user decision, not an invisible automatic patch.

---

## 2. Where the planning artifacts need correction

### The operator map is doing too many jobs

At ~441 lines, it contains model history, current model status, app release scheduling, OCR planning, Raqim specifications, documentation status, Tier 3 research, checklists, and a document index.

That makes it comprehensive but not reliably operational. Status changes require editing the same facts in several places, which has already caused contradictions.

**Recommendation:** It should become a short cross-repository dashboard containing only:

- Current app release and next milestone.
- Current model artifacts and compatibility.
- Active blockers.
- Next three actions.
- Links to detailed specifications and decision records.

Historical metrics belong in `EVAL_GONOGO.md`; detailed feature acceptance belongs in the app repository; long-horizon research belongs in `ROADMAP.md`.

### `FEATURES-AND-TWEAKS.md` mixes active and historical work

The document still contains pre-implementation problem statements and unchecked acceptance boxes for features already marked shipped. Its status date predates v1.2.1, while the implementation order now extends through 1.3.0.

**Recommended treatment:**

- Move shipped #1–#4c and #8/#13 into the changelog or an archive.
- Keep only active specifications in the main file.
- Give each active item a verified baseline and measurable target.
- Mark “last verified against commit,” not only “last updated.”
- Stop reserving 1.2.7–1.2.9 as empty version slots.

Calling this app-version scheme “semver” is also imprecise: PDF attachment and a new repair interface are product features, not conventional patch releases. If the announced train is retained, treat it as a marketing version train. After 1.3.0, assign versions at release cut instead of preallocating patch numbers.

### Documentation drift is already material

Examples in the current repositories:

- `docs/MAKTAB_OCR.md` still describes Tesseract as an interface stub.
- `patterns/ouroboros-registry.yaml` says the Tesseract backend is planned/stub.
- The app code and changelog say Tesseract O1 shipped in 1.2.0.
- `PRODUCT.md`, `OUROBOROS_CONTEXT.md`, `ROADMAP.md`, and parts of `USER_GUIDE.md` still call Maktab/Masdar stubs, although deterministic extraction and OA-PDF grounding are live.
- `HOW_TO_GUIDE.md` says L3 is not part of the product UI.
- Several files still link to the renamed, now-absent `POST_V114_MAP.md` instead of `OUROBOROS_OPERATOR_MAP.md`.
- The machine-readable stage registry is not used by runtime orchestration and is already stale.

The renamed-map links should be treated as a high-priority documentation defect because the obsolete file is still advertised as the canonical entry point.

---

## 3. Trust-critical findings — status after 1.3.0

Findings below were written during the trust-reset design. **Status lines reflect the 1.3.0 codebase** (2026-07-20). Residual open work feeds **1.6–1.7** and NassilaT §6 — not a re-open of Phase 0.

### 3.1 Packaged manuscript registry resolution

**Status:** **Shipped** in 1.3.0 (main-process audit IPC).

Manuscript audit no longer runs registry `fetch` in the renderer. The hook calls `window.api.startManuscriptAudit`; main owns `resolveRegistry` / OA / LLM (`ipc-manuscript-audit.ts`). Packaged GUI L1 under CSP smoke: **PASS** (`STATE.md`, `PACKAGED_AUDIT_SMOKE.md`).

**Residual (1.7.0):** rate limiting under concurrency; confirm AbortSignal / cancel mid-call; keep packaged parity in CI on every release cut.

### 3.2 Passage pass without valid LLM grounding

**Status:** **Shipped** invariant in engine (Phase 0-C).

`audit-runner` / `passageVerdictWithoutParsedGrounding`: disabled or unparseable LLM output cannot produce `pass`. Quote chips + structured quote validation shipped in 1.3.0.

**Residual:** keep retrieval confidence visually separate from Sanad verdict in denser reports; never reintroduce overlap-as-pass shortcuts.

### 3.3 Failed citation mapping → synthetic-span grounding

**Status:** **Shipped** — only mapped bibliography keys enter L3 (`selectMappedBibliographyEntries`). Sharh-lite surfaces unmapped citation counts.

**Residual (1.7.0 Preflight+):** stronger mapping-coverage gate in UI before a full audit; clearer matched / ambiguous / unmatched UX; manual mapping assist.

### 3.4 Passage construction vs Sanad quality

**Status:** **Partial** — sentence/paragraph-bounded windows shipped (`passage-window.ts`, cite sentence ±1, cap 1500 chars). The old ±260 mid-word slice is gone.

July field notes (`masdar-lite-jul13`) remain useful raw material (captured under the older window):

- 49 grounding calls; 18 full-text / 31 abstract fallback.
- Many `truncated` / echo heuristics — **re-ground after the new window** before treating as train labels.
- Human adjudication **done:** **49/49** labeled → boost JSONL (operator map W3). Historical note: was 14/49 as of 2026-07-18.

**Status (2026-08-21):** **9B FT-6** (`nassila-sanad-9b`) shipped on Hub (v119 QLoRA; 6 default + 6 MTP GGUFs; bf16 unquant). Product GO vs FT-5. **FT-5** (v117) superseded. **No separate app installer for FT-6** — app baseline now **2.1.0**; next cut **2.2.0 Sanad Arabic** (paused).

### 3.5 App vs training prompt contract

**Status:** **Shipped** for continued use — contract `sanad-grounding-v1`; Nassila ↔ NassilaT goldens byte-identical; S12/S14 single-seed production-prompt re-eval recorded (`PROMPT_CONTRACT_REEVAL.md`). **S15 shipped** on Qwen 3.5 4B (`nassila-sanad-4b`) — trained on the same 874-row v1.14 dataset; single-seed contrastive-v2 eval only, quote pending local verify. **FT-5 shipped** on Qwen 3.5 9B (`nassila-sanad-9b`) — full-text v117; **superseded on Hub by FT-6 (v119, 2026-08-21)**. 4B S15 / 12B S14 retired.

**Qwen 3.5 thinking note:** the GGUFs embed a thinking chat template; the app strips thinking traces natively and ships the no-thinking template (`FEATURES-AND-TWEAKS.md` #16).

**Residual:** optional multi-seed re-eval on private manuscripts; keep prompt version/hash on model cards. FT-6 Hub ship done — app baseline **2.0.0**; next installer **2.1.0 Maktab Arabic**.

### 3.6 Arabic Sanad validation

**Status:** **Open** — **2.2.0 Sanad Arabic** (FT-7). Production Maktab AR OCR + Arabic-aware mapping ship first as **2.1.0 Maktab Arabic**.

UI AR support is live; Sanad training JSONL has **zero** Arabic-script grounding rows in published FT-6 (~18k EN). Qualify Arabic grounding as **unvalidated** until Track B GO. FT-7 (v120) NO-GO 2026-10-14; FT-7b (v121: 953 AR train rows, owner-reviewed 165-row AR holdout v2, contamination 0) NO-GO 2026-10-16 — AR verdict 0.776 vs 0.90, EN v2 0.945 vs 0.950 (NassilaT `EVAL_GONOGO_FT7_MEMO.md` §8). FT-7c train-data fixes next. Arabic PDF ingest: adapter goldens exist; production still DOCX-defers Arabic-heavy / reverse-font until Track A packs PP-OCRv5 in **2.1.0**.

### 3.7 OCR offline first use

**Status:** **Shipped** — bundled `eng` / `fra` / `ara` tessdata + `langPath` resolution (`tesseract-ocr.ts`); packaged OCR smoke PASS.

**Residual:** if packs are missing, Tesseract may still network-fallback — surface that warning honestly; keep offline-first-use coverage in release smoke.

### 3.8 Project persistence

**Status:** **Partial** — `.nassila` save/open shipped (1.3.0 / former 1.2.7).

**Residual (1.7.0):** dirty-close warning; crash recovery; action log; save/reopen edge-case fidelity (mappings, decisions, export history).

### 3.9 Release reliability foundation

**Status:** **Partial**.

- CI workflow exists (`.github/workflows/ci.yml`).
- Local packaged smoke + boundary unit smoke PASS for 1.3.0; GitHub **release tag** still pending operator cut.
- Still thin: installer SHA-256/SBOM automation, code signing, milestones/issues hygiene, Gemma license metadata check.

**Before broader institutional adoption:** publish checksums on release; widen CI gates; consider RC builds before stable cuts.

---

## 4. Recommended product north star

Nassila should not become a generic reference manager or writing assistant.

It should own this evidence chain:

```mermaid
flowchart LR
  P["Local project"] --> M["Manuscript snapshot"]
  M --> C["Citation occurrence"]
  C --> R["Canonical CslItem"]
  R --> S["Source artifact"]
  S --> E["Evidence chunk + locator"]
  E --> G["Claim assessment"]
  G --> D["User decision / repair"]
  D --> A["Re-audit affected item"]
  A --> X["Submission integrity bundle"]
```

The canonical domain sequence should be:

`CitationOccurrence → CslItem → SourceArtifact → EvidenceChunk → ClaimAssessment → UserDecision`

That creates a genuine Ouroboros loop:

1. Detect a problem.
2. Repair the reference or source.
3. Re-run only affected citation sites.
4. Record what changed.
5. Export corrected references plus an evidence report.

This is more defensible than marketing seven workers or a single giant model.

### One product experience, not necessarily one GGUF

“One model identity” is a good setup and branding goal, but “one merged weight file” should not be the architectural north star.

A merged seven-task model risks:

- Catastrophic interference.
- Larger downloads and hardware requirements.
- Regression across independently useful tasks.
- Losing the E4B laptop tier.
- Forcing a multimodal Shahid requirement into otherwise text-only workflows.

**Better principle:**

> One Nassila configuration and routing experience; as many model artifacts as independently pass their task gates. **5.0.0 records a merged GGUF as a non-goal.**

Maktab and Masdar may remain deterministic. Shahid may need a separate multimodal model. Sanad can remain dual-tier. The user does not need to see that complexity.

---

## 5. Recommended release sequence

**Versioning rule (post-1.3.0):** Assign semver at **release cut**. Do not pre-allocate patch numbers on the public website until a cut is ready. Sync `nassila-web/lib/release-train.ts` and roadmap MDX when a version is announced.

### Shipped — 1.3.0 · Sharh-lite (2026-07-20)

The former **1.2.2–1.2.9** slots shipped together in **1.3.0**:

| Former slot | Codename | Delivered in 1.3.0 |
|-------------|----------|-------------------|
| 1.2.2 | Throughput | Main-process audit scheduler, live progress, cancel-safe runs |
| 1.2.3 | Quote chip | Per-claim quote chips; evidence provenance; header wordmark cleanup |
| 1.2.4 | Raqim Repair | PMCID/arXiv/OUP/Springer hardening; parser guards; identity-safe apply |
| 1.2.5 | Masdar attach | Per-reference PDF attach; content-addressed cache; offline re-ground |
| 1.2.6 | Raqim Resolve | Repair panel; scholarly registries + HF/Kaggle/GitHub; manual apply only |
| 1.2.7 | Projects + Help | `.nassila` save/open; first-run tip; Help → website |
| 1.2.8 | OCR O2 + a11y | Bundled eng/fra/ara tessdata; enhanced OCR; loop keyboard nav |
| 1.2.9 | Preflight | Submission gates; opt-in diagnostic export |
| 1.3.0 | Sharh-lite | Deterministic evidence summary; DOCX/PDF split fix; Windows icons |
| — | Legislation (partial) | EU ELI URL + `Regulation (EU) YYYY/NNN` in Resolve |

Subsections **Phase 0** and **1.2.2–1.2.9** below remain as **design record** for what shipped in 1.3.0.

---

### Future release map (post-1.3.0)

Suggested versions and worker-themed codenames. **Not dates, not public promises** until cut — internal planning and website sync source.

| Version | Codename (EN) | Codename (AR) | Primary worker | User-visible focus |
|---------|---------------|---------------|----------------|-------------------|
| **1.4.0** | **Raqim Statute** | **رقيم تشريع** | Raqim | Legislation + gray-lit Resolve; parser hardening for legal refs |
| **1.5.0** | **Raqim Web** | **رقيم ويب** | Raqim / Tasnif | Webpage & grey-web citations; dead links; host parsers |
| **1.6.0** | **Maktab Loop** | **حلقة المخطوطة** | Maktab / Masdar | OCR fixtures; one-upload loop; source chunking polish | **Shipped 2026-08-05** |
| **1.7.0** | **Integrity Bundle** | **حزمة النزاهة** | Loop / export | Preflight+; submission export; trust & packaged parity | **Shipped 2026-08-10** |
| **1.8.0** | **Sanad 9B** | **سند 9B** | Sanad | Sole-tier registry (9B; 4B/12B retired) + Qwen3.5 thinking handling + no-thinking template on the web | **Shipped 2026-08-13** — app `FEATURES-AND-TWEAKS.md` #16/#17 |
| **1.10.0** | **Masdar Papers** | **أوراق مصدر** | Masdar / Raqim | Wayback availability gate; bibliography dedupe; folder-scan PDF attach | **Shipped 2026-08-22** — app `FEATURES-AND-TWEAKS.md` #18/#19/#20 |
| **1.10.1** | **Packaged network parity** | **تكافؤ الشبكة المعبأة** | Raqim / main IPC | Keep-my-title / DOI lookup / autocorrect online / input-Resolve via main IPC | **Shipped 2026-08-23** — #21 |
| **2.0.0** | **MaktabOCR + Shahid** | **مكتب OCR + شاهد** | Maktab / Shahid | Firecrawl native pdf-inspector + selective OCR; scan fallback; Shahid table/figure evidence path; Tier 3 + multimodal PASS | **Shipped 2026-09-06** |
| **2.1.0** | **Maktab Arabic** | **مكتب عربي** | Maktab | Production Arabic scan OCR (Paddle) + Arabic-aware mapping | **Shipped 2026-09-18** |
| **2.1.1** | **Arabic OCR fidelity** | **دقة OCR العربي** | Maktab | Per-line Arabic OCR order; legacy-encoded layers routed to OCR; Indra reads Arabic scans when downloaded, Paddle otherwise | **Shipped 2026-10-23** |
| **2.2.0** | **Sanad Arabic** | **سند عربي** | Sanad | Native Arabic L3 + Hub label after GO | Planned — FT-7 and FT-7b **NO-GO**; FT-7c frozen, **paused for budget** |
| **2.3.0** | **Masdar Auto** | **مصدر آلي** | Masdar / Maktab | Auto cited-PDF ingest; library proxy prefixes; page provenance; Zenodo/GitHub | Planned |
| **2.4.0** | **Tasnif Risk** | **تصنيف المخاطر** | Tasnif | Retraction flags; preprint→version; citation-age / self-cite; predatory cadence | Planned |
| **2.5.0** | **Projects Ledger** | **سجل المشروع** | Loop / projects | Action log; New Session; autosave journal; first-run checklist | Planned |
| **3.0.0** | **Ouroboros** | **أوروبوروس** | Loop | Closed repair→re-audit; crash recovery; signed installers; SEC-02b | Planned |
| **3.1.0** | **Sharh Explain** | **شرح موسّع** | Sharh | `issue_explain` LLM facet + annotated evidence export | Planned — GPU |
| **3.2.0** | **Raqim Signals** | **إشارات رقيم** | Raqim / Tasnif | `webpage_metadata` + `webpage_classify` facets | Planned — GPU |
| **3.3.0** | **Sanad Bilingual** | **سند ثنائي اللغة** | Sanad | EN+AR mixed-script quality; per-language EN vs AR reporting | Planned — GPU |
| **4.0.0** | **Cross-platform** | **منصات متعددة** | Packaging | macOS / Linux installers; OCR pack parity; signed builds; Tauri v2 + Rust migration | Planned |
| **4.1.0** | **Nassila CLI** | **سطر أوامر ناسيلا** | Engine | Headless batch audit; JSON report contract — on the 4.0.0 Rust core | Planned |
| **4.2.0** | **Shahid Vision** | **شاهد بصري** | Shahid | Full multimodal Shahid (separate vision artifact; targets the 4.0.0 `ort` runtime) | Planned — GPU |
| **5.0.0** | **One Nassila** | **ناسيلا واحدة** | Product | Routed multi-artifact pack; institutional webview last resort; offline review packages | Planned |

**Recommended cut order:** 1.4.0 → 1.5.0 → 1.6.0 → 1.7.0 → **1.8.0 Sanad 9B** ✅ → (**FT-6 Hub-only**, no 1.9.0 installer) → **1.10.0 Masdar Papers** ✅ → **1.10.1 Packaged network parity** ✅ → **2.0.0 MaktabOCR + Shahid** ✅ → **2.1.0 Maktab Arabic** ✅ (shipped 2026-09-18) → **2.1.1 Arabic OCR fidelity** ✅ (shipped 2026-10-23) → **2.2.0 Sanad Arabic** (paused for budget) → **2.3.0–2.5.0** → **3.0.0 Ouroboros** → **3.1–4.1** → **4.2.0 Shahid Vision** → **5.0.0 One Nassila**. GPU-gated cuts (2.2, 3.1–3.3, 4.2) may swap with deterministic ones while budget is constrained; **4.0.0 is packaging work, not GPU-gated**, and its workstream **C** is unblocked today.

#### 1.4.0 — Raqim Statute · رقيم تشريع

**Problem:** Resolve searched scholarly registries for `legislation` rows; EU ELI URLs had no handler (Crossref papers *about* a law surfaced as “fixes”). **Principle:** pattern families + official catalogue URLs — **not** one national API per country.

**Shipped in 1.3.0 (checkpoint):** EU ELI parse; `Regulation (EU) YYYY/NNN`; no Crossref fallback on `europa.eu`; down-rank articles when row is legislation.

**1.4.0 scope:**

| Area | Deliverable |
|------|-------------|
| **US federal** | URL patterns: `congress.gov`, `govinfo.gov`, `uscode.house.gov` → `legislation` + `number` + URL |
| **UK** | `legislation.gov.uk` year/chapter or SI id from URL |
| **Generic official URL** | Allowlisted `.gov` / parliamentary catalogues: pasted URL = identity; optional conservative metadata |
| **Resolve UX** | Copy: legal instruments verified against official sources, not Crossref; no scholarly default for legislation |
| **Parser** | Statute numbers split across PDF/DOCX lines (`2024` + `/1689` → `2024/1689`) |
| **Fixtures** | EU AI Act + ≥1 US + ≥1 UK operator bibliography case |

**Non-goals:** global legal API; auto-apply fuzzy matches; commentary papers as the law.

#### 1.5.0 — Raqim Web · رقيم ويب

From `WEBPAGE_ROADMAP.md` and website roadmap — deterministic first.

| Area | Deliverable |
|------|-------------|
| **Reliability** | HTTP status, content-type, redirect logging; dead-link visibility; paywall/archive hints |
| **Host parsers** | Stable site-specific extractors (code over model) |
| **Raqim engine** | OpenAlex consistency when type stays `webpage`; locale-aware accessed-date; batch re-fetch suggestions |
| **Resolve** | Extend artifact host connectors where URLs are stable |

Registry verify and citeproc remain **deterministic** — not LLM-replaced.

#### 1.6.0 — Maktab Loop · حلقة المخطوطة

**Shipped in 1.6.0 (2026-08-05):** Maktab OCR golden fixtures + CI OCR probe; scan coverage; cache controls (source-artifact + Maktab extraction); review-after-import banner; deterministic Sharh summary aggregation with localized headline + per-finding copy; Masdar per-reference PDF attach verified and documented as live; loop a11y RTL acceptance pass. **Deferred to 2.3.0 Masdar Auto:** auto cited-PDF ingest; Maktab page/scan-coverage provenance surfacing.

| Area | Deliverable |
|------|-------------|
| **Maktab / OCR** | Golden fixtures; scan coverage; page provenance; cache controls |
| **Manuscript loop** | Less manual module hopping: upload → segment → cited sources → grounding |
| **Masdar** | Source-fetch polish; paragraph/page chunking baseline before any Masdar *model* |
| **Sharh** | Richer **deterministic** summaries (no new unconstrained LLM call unless eval proves need) |
| **A11y** | Loop table keyboard nav; RTL acceptance pass |

#### 1.7.0 — Integrity Bundle · حزمة النزاهة

Trust and submission outputs — finish gaps that overlap 1.3.0 preflight but broaden export and production parity.

| Area | Deliverable |
|------|-------------|
| **Preflight+** | Stronger unresolved-identity gate; mapping-coverage summary in UI — ✅ shipped (preflight gate in 1.4.0; matched/ambiguous/unmatched breakdown added to SharhLitePanel 2026-08-10). |
| **Maktab — structured DOCX ingest** | Loop DOCX import: `mammoth.extractRawText` → `convertToHtml` (structure preserved; headings side-channel for segmentation). ✅ **Shipped 2026-08-10** — `src/engine/maktab/docx-extract.ts`, jszip fixture builder, 6 unit tests; bibliography `parseDocx` untouched; Route C (no native deps, no IPC). |
| **Export** | Submission integrity bundle (audit + bibliography + provenance metadata) — shipped (1.4.0) via `buildSubmissionIntegrityBundle` + SharhLite export; broaden on demand. |
| **Projects** | Action log; save/reopen fidelity; edge-case recovery — dirty-close warning ✅ shipped 2026-08-10 (`app-close-guard.ts`, `useDirtyCloseGuard`, IPC policy entries, EN/AR). |
| **Cancel** | Mid-LLM abort when IPC supports `AbortSignal` — ✅ shipped (audit runner threads AbortSignal through `services.llmChat`; `executeLlmChat` passes it to `fetch`; `retryTransient`/semaphore pools abort-aware). |
| **Packaged parity** | Remaining renderer vs main-process registry paths; audit rate limiting under concurrency — ✅ shipped (registry/align OA + LLM all main-process; `DEFAULT_AUDIT_CONCURRENCY` semaphores + 429/503 retry). |
| **CI** | Packaged smoke gates on release train — ✅ shipped (`package-windows` job with `probe:ocr` + `probe:ocr:golden`). |

#### 1.8.0 — Sanad 9B · سند 9B

**Shipped 2026-08-13.** ✅ App `FEATURES-AND-TWEAKS.md` #16/#17 acceptance closed: `stripQwenThinkingTraces` in the repair pipeline, `max_tokens` for Sanad 9B, no-thinking template inline on the nassila-web Sanad setup guide (llama.cpp tab) with the Custom preset linking there, sole-tier `nassila-sanad-9b` registry (4B/12B retired, hard-cut), single 9B chip, defaults/i18n, and the doc-refresh batch below.

**Scope change (2026-08-13):** 1.8.0 became the **Sanad 9B model-critical cut** (Shahid stayed gated → **2.0.0** with MaktabOCR). The app registry previously wired retired 4B/12B ids and had no native handling for the Qwen3.5 thinking template — both shipped before the 9B full-text model is the reliable default.

| Area | Deliverable |
|------|-------------|
| **Thinking handling** | `stripQwenThinkingTraces` in the grounding repair pipeline + `max_tokens` for Sanad models — app `FEATURES-AND-TWEAKS.md` #16 |
| **Sole-tier registry** | `sanad9b` artifact wiring; single 9B tier chip; preset/hints/setup links/defaults; i18n — app `FEATURES-AND-TWEAKS.md` #17 |
| **No-thinking template** | No-thinking template inline on the nassila-web Sanad setup guide (llama.cpp tab); Custom preset in the app links there — app `#16` |
| **Doc refresh** | Model/version reference sweep across all app + NassilaT docs (README, OUROBOROS*, PRODUCT, BRAND, DESIGN, USER_GUIDE, TRAINING, operator map, HF docs) |

**Gate:** none external — 9B FT-5 model + box kit shipped on NassilaT for the 1.8.0 cut (HF verify PASS). **Hub trunk is now FT-6** (2026-08-21).

#### Sanad FT-6 (Hub-only · no 1.9.0 installer)

**SHIPPED on Hugging Face 2026-08-21** — GGUF (default + MTP) + unquant + v119-lora. Users keep **1.8.0** and download updated quants. Next **app** installer: **1.10.0 Masdar Papers**.

#### 1.10.0 — Masdar Papers · أوراق مصدر

**Shipped 2026-08-22** — installer `Nassila Setup 1.10.0.exe`; app `FEATURES-AND-TWEAKS.md` #18/#19/#20 acceptance closed.

| Area | Deliverable |
|------|-------------|
| **Wayback** | Archive button only when a snapshot exists |
| **Dedupe** | Bibliography dedupe (DOI, else title+year) |
| **Folder attach** | Folder-scan PDF attach + targeted re-audit |

#### 2.0.0 — MaktabOCR + Shahid · مكتب OCR + شاهد (Shipped 2026-09-06)

**Gate:** Tier 3 full-text holdout + separate multimodal Shahid eval + Maktab OCR offline smoke all **PASS** (see NassilaT `EVAL_GONOGO_TIER3_MEMO.md`). Freeze contract: app `FEATURES-AND-TWEAKS.md` #22 closed.

| Area | Deliverable |
|------|-------------|
| **MaktabOCR** | Firecrawl native `@firecrawl/pdf-inspector` + selective OCR; pretrained Arabic recognizer adapter for scan PDFs — **LIVE** |
| **Shahid** | Table/figure evidence path (Markdown table + figure extraction with cell-level precision) — **LIVE** |
| **Grey lit (model-assisted)** | Suggest CSL fields — **user confirms before apply** — **LIVE** |
| **FT-7 Arabic L3** | **Out of scope** — moved to **2.2.0 Sanad Arabic** |

#### 2.1.0 — Maktab Arabic · مكتب عربي (Shipped 2026-09-18)

**Gate:** Track A (Paddle PP-OCRv5 pack + probes) **and** Track C (Arabic-aware segment/in-text mapping fixtures). Freeze contract: app `FEATURES-AND-TWEAKS.md` #23. **No GPU.** **Honesty:** Arabic UI + Arabic scan OCR yes; **Arabic L3 stays unvalidated** — never claim Arabic manuscript audit.

| Area | Deliverable |
|------|-------------|
| **Track A — Maktab AR OCR** | Package PP-OCRv5 under `resources/arabic-ocr/`; register adapter; lift Arabic-heavy deferral when pack present; reverse-font ToUnicode still DOCX; never Tesseract `ara` primary |
| **Track C — mapping** | Arabic-aware segment / in-text fixtures green so FT-7 can later be Hub-only |
| **Probes** | `npm run ocr:arabic-adapter` && `npm run probe:arabic-ocr` on operator machine |

#### 2.1.1 — Arabic OCR fidelity · دقة OCR العربي (Shipped 2026-10-23)

**Gate:** none beyond the 2.1.0 Paddle pack. This patch does not replace the extractor.

| Area | What shipped |
|------|----------------|
| **Line order** | PP-OCRv5 output is reversed per line. Whole-page reversal scored mean CER 0.811; per-line scores 0.251 on the same pages. |
| **Legacy fonts** | Pre-Unicode Arabic layers (no cmap gaps, high rare-letter share) raise `needsReview` and route to OCR. |
| **pdf-inspector** | 1.17.0 → 1.25.2. Text-only PDFs do not load OCR models. Arabic layer F1 vs Indra rose sharply (one book 0.342 → 0.915). |
| **Indra** | Optional ~14 MB download. Runs on onnxruntime-node (no Python). On 84 reference-valid pages the port matched Python (median CER 0.067, 76 wins vs Paddle, p90 0.348). Paddle re-reads a page Indra cannot. Weights are fetched, never bundled. |
| **Evidence** | `reports/arabic_ocr_real_holdout_20261023.md`. Raw run: `E:\Antigravity Projects\NassilaAGY\ocr-ab`. |

#### 2.2.0 — Sanad Arabic · سند عربي (NO-GO — paused for budget)

**Gate:** Track B FT-7 Vast QLoRA + 3-seed EN regression + AR holdout → sign `EVAL_GONOGO_FT7_MEMO.md` → Hub FT-7 label → installer. Freeze contract: app `FEATURES-AND-TWEAKS.md` #24. FT-7 NO-GO 2026-10-14; FT-7b NO-GO 2026-10-16. FT-7c v122 is frozen and **will not be trained** until budget returns. Vast is the only ground. No Colab. No laptop 9B QLoRA substitute.

**Data already frozen:** `l3_grounding_train_v120.jsonl` (1719 EN + 240 AR); `eval_holdout_grounding_ar_v1.jsonl` (56 rows); contamination 0.

| Area | Deliverable |
|------|-------------|
| **Vast train** | Reuse FT-6 runbook with v120; thinking off; seeds 42/43/44 |
| **Eval** | EN v2 + compound floors; AR holdout reported separately |
| **Hub** | Relabel `nassila-sanad-9b` sole tier **FT-7** after GO |

#### 2.3.0 — Masdar Auto · مصدر آلي

Finish deferred ingest reach without GPU.

| Area | Deliverable |
|------|-------------|
| **Auto cited-PDF ingest** | Fetch OA PDFs for cited works without per-row attach (deferred since 1.6.0) |
| **Library proxy prefixes** | Configurable institutional proxy (ladder step 4 — no login webview) |
| **Page provenance** | Maktab scan-coverage / page chips in loop (deferred 1.6→1.7) |
| **Gray-lit hosts** | Zenodo + GitHub dataset/model cards in Resolve |

#### 2.4.0 — Tasnif Risk · تصنيف المخاطر

Deterministic risk signals. Confirm-before-apply; no fuzzy auto-apply.

| Area | Deliverable |
|------|-------------|
| **Retraction** | Crossref `update-to` retraction/correction flags |
| **Version** | Preprint → published-version suggestion |
| **Sharh-lite** | Citation-age + self-citation summary line |
| **Predatory** | List refresh cadence surfaced in Settings |

#### 2.5.0 — Projects Ledger · سجل المشروع

Prerequisite for 3.0.0 closed loop.

| Area | Deliverable |
|------|-------------|
| **Action log** | What changed, when, by which repair |
| **New Session** | Unified clear semantics (citations vs manuscript vs report) |
| **Autosave journal** | Crash-recovery groundwork |
| **Diagnostics** | Broader opt-in diagnostic bundle |
| **First-run** | Bibliography-first checklist / dismissible banner |

#### 3.0.0 — Ouroboros · أوروبوروس

Closed evidence-and-repair loop as the product.

| Area | Deliverable |
|------|-------------|
| **Closed loop** | Repair → auto re-audit of affected cite sites → change record → export |
| **Crash recovery** | Restore from autosave journal |
| **Release hygiene** | Signed installers + SHA-256 checksums + auto-update; tag→CI→Release; Windows packaging CI |
| **SEC-02b** | `sandbox: true` with working preload smoke gate |

#### 3.1.0 — Sharh Explain · شرح موسّع (GPU)

| Area | Deliverable |
|------|-------------|
| **LLM facet** | `issue_explain` behind deterministic fallback |
| **Export** | Annotated evidence report (DOCX/PDF appendix per claim) |

#### 3.2.0 — Raqim Signals · إشارات رقيم (GPU)

| Area | Deliverable |
|------|-------------|
| **Facets** | `webpage_metadata` + `webpage_classify` trained |
| **Ranking** | Manuscript-context ranking for suggestions |
| **Batch** | Re-fetch metadata suggestions |

#### 3.3.0 — Sanad Bilingual · سند ثنائي اللغة (GPU)

Solidify **English and Arabic** after FT-7. Not a third language.

| Area | Deliverable |
|------|-------------|
| **EN+AR quality** | Mixed-script EN/AR manuscripts; EN regression + AR quality after FT-7 |
| **Reporting** | Per-language metrics EN vs AR (internal eval; not in-app scorecards) |
| **FT-8 (only if a train is needed)** | English + Arabic only |

**Non-goal:** French (or any third-language) Sanad L3 — not a gate and not a prospective slot. Bundled Tesseract `fra` is OCR ingest, not a train target.

#### 4.0.0 — Cross-platform · منصات متعددة

macOS/Linux installers (`build:mac` / `build:linux` exist); OCR pack parity; signed builds; Tauri v2 + Rust backend migration to eliminate Chromium bundle overhead and rustify the Maktab native OCR/PDF pipeline.

**Sequenced before 4.1.0 and 4.2.0 on purpose.** Both benefit from the Rust core rather than being built twice on the Electron stack: a headless batch-audit CLI is native to a Rust binary, and Shahid Vision needs a *new* native inference pipeline (`ort`) that must not be written against `onnxruntime-node` first.

**Three separately gated workstreams** — a slip in one must not block the others:

| # | Workstream | Scope | Delivers |
|---|------------|-------|----------|
| **A** | Tauri v2 shell | Electron main → Tauri v2 (Rust); `preload` bridge → Tauri commands; menus/i18n, close guard, LLM proxy | Removes the bundled Chromium runtime |
| **B** | Rust native pipeline | `onnxruntime-node` → `ort`; Maktab OCR/PDF raster → Rust; drops `canvas` / `@napi-rs/canvas` | Removes the Node native dependency pile |
| **C** | Natives + packaging prune | Pin bundled natives to the target platform; move script-only deps out of `dependencies`; re-measure | Removes dead cross-platform binaries |

**Sub-50 MB is a joint claim: it needs A + B + C.** Measured 2.1.0 baseline — installer 250.9 MB, installed 973.8 MB, of which the Chromium runtime is ~345 MB and `resources/app.asar.unpacked` is ~444 MB (dominated by `onnxruntime-node`). A shell swap that leaves the native pile in place lands well short of the target.

**C is done — landed ahead of 4.0.0.** Packaged footprint **973.8 MB → 718.8 MB (−255.0 MB)**: `onnxruntime-node` now ships only the target slice (219 MB of dead darwin / linux / win32-arm64 binaries removed) via `scripts/prune-native-platforms.mjs` on `beforePack`/`afterPack`, and script-only `canvas` moved to `devDependencies` (−35 MB). `@napi-rs/canvas` stays — pdf.js requires it at runtime. `resources/app.asar.unpacked` fell 443.9 → 189.7 MB with `app.asar` unchanged at 167 MB.

**Constraint for whoever next edits packaging:** do **not** express the slice prune as a `win.files` negation. A platform-specific `files` block leaves electron-builder's `defaultMatcher` holding only ignore patterns, which trips `containsOnlyIgnore()` in `app-builder-lib/out/fileMatcher.js` and prepends a match-everything glob — packing the whole repository (docs/, src/, tests/, `.cursor/`) into `app.asar` at +174.6 MB. That regression is why this is a hook. `beforePack` is also the correct seam because asar integrity is computed after it.

#### 4.1.0 — Nassila CLI · سطر أوامر ناسيلا

Headless batch audit for editors/CI on the same engine; JSON report contract. Ships on the **4.0.0** Rust core.

#### 4.2.0 — Shahid Vision · شاهد بصري (GPU)

Full multimodal Shahid: separate vision artifact + multimodal holdout + hardware tier gate. Distinct from the **2.0.0** bounded tables/figures slice.

**Now sits after the migration, not before it.** The vision artifact's runtime contract targets `ort` (**4.0.0** workstream **B**), not `onnxruntime-node`. Building it earlier would mean writing the native vision pipeline twice; the previous 4.0.0/4.2.0 ordering carried that risk and was corrected here.

#### 5.0.0 — One Nassila · ناسيلا واحدة

| Area | Deliverable |
|------|-------------|
| **Routing** | One Nassila identity; as many model artifacts as independently pass task gates (§4) — **not** one GGUF |
| **Institutional webview** | Last resort after OA → attach → browser → **proxy prefixes (2.3.0)**; SEC review |
| **Review packages** | Offline `.nassila` bundles for advisors — not cloud sync |

**Non-goal:** a merged Ouroboros GGUF (`nassila-agent-e12b-v1` or any single seven-task weight file). Do not train, merge, or market one GGUF as the 5.0.0 ship identity. See §4.

**Conditional, unversioned:** Maktab **M01** / Masdar **Md01** LLM facets only if deterministic gates fail. No 2.3–5.0 slot until a written GO/NO-GO says ingest cannot close the hole.

---

### Parallel tracks (not app semver)

| Track | Status | Notes |
|-------|--------|-------|
| **Sanad FT-6** | **SHIPPED on Hub** | GGUF + unquant + v119-lora (2026-08-21); **no 1.9.0 installer** |
| **Sanad FT-7** | FT-7 and FT-7b **NO-GO**; FT-7c frozen | **Paused for budget.** Vast only, when cash returns. Ships as **2.2.0** after GO |
| **NassilaT field notes / Tier 3 data** | Active curation | Never surfaces training/eval copy in app UI |
| **nassila-web** | Ongoing | Changelog sync; roadmap aligned with this map |
| **Website release train** | Near-term slots | **2.1.1** Arabic OCR fidelity is current; **2.2.0** Sanad Arabic paused; 2.3–5.0 on roadmap MDX |

### Worker maturity (direction)

| Worker | Today (2.1.0) | Target (via map above) |
|--------|-----------------|-------------------------|
| **Raqim** | L1/L2, Resolve, statute, web gray lit, packaged network parity | Signals facets **3.2.0**; grey-lit confirm polish as warranted |
| **Sanad** | L3; 9B FT-6 on Hub | FT-7 Arabic **2.2**; EN+AR mixed-script **3.3**. Languages: **EN + AR only** |
| **Masdar** | OA PDF + attach + papers folder scan | Auto cited-PDF + proxy prefixes **2.3** |
| **Maktab** | Native pdf-inspector + production Arabic scan OCR (Paddle) + scan fallback | Mapping live in **2.1**; further ingest polish as warranted |
| **Sharh** | Sharh-lite deterministic | LLM facet **3.1** if warranted |
| **Tasnif** | Inline deterministic | Risk signals **2.4**; grey-web typing **3.2** |
| **Shahid** | Table/figure evidence path | **LIVE in 2.0.0**; full vision **4.0** |

### Long-term (not versioned)

Items below stay **unversioned** until promoted, **or** are explicit non-goals. Promoted items now live in the §5 map (Shahid Vision → 4.2.0; institutional webview last-resort → 5.0.0; routed pack → 5.0.0). Merged GGUF is a **5.0.0 non-goal**. Detail in **§11**.

| Item | Theme | Why still long-term / non-goal |
|------|-------|--------------------------------|
| **Merged Ouroboros GGUF (`nassila-agent-e12b-v1`)** | Training | **Non-goal under 5.0.0** — routed pack, not one weight file (§4, §5.0) |
| **Train every worker for naming symmetry** | Training | No user value until each facet passes an independent task gate; M01/Md01 only if deterministic fails |
| **Cloud LLM as default** | Product | Local Sanad (9B FT-6 on Hub) remains primary — `PRODUCT.md` non-goal |
| **Notification center** | UX | Rejected scope — lightweight toasts only (`FEATURES-AND-TWEAKS.md`) |
| **Thesis generation / open drafting** | Product | Integrity workflow, not authoring — `OUROBOROS.md` / `PRODUCT.md` non-goal |
| **Collaboration / cloud project sync** | Product | Needs durable project model; 5.0 ships offline review packages instead |
| **Fuzzy auto-apply (registry / gray lit)** | Raqim | Conflicts with identity-safe **manual apply** — confirm-before-apply |
| **French / third-language Sanad L3** | Training | **Non-goal** — Sanad trains and gates are English + Arabic only. Do not slot as a prospective cut. Bundled Tesseract `fra` is OCR ingest, not a train target. |

**Promotion rule:** A long-term item gets a version slot only when (a) earlier map gaps it addresses are closed or explicitly deferred, (b) acceptance criteria exist in `FEATURES-AND-TWEAKS.md`, and (c) security/privacy review is done where applicable.

---

### Phase 0 — Trust reset (shipped in 1.3.0 train)

Design record for the trust reset that landed with the 1.3.0 consolidation. Items below are **done** unless noted in §3 residuals.

**Work (completed):**

1. Route manuscript registry resolution through main-process IPC.
2. Add a packaged audit smoke test.
3. Synchronize the production prompt contract across repositories.
4. Re-evaluate S12 and S14 under that exact prompt (single-seed; optional multi-seed remains).
5. Eliminate L3 pass on disabled LLM or parse failure.
6. Remove synthetic-span grounding when mappings fail.
7. Add mapping coverage and ambiguity reporting (Sharh-lite + mapping summary).
8. Replace character-cut passage windows with sentence/paragraph windows.
9. Bundle OCR language packs (eng/fra/ara).
10. Add basic CI (`.github/workflows/ci.yml`).

**Exit gates:** **Met** for 1.3.0 packaged smoke + prompt re-eval. Residual rate-limit / mid-LLM abort / dirty-close → **1.7.0**.

### 1.2.2 — Audit scheduler and throughput

Do not add a `Promise.all` around the existing hook.

First extract orchestration from the ~700-line renderer hook:

- `src/engine/manuscript/audit-runner.ts`: stage logic and result assembly.
- `src/shared/manuscript-audit-contract.ts`: validated IPC contracts.
- `src/main/ipc-manuscript-audit.ts`: network/LLM ownership and cancellation.
- Renderer hook: start, cancel, and consume progress only.

**Scheduler design:**

- Registry pool: initial limit 3.
- OA/source pool: initial limit 2.
- Local LLM pool: default 1 (parallel inference can increase VRAM pressure without increasing throughput).
- Stable bibliography ordering regardless of completion order.
- Per-item stage state instead of one global stage.
- Run ID on every progress event.
- Main-process AbortControllers keyed by run ID.
- Retry/backoff for 429/503 with bounded attempts.
- Partial report preserved on recoverable failures.

**Proposed acceptance:**

- A fixed 50-reference benchmark shows a repeatable wall-clock improvement, initially target ≥25%.
- Zero new 429 failures.
- Zero stale findings after cancel/restart.
- Cancel reaches a terminal state promptly; target p95 under two seconds when the endpoint supports abort.
- E4B and 12B do not OOM under default settings.
- Results are semantically identical to the sequential baseline.

### 1.2.3 — Evidence integrity

Keep #6 and #15, but broaden #6 into a trust release:

- Per-claim quote validation state.
- “Quote found” / “quote not found” markers that do not imply the claim is true.
- Clear distinction between source retrieval confidence and Sanad verdict.
- Contradiction count separate from generic warnings.
- Source provider, coverage, and locator.
- Model ID/checkpoint, prompt version, runner, and app version in reports.
- Source URL, retrieval time, extraction tier, source hash, and page/section hint.
- Correct manuscript source format—currently reports hard-code `paste`.
- Expose the selected structure template or remove hidden IMRAD checks.

The header wordmark removal remains a safe tiny addition.

### Recommended swap: Raqim Repair before Masdar Attach

The documented workflow says bibliography quality controls downstream audit quality. Therefore Raqim R1 should precede new source attachment.

#### 1.2.4 — Raqim Repair

Implement all operator cases as fixtures before engine changes:

- PMCID → PMID → PubMed in L1 verify.
- arXiv URL and DataCite DOI, while preserving preprint identity/version.
- OUP `article-abstract`.
- Springer `/chapter/` and Crossref `book-chapter`.
- DeLong/Vancouver initials and `et al.`.
- Registry replacement of implausible title/authors.
- Software false-positive guard.
- Genre-aware APA rules.
- Nature/npj wrong-title cases.

**Important nuance:** an arXiv DataCite DOI should not silently imply that a later journal article is the same citation choice. Preserve arXiv ID and let users choose between preprint and published record.

**Exit gates:**

- Every recorded operator regression has an offline mocked fixture.
- False automatic identity changes: zero.
- Registry metadata never applies when a DOI/title identity conflict is unresolved.
- Packaged bibliography and manuscript paths use the same resolver behavior.

#### 1.2.5 — Masdar Attach and single-reference re-audit

By this point, the scheduler supports item-scoped runs.

**Implementation:**

- Attach PDF from the selected finding or bibliography row.
- Extract once and cache locally by SHA-256.
- Preserve extraction tier, language, warnings, page boundaries, and source hash.
- Re-audit every cite site for that bibliography key only.
- Update the existing report in place while retaining prior-run provenance.
- Work fully offline with a local runner and attached PDF.
- Detect moved/changed source files by hash.
- Provide clear/remove source actions.

Do not store only a path — use content-addressed `SourceArtifact` metadata (hash, size, extraction cache). **Shipped in 1.3.0** as `sourceArtifactsByBibKey` (supersedes the earlier `attachedPdfByBibKey` path-only scaffold).

#### 1.2.6 — Raqim Resolve core

Split the current oversized R2/R3 scope.

**First ship:**

- Manual lookup key: title, DOI, PMID, PMCID, URL.
- Ranked Crossref/PubMed/OpenAlex/DataCite candidates.
- Provider, confidence score, matched fields, and mismatch reasons.
- Explicit user selection before applying.
- Per-row verify/autocorrect.
- No silent candidate application.

**Then, as a separate extension, add host connectors:**

- Hugging Face model/dataset metadata.
- Kaggle datasets.
- Zenodo/DataCite.
- GitHub releases where appropriate.

A Hugging Face model card is not automatically equivalent to a technical report. The UI must distinguish artifact citation, model card, dataset, software release, and scholarly report.

**Legislation (separate extension — see §5 → 1.4.0 Raqim Statute):** Laws, regulations, and directives are not Crossref records. Host connectors for ML artifacts must not be reused as “legislation resolvers.” Prefer structured **official-catalogue URL patterns** (EU ELI first) plus offline field validation — not one bespoke national API per country.

### 1.2.7–1.2.9, if those slots are retained

Do not label them “TBD.” Recommended outcomes:

| Version | Outcome |
|---------|---------|
| **1.2.7 — Projects** | Save/open/recover a complete local Nassila project; Help → website; doc sync; first-run bibliography path |
| **1.2.8 — Maktab O2 + a11y** | Offline language packs, golden OCR fixtures, page provenance, enhanced-OCR control, cache management; loop table keyboard navigation |
| **1.2.9 — Submission preflight** | Unresolved-identity gate, mapping-coverage summary, accessibility/keyboard pass, local diagnostic / quality ledger export |

### 1.3.0 — Sharh-lite

Sharh-lite summarizes structured evidence — not another unconstrained LLM call.

**Shipped in 1.3.0:**

- Supported / weak / contradicted / not-found style rollups and next actions.
- Source-coverage limitations and unmapped-citation signals.
- Invalid or missing quote warnings (with quote chips).
- Help → website deep links.

**Deferred to later cuts (do not treat as 1.3.0 gaps):**

- Project action log; fuller submission integrity bundle → **1.7.0**.
- Mid-LLM abort / AbortSignal → **1.7.0**.
- Broader RTL acceptance + OCR golden fixtures → **1.6.0**.
- Five-to-ten real researcher usability sessions → ongoing / post-1.4.

**Shipped in 1.6.0 (T3):** richer **deterministic** summaries — report headline
sentence, per-finding one-line explanations (claim mix, quote misses,
unresolved identity, coverage), `coverageBreakdown` / `passageBuckets` /
`claimBreakdownByFinding` aggregates on `SharhLiteSummary` feeding the
integrity bundle. Still no new LLM call; copy stays i18n-localized
(`src/renderer/utils/sharh-copy.ts`).

*(Legislation-aware Resolve detail lives under **§5 Future release map → 1.4.0 Raqim Statute**.)*

---

## 6. NassilaT and Tier 3 plan

### Freeze S12/S14 while rebuilding evaluation around production

S12 and S14 are useful shipping baselines. Do not train S15 merely to recover S12’s combined metric.

**Immediate sequence:**

1. ~~Evaluate S12/S14 with the exact production prompt.~~ **Done** (single-seed; see `PROMPT_CONTRACT_REEVAL.md`). Optional multi-seed remains.
2. ~~Curate the July field notes~~ **Done** (W3 **49/49** → boost JSONL).
3. Improve source chunking / locators (**1.6.0**); keep passage-window quality under eval.
4. Re-run real manuscripts after labels + chunking polish.
5. Decide whether the remaining errors are model errors.
6. Only then define S15’s data objective.

### Keep S15 training parked

Parallel work should mean **data curation only**, not Vast GPU spend.

- **Park** abstract-only combined-score recovery (repeats v1.13 cap/trim risk).
- **Allow parallel:** reviewing masdar-lite field notes into boost JSONL; locking Tier 3 schemas; piloting OA fetch; **PDF-body holdout drafting + S14 offline scoring** (2026-07-22 draft: 84 rows, 96.4% expect / 98.8% parse — not product GO); app tracks.
- **Un-park S15 train only when:** explicit go/no-go after quote ≥98% on a **frozen** body holdout (and/or clear model gap vs pipeline), preserving h-045/h-088 behavior. See NassilaT [`EVAL_GONOGO_TIER3_MEMO.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/EVAL_GONOGO_TIER3_MEMO.md).

### Separate three evaluations

Current Sanad evaluation mostly measures grounding given a supplied excerpt. Tier 3 requires three independent suites:

1. **Retrieval evaluation** — Was the correct source found? Did top-k chunks contain the needed evidence? Was locator correct?
2. **Grounding evaluation** — Given a gold excerpt, did Sanad produce correct claims, verdicts, and quotes?
3. **End-to-end product evaluation** — Mapping → Raqim → Masdar → Sanad → UI/report uncertainty.

Without this separation, a retrieval error is incorrectly treated as a model error.

### Build a real full-text holdout before training

**Progress (2026-07-24):** Scale freeze **159** re-scored S12+S14 **98.74%** expect/quote. Contrastive false-supported S14 near gate. Batch3 DOI list ready for operator PDFs. Still **NO-GO train**; e2e pending. Details: NassilaT [`EVAL_GONOGO_TIER3_MEMO.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/EVAL_GONOGO_TIER3_MEMO.md).

The planned 30–50-row Tier 3 holdout is enough for a pilot, not a product gate.

**Recommended progression:**

- Pilot: 30 documents, approximately 150 adjudicated claims.
- Product gate: at least 100 documents and 400–500 claims.
- Document-level split by DOI/source hash.
- Balanced supported, weak, contradicted, not-in-source, and insufficient cases.
- Methods/results/table-caption slices.
- OCR and publisher-layout slices.
- English and Arabic reported independently.
- Two reviewers plus adjudication for ambiguous labels.
- Frozen test set never used for boost rows.

### Improve source chunking before a Masdar model

Current source selection ranks sentence-like fragments by token overlap and concatenates them until the character cap. It loses page boundaries and can reorder disconnected sentences.

A deterministic baseline should first provide paragraph/page chunks, citation-aware ranking, neighboring context, stable source order, deduplication, offsets, and retrieval confidence. Only train `source_pdf_extract` if this baseline fails a defined benchmark.

### Treat Maktab’s LLM facet the same way

PDF/DOCX ingestion already has deterministic extraction. Define precisely what M01 would add (section classification? heading repair? reading-order repair? citation segmentation?). Do not train a generic “PDF to text” facet without demonstrating improvement over pdf.js/Tesseract.

### Dataset governance after the v1.13 lesson

Future datasets need:

- Immutable dataset manifests and hashes.
- Per-category quotas rather than global trimming.
- Diff reports showing which examples entered and left.
- Document/source-level contamination checks.
- Prompt-contract version in every generated artifact.
- Label provenance: synthetic, corpus-generated, operator, or human-adjudicated.
- Model-card linkage to exact dataset/eval manifests.

### Arabic gate

Before retaining an unqualified Arabic model claim:

- Add native Arabic manuscript passages and Arabic/English source combinations.
- Test mixed-script references and numbers.
- Report Arabic JSON, quote, and false-supported metrics separately.
- Use a domain-fluent reviewer rather than automatic translation alone.

### Tier 3 workstreams (dependencies)

| # | Workstream | Repo | Status | Unblocks |
|---|------------|------|--------|----------|
| W1 | App throughput, quote chip, Masdar attach (former 1.2.2–1.2.5) | Nassila | **Done** in 1.3.0 | Real Tier 3 UX + more field notes |
| W2 | Maktab OCR O2 (bundled packs) | Nassila | **Done** in 1.3.0; O4 golden fixtures → **1.6.0** | Scan-quality ingest for M01 |
| W3 | Masdar-lite field-note curation | NassilaT | **Done** (49/49 → boost JSONL) | S15+ / FT boost JSONL |
| W4 | `fetch_oa_fulltext.py` pilot (100 DOIs) | NassilaT | **Done** (100 OA DOIs) | `source_pdf_extract` rows |
| W5 | Lock `doc_extract` / `source_pdf_extract` schemas | NassilaT | Open (after W4) | M01 / Md01 dataset collection |
| W6 | `eval_holdout_body_*.jsonl` (30–50 rows) | NassilaT | **Draft** (5 pilot + ≤100 abstract-proxy rows; product-scale freeze still open) | Tier 3 Sanad eval |
| W7 | Maktab gold manuscripts (50–100) | NassilaT + manual | Not started (after W5) | M01 QLoRA smoke only if deterministic fails |
| W8 | Tier 3 Sanad train (body chunks) | NassilaT | Parked until W6 product freeze + written model-gap memo | Tier 3 product ship |
| W9 | S15+ abstract recovery (optional) | NassilaT | Parked / superseded by FT-6 sole tier | Historical |
| W10 | Raqim legislation + web (1.4–1.5) | Nassila | **Done** (through 2.0.0) | Bibliography quality (orthogonal) |

**Tier 3 product claim:** Retrieval, gold-excerpt, e2e, Maktab OCR, and Shahid multimodal suites all **PASS** → GO memo signed 2026-09-06 → **2.0.0 SHIPPED**. Canonical W-status: NassilaT [`OUROBOROS_OPERATOR_MAP.md`](../../NassilaT/training/OUROBOROS_OPERATOR_MAP.md).

### Phased 6–12 month recommendation

| Window | Focus |
|--------|--------|
| **Shipped (2.0.0)** | Shipped 1.4.0–2.0.0. Hub Sanad = **9B FT-6** (2026-08-21). Native pdf-inspector + pretrained Arabic adapter LIVE; Shahid table/figure evidence LIVE; grey-lit confirm LIVE; Tier 3 + multimodal gates PASSED. |
| **Shipped (2.1.1)** | Arabic OCR fidelity. Indra reads Arabic scans when downloaded; Paddle is the fallback. |
| **NO-GO** | **2.2.0 Sanad Arabic** — FT-7 and FT-7b NO-GO. FT-7c frozen and paused for budget. |
| **Then** | 2.3.0–2.5.0 deterministic loop; **3.0.0 Ouroboros**; 3.1–4.2 facets/surfaces; **5.0.0 One Nassila**. |
| **Unversioned** | Cloud-default LLM, notification center, thesis generation, fuzzy auto-apply, cloud sync — non-goals or rejected. |

---

## 7. Product coherence addendum

Cross-repo review notes. Items marked **shipped** were delivered in the 1.3.0 train; remaining gaps map to **1.4–1.7**.

### Align first-run onboarding

**Residual.** Manuscript remains the default surface; doctrine still prefers Bibliography-first for first-time users.

**Follow-up:** guided first-run checklist or dismissible banner (polish; not blocking 1.4).

### Define “New Session”

**Residual.** Clarify unified clear semantics (citations vs manuscript vs report) when touching session model again (**1.7** projects fidelity).

### Loop accessibility

**Partial — shipped in 1.3.0** (loop keyboard nav in former 1.2.8). Re-verify RTL + table edge cases in **1.6** a11y pass.

### PDF attach wiring

**Shipped in 1.3.0** — `sourceArtifactsByBibKey` flows into `startManuscriptAudit`. Re-check i18n for any leftover “coming soon” attach copy during doc refresh (§8).

### Help and discoverability

**Shipped in 1.3.0** — Help → website. Keep locale-aware deep links honest as docs move.

### Privacy-respecting quality measurement

**Partial — shipped** opt-in diagnostic / preflight path in 1.3.0. Broaden submission integrity bundle in **1.7.0**; still no remote manuscript telemetry by default.

### Coherence scorecard (post-1.3.0)

| Dimension | Coherent? | Notes |
|-----------|-----------|-------|
| Ouroboros not Hydra | Yes | Renderer matches PRODUCT/DESIGN |
| Bibliography-first | Partial | Doctrine strong; first-run entry still Manuscript-default |
| Local-model setup | Yes | Web canonical + settings; keep USER_GUIDE synced |
| Evidence transparency | Yes | Quote chips + Sharh-lite; denser provenance in 1.6–1.7 |
| Bilingual UX | Yes | EN/AR parity; Sanad AR **unvalidated** (§3.6) |
| Release positioning | Yes | Baseline **2.0.0**; website train synced at each cut |
| Onboarding | Partial | Website good; in-app first-run still thin |
| Documentation | Partial | Stub language / dead `POST_V114` links still need §8 pass |
| Persistence | Partial | `.nassila` save/open live; dirty-close / recovery → 1.7 |
| Telemetry / quality | Partial | Opt-in local diagnostics; no remote default |
| Accessibility | Partial | Loop keyboard nav shipped; RTL acceptance → 1.6 |
| Failure recovery | Partial | Cancel/scheduler shipped; mid-LLM abort → 1.7 |

---

## 8. Documentation governance

### Layered authority (one writer per concern)

```text
L0  NassilaT/training/OUROBOROS_OPERATOR_MAP.md
    Schedule · phase checklist · cross-repo status

L1  Nassila/STATE.md
    Session snapshot only (P0, blockers, last run)

L2  Nassila/docs/FEATURES-AND-TWEAKS.md
    Acceptance criteria + FEATURES # ids only

L3  Nassila/CHANGELOG.md
    Immutable shipped history

L4  Vision / agent (slow cadence)
    PRODUCT.md · OUROBOROS.md · OUROBOROS_CONTEXT.md
    Distinguish: module live vs LLM facet planned

L5  User / public
    USER_GUIDE · HOW_TO_GUIDE · nassila-web release-train

L6  Technical specs
    MAKTAB_OCR.md · SECURITY-FIX-PLAN.md
```

### Naming rules

1. **App:** current `package.json` version (**2.0.0** baseline; do not bump to 2.1.0 until GO) — never freeze headers at older cuts.
2. **Models:** **FT-6 / 9B** sole published Hub tier; S12/S14/S15 only in historical/archive docs.
3. **Workers:** two columns everywhere — **Deterministic stage** (Live / Partial / Planned) vs **LLM facet** (Planned / M01 / etc.).

### Ship ritual

On each app release X.Y.Z:

1. `package.json` version + git tag.
2. `CHANGELOG.md` — move [Unreleased] → `[X.Y.Z]`.
3. Operator map — move row to Shipped; check §G; bump Last updated.
4. `STATE.md` — latest app, last run.
5. FEATURES — `[x]` acceptance for shipped #ids; bump Status date.
6. nassila-web release-train + roadmap MDX when a **future cut** (§5 map) is announced.
7. USER_GUIDE / HOW_TO for behavior changes.
8. Grep for `POST_V114_MAP` → replace with `OUROBOROS_OPERATOR_MAP`.
9. Vision docs quarterly or on milestone only.

### Immediate doc fixes (documentation only)

1. Replace all `POST_V114_MAP.md` → `OUROBOROS_OPERATOR_MAP.md`.
2. Reconcile Masdar/Maktab maturity language (deterministic live vs LLM facet planned).
3. Refresh stale headers (FEATURES date, OUROBOROS_CONTEXT date, operator map status, ROADMAP) to **1.3.0** baseline.
4. Check off shipped FEATURES acceptance for the 1.3.0 train; archive pre-implementation problem statements.
5. Fix operator map Planned table vs shipped 1.3.0 consolidation.
6. Update `MAKTAB_OCR.md`, `LOOP.md`, `USER_GUIDE.md`, `HOW_TO_GUIDE.md` (L3 live; OCR packs bundled).
7. Annotate CHANGELOG 1.1.3 DOI↔title as superseded by 1.2.1 #4c.
8. Keep this Future doc’s §3 status lines in sync when residuals close in 1.6–1.7.

### Website metrics honesty

If Sanad validation metrics appear on the site, do not publish bare “accuracy.” Include harness size, prompt version, synthetic/real composition, what the metric does and does not mean, per-language coverage, and known limitations.

---

## 9. Implementation matrix (current vs planned)

**Baseline:** app **2.1.1** (2026-10-23). Model **9B FT-6** (sole published Hub Sanad tier, Qwen 3.5 9B v119); 4B S15 / 12B S14 retired.

### Shipped

| Release | Codename (EN) | Codename (AR) | Status |
|---------|---------------|---------------|--------|
| 2.1.1 | Arabic OCR fidelity | دقة OCR العربي | **Shipped** 2026-10-23 — line order, legacy-encoded routing, Indra when downloaded, Paddle otherwise |
| 2.1.0 | Maktab Arabic | مكتب عربي | **Shipped** 2026-09-18 — production Paddle AR OCR + Arabic-aware mapping; L3 unvalidated |
| 2.0.0 | MaktabOCR + Shahid | مكتب OCR + شاهد | **Shipped** 2026-09-06 — Firecrawl native + pretrained Arabic adapter; Shahid table/figure live; Tier 3 + multimodal PASS |
| 1.10.1 | Packaged network parity | تكافؤ الشبكة المعبأة | **Shipped** 2026-08-23 |
| 1.10.0 | Masdar Papers | أوراق مصدر | **Shipped** 2026-08-22 |
| 1.8.0 | Sanad 9B | سند 9B | **Shipped** 2026-08-13 (Shahid **not** included) |
| 1.7.0 | Integrity Bundle | حزمة النزاهة | **Shipped** 2026-08-10 |
| 1.6.0 | Maktab Loop | حلقة المخطوطة | **Shipped** 2026-08-05 |
| 1.5.0 | Raqim Web | رقيم ويب | **Shipped** 2026-07-29 |
| 1.4.0 | Raqim Statute | رقيم تشريع | **Shipped** 2026-07-21 |
| 1.3.0 | Sharh-lite | موجز شرح | **Shipped** 2026-07-20 (consolidates 1.2.2–1.2.9 train + EU ELI partial) |
| 1.2.1 | Masdar UX | تفاعل مصدر | Shipped |
| 1.2.0 | Masdar-lite | موجز مصدر | Shipped |

### Planned (see §5 Future release map)

| Release | Codename (EN) | Codename (AR) | Status |
|---------|---------------|---------------|--------|
| 2.2.0 | Sanad Arabic | سند عربي | Planned — FT-7 and FT-7b **NO-GO**; FT-7c frozen, **paused for budget** |
| 2.3.0 | Masdar Auto | مصدر آلي | Planned — auto cited-PDF; proxy prefixes; provenance |
| 2.4.0 | Tasnif Risk | تصنيف المخاطر | Planned — retraction / version / predatory cadence |
| 2.5.0 | Projects Ledger | سجل المشروع | Planned — action log; New Session; autosave |
| 3.0.0 | Ouroboros | أوروبوروس | Planned — closed loop; signed installers; SEC-02b |
| 3.1.0 | Sharh Explain | شرح موسّع | Planned — GPU |
| 3.2.0 | Raqim Signals | إشارات رقيم | Planned — GPU |
| 3.3.0 | Sanad Bilingual | سند ثنائي اللغة | Planned — GPU; EN+AR only |
| 4.0.0 | Cross-platform | منصات متعددة | Planned — macOS/Linux installers; Tauri v2 + Rust migration **and** native/packaging prune (<50 MB installer needs all three; the prune is not gated on 4.0.0 — do it in the 2.2.0 pause) |
| 4.1.0 | Nassila CLI | سطر أوامر ناسيلا | Planned — on the 4.0.0 Rust core |
| 4.2.0 | Shahid Vision | شاهد بصري | Planned — GPU; separate vision artifact targeting the 4.0.0 `ort` runtime |
| 5.0.0 | One Nassila | ناسيلا واحدة | Planned — routed pack; webview last resort; review packages. **Non-goal:** merged GGUF |

> FT-6 shipped on Hub 2026-08-21 — **no 1.9.0 installer slot**.
### Long-term (see §5 · remaining unversioned)

| Item | Theme | Status |
|------|-------|--------|
| Merged Ouroboros GGUF (`nassila-agent-e12b-v1`) | Training | **Non-goal under 5.0.0** |
| Train every worker (naming symmetry) | Training | Long-term — M01/Md01 only if deterministic fails |
| Cloud LLM as default | Product | Long-term / non-goal |
| Notification center | UX | Long-term / rejected |
| Thesis generation / open drafting | Product | Long-term / non-goal |
| Collaboration / cloud project sync | Product | Long-term — 5.0 ships offline packages instead |
| Fuzzy auto-apply (registry / gray lit) | Raqim | Long-term |
| French / third-language Sanad L3 | Training | **Non-goal** — EN + AR only |

### Residual engine gaps (shipped in 1.4.0–2.0.0)

R1 resolver/parser items below shipped with Raqim Repair / Resolve. See operator map § D.

| Item | Notes |
|------|--------|
| PMCID in L1 `resolveRegistry` | Shipped |
| arXiv URL → DOI | Shipped |
| OUP `article-abstract` | Shipped |
| Springer `/chapter/` | Shipped |
| DeLong-class parser | Shipped |
| Software false-positive guard | Shipped |
| Genre-aware APA | Shipped |
| Operator regression fixtures | Shipped (legislation + web expanded in 1.4–1.5) |

### Architecture seams (remaining)

```text
Renderer / main-process
  ├─ Audit orchestration — shipped 1.3.0; tune rate limits in 1.7.0
  ├─ resolveRegistry / alignMetadata — verify packaged IPC parity (1.7.0)
  ├─ resolveL3Source → window.api — AbortSignal threading (1.7.0)
  └─ runGroundingLlm → window.api.llmChat — cancel mid-call (1.7.0)

Future seams
  ├─ Legislation host patterns — EU / US / UK shipped in 1.4.x train
  ├─ Webpage host parsers — 1.5.0
  └─ Shahid pipeline — **2.0.0** after Tier 3 + multimodal eval gate (not 1.8.0)
```

---

## 10. Product metrics that matter

**North-star metric:**

> Percentage of cited claims with a complete, reviewable evidence chain and no unresolved reference-identity conflict.

**Supporting metrics:**

- Cite-to-reference mapping coverage.
- Ambiguous and unmatched citation count.
- Correct-source resolution rate and false-match rate.
- Full-text, abstract-only, and unavailable coverage.
- Retrieval Recall@k against gold evidence.
- Final false-pass rate after deterministic guards: target zero.
- Quote-validity rate.
- Time to first completed reference.
- Total 50-reference audit time.
- Cancellation latency.
- Re-audit time for one changed reference.
- Repair completion rate.
- Project save/reopen fidelity.
- OCR extraction and bibliography-detection quality by language.
- Arabic and English grounding metrics reported separately.

Do not add remote manuscript telemetry by default. Prefer an explicit “Export diagnostic bundle” containing redacted timings, status codes, versions, hashes, and failure categories.

---

## 11. Long-term (detail)

Canonical table: **§5 → Long-term (remaining unversioned)**. Promoted items: Shahid Vision **4.2.0**; institutional webview last-resort + routed pack **5.0.0**; library proxy prefixes **2.3.0**. Merged GGUF is a **5.0.0 non-goal**, not a research leftover.

**Do not prioritize before 2.1–2.5 + 3.0 unless promoted with acceptance criteria.**

| Item | Notes |
|------|-------|
| Routed multi-artifact pack (not one GGUF) | **Promoted → 5.0.0** — prefer independently gated artifacts (§4) |
| Merged Ouroboros GGUF (`nassila-agent-e12b-v1`) | **Non-goal under 5.0.0** — do not train, merge, or market one seven-task weight file |
| Shahid full multimodal | **Promoted → 4.2.0** — distinct from **2.0.0** bounded tables/figures slice; targets the **4.0.0** `ort` runtime |
| Embedded institutional-login webviews | **Promoted → 5.0.0 last resort** after proxy prefixes in **2.3.0**; SEC-06; publisher ToS |
| Train every worker for naming symmetry | Facets train on task gates, not worker count; M01/Md01 only if deterministic fails |
| Cloud LLM as default | Non-goal — local Sanad path stays primary |
| Notification center | Rejected — no drawer/history product |
| Generic writing or thesis generation | Non-goal — bounded verdict + repair only |
| Collaboration / cloud project sync | Requires sync model beyond local `.nassila`; 5.0 ships offline review packages |
| Automatic application of fuzzy registry or gray-literature matches | Near-term: user confirms before apply |

**For institutional access, first exhaust:**

1. Open-access fetch.
2. User-attached local PDFs.
3. “Open DOI in browser” and reattach.
4. Configurable library proxy prefixes (**2.3.0**).

An embedded authenticated browser should be the last option (**5.0.0**) because it creates credential, cookie, publisher-policy, and security complexity.

---

## 12. Top risks

| Risk | Severity | Status | Detail |
|------|----------|--------|--------|
| Registry/OA rate limits under audit concurrency | High | **Mitigated 1.7** | Scheduler + semaphore pools (`DEFAULT_AUDIT_CONCURRENCY`) + 429/503 retry shipped |
| Non-cancellable mid-LLM calls | High | **Mitigated 1.7** | AbortSignal threaded through `services.llmChat` → `executeLlmChat` → `fetch` |
| Concurrency + cancel interaction | Medium | **Mitigated 1.7** | Run IDs / pools shipped; store consistency covered by run-isolation tests |
| Packaged manuscript L1 soft-fail (CSP) | High | **Mitigated** | Main-process audit IPC; packaged smoke PASS |
| False L3 pass on parse fail / LLM off | High | **Mitigated** | Phase 0-C invariant + deterministic supported-claim downgrade guardrail |
| Prompt contract drift (app vs train) | High | **Mitigated** | `sanad-grounding-v1` synced; optional multi-seed remains |
| Raqim legislation / web scope creep | Medium | Open → **1.4–1.5** | Pattern families + confirm-before-apply; no fuzzy auto-apply |
| OCR first-use network dependency | Medium | **Mitigated** | Bundled packs; warn if fallback path triggers |
| Project persistence gaps | Medium | **Partial 1.7** | `.nassila` live; dirty-close warning shipped 2026-08-10; crash recovery / action log remain → **2.5.0** then **3.0.0** |
| Release automation thin | Medium | Partial | CI + local smoke exist; public tag / checksums / signing → **3.0.0** |
| FT-7 Vast cash | High | **Paused** | FT-7 and FT-7b NO-GO; FT-7c frozen, not started; Vast only when cash returns; do not claim Arabic L3 |
| Stale docs misleading agents | Medium | Open | §8 doc pass: stubs, `POST_V114` links, vision “stub” wording |

---

## Final recommendation

Nassila should spend the next cycles becoming more **trustworthy on Arabic ingest and closed-loop repair** rather than merely broader.

**The single best strategy:**

> Ship production Arabic OCR and mapping without GPU (**2.1.0**); park FT-7 until cash (**2.2.0**); finish deterministic reach, risk, and persistence (**2.3–2.5**); then close the repair loop (**3.0.0**) before new model facets.

**Shipped in 2.1.1:** Arabic line order, legacy-encoded routing, pdf-inspector 1.25.2, in-app Indra with a Paddle fallback. **Arabic L3 still unvalidated.**

**Next (§5 map):**

1. **2.2.0 Sanad Arabic** — paused for budget. Do not start FT-7c. Vast is the only ground when cash returns.
2. **2.3.0–2.5.0** — auto cited-PDF, Tasnif risk, projects ledger.
3. **3.0.0 Ouroboros** — closed loop, signed installers, SEC-02b.
4. **3.1–5.0** — trained facets, CLI, cross-platform, routed pack — as budget and gates allow.

**Unversioned / non-goals:** cloud-default LLM, notification center, thesis generation, fuzzy auto-apply, cloud sync, **merged Ouroboros GGUF**. M01/Md01 stay gated.

If done in that order, Ouroboros becomes more than worker branding: it becomes a defensible academic integrity workflow that few reference managers or generic AI tools currently provide.

---

## Related reading

| Doc | Role |
|-----|------|
| `NassilaT/training/OUROBOROS_OPERATOR_MAP.md` | Current operator checklist / schedule |
| `Nassila/docs/FEATURES-AND-TWEAKS.md` | Feature acceptance specs |
| `Nassila/STATE.md` | Session focus + blockers |
| `Nassila/docs/PRODUCT.md` | Product IA (Ouroboros not Hydra) |
| `Nassila/docs/OUROBOROS_CONTEXT.md` | Agent brief / workers / tiers |
| `NassilaT/training/PHASE3_TIER3_GROUNDWORK.md` | Tier 3 training plan |
| `NassilaT/docs/DUAL_TIER_POLICY.md` | E4B vs 12B gates |
| `NassilaT/training/EVAL_GONOGO.md` | Model GO/NO-GO history |
| `nassila-web/lib/release-train.ts` | Public release train — repopulate when §5 future cut ships |
