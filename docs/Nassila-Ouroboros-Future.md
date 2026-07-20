# Nassila-Ouroboros Future

**Date:** 2026-07-20  
**Scope:** Nassila (app) · NassilaT (training) · nassila-web (docs)  
**Sources reviewed:** `NassilaT/training/OUROBOROS_OPERATOR_MAP.md`, `Nassila/docs/FEATURES-AND-TWEAKS.md`, `STATE.md`, `PRODUCT.md`, `OUROBOROS_CONTEXT.md`, `CHANGELOG.md`, engine/renderer code, field notes, website release train

**App baseline:** **1.3.0 · Sharh-lite** (2026-07-20). **Sanad checkpoints:** S12 (E4B) · S14 (12B). **S15:** parked (NassilaT).

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
7. Only then S15, trained Maktab/Masdar facets, institutional access, Shahid, or a merged model.

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
- Human adjudication **in progress:** **14/49** labeled (2026-07-18); not yet boost JSONL.

**Still before S15:** source-side paragraph/page chunking + locators (**1.6.0**); evaluate context quality separately from model quality; finish field-note labels → boost JSONL (never into frozen holdout).

### 3.5 App vs training prompt contract

**Status:** **Shipped** for continued use — contract `sanad-grounding-v1`; Nassila ↔ NassilaT goldens byte-identical; S12/S14 single-seed production-prompt re-eval recorded (`PROMPT_CONTRACT_REEVAL.md`). **S15 still parked.**

**Residual:** optional multi-seed re-eval; investigate S14 quote bar miss on Ollama run; keep prompt version/hash on model cards and audit exports; train S15 only on a measured model gap after §6.

### 3.6 Arabic Sanad validation

**Status:** **Open** — unchanged.

UI AR support is live; Sanad training JSONL has **zero** Arabic-script grounding rows (~18k). Qualify Arabic grounding as **unvalidated** until a native AR slice exists.

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

> One Nassila configuration and routing experience; as many model artifacts as independently pass their task gates.

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
| **1.6.0** | **Maktab Loop** | **حلقة مكتب** | Maktab / Masdar | OCR fixtures; one-upload loop; source chunking polish |
| **1.7.0** | **Integrity Bundle** | **حزمة النزاهة** | Loop / export | Preflight+; submission export; trust & packaged parity |
| **1.8.0** | **Shahid** | **شاهد** | Shahid (+ Sanad) | Tier 3+ multimodal; model-assisted grey lit (confirm-before-apply) |

**Recommended cut order:** 1.4.0 → 1.5.0 → 1.6.0 → 1.7.0 → (NassilaT eval gate) → 1.8.0.

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

#### 1.6.0 — Maktab Loop · حلقة مكتب

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
| **Preflight+** | Stronger unresolved-identity gate; mapping-coverage summary in UI |
| **Export** | Submission integrity bundle (audit + bibliography + provenance metadata) |
| **Projects** | Action log; save/reopen fidelity; edge-case recovery |
| **Cancel** | Mid-LLM abort when IPC supports `AbortSignal` |
| **Packaged parity** | Remaining renderer vs main-process registry paths; audit rate limiting under concurrency |
| **CI** | Packaged smoke gates on release train |

#### 1.8.0 — Shahid · شاهد

**Gate:** Tier 3 full-text holdout (pilot → product gate) and separate retrieval vs grounding vs end-to-end eval — see §6.

| Area | Deliverable |
|------|-------------|
| **Shahid** | Table/figure evidence path (today disabled) |
| **Grey lit (model-assisted)** | Suggest CSL fields from page signals; platform typing — **user confirms before apply** |
| **Sanad** | S15 **only if** §6 go/no-go after 1.4–1.7 measurements |

---

### Parallel tracks (not app semver)

| Track | Status | Notes |
|-------|--------|-------|
| **Sanad S15+** | Parked | NassilaT; un-park when field notes + Tier 3 holdout exist |
| **NassilaT field notes / Tier 3 data** | Active curation | Never surfaces training/eval copy in app UI |
| **nassila-web** | Ongoing | Changelog sync; optional Sanad validation table on local-models |
| **Website release train** | Empty until cut | `RELEASE_TRAIN: []` after 1.3.0 — repopulate when 1.4.0 is announced |

### Worker maturity (direction)

| Worker | Today (1.3.0) | Target (via map above) |
|--------|----------------|-------------------------|
| **Raqim** | L1/L2, Resolve, partial EU legislation | 1.4–1.5: statute + web gray lit |
| **Sanad** | L3; S12/S14 | Deeper Masdar text; S15 only if eval gap |
| **Masdar** | OA PDF + attach | 1.6: auto cited-PDF ingest; chunking |
| **Maktab** | pdf.js + OCR O2 | 1.6: fixtures, provenance |
| **Sharh** | Sharh-lite deterministic | Richer templates; LLM facet only if warranted |
| **Tasnif** | Inline deterministic | 1.5: grey-web typing with confirm |
| **Shahid** | Off | 1.8: tables/figures |

### Long-term (not versioned)

**After 1.4–1.8** and the Tier 3 eval gate — no semver, no dates, not on the public release train until promoted deliberately. Canonical list; detail and institutional-access ladder in **§11**.

| Item | Theme | Why long-term / promotion gate |
|------|-------|--------------------------------|
| **Merged seven-worker GGUF** | Models | One weight file risks task interference, larger downloads, and E4B tier loss — prefer one Nassila routing experience with independently gated artifacts (§4) |
| **Shahid full multimodal** | Shahid | **1.8.0** ships a bounded tables/figures slice; full multimodal grounding needs its own eval gate beyond Tier 3 |
| **Institutional login webview** | Masdar / access | SEC-06, credentials, publisher policy — last resort after OA → attach → browser → proxy (§11) |
| **Train every worker for naming symmetry** | Training | No user value until each facet passes an independent task gate |
| **Cloud LLM as default** | Product | Local Sanad (S12/S14) remains primary — `PRODUCT.md` non-goal |
| **Notification center** | UX | Rejected scope — lightweight toasts only (`FEATURES-AND-TWEAKS.md`) |
| **Thesis generation / open drafting** | Product | Integrity workflow, not authoring — `OUROBOROS.md` / `PRODUCT.md` non-goal |
| **Collaboration / cloud project sync** | Product | Needs durable project model, conflict rules, and privacy design beyond `.nassila` |
| **Fuzzy auto-apply (registry / gray lit)** | Raqim | Conflicts with identity-safe **manual apply** — near-term path is confirm-before-apply (1.5 / 1.8) |

**Promotion rule:** A long-term item gets a version slot only when (a) 1.4–1.8 gaps it addresses are closed or explicitly deferred, (b) acceptance criteria exist in `FEATURES-AND-TWEAKS.md`, and (c) security/privacy review is done where applicable.

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

*(Legislation-aware Resolve detail lives under **§5 Future release map → 1.4.0 Raqim Statute**.)*

---

## 6. NassilaT and Tier 3 plan

### Freeze S12/S14 while rebuilding evaluation around production

S12 and S14 are useful shipping baselines. Do not train S15 merely to recover S12’s combined metric.

**Immediate sequence:**

1. ~~Evaluate S12/S14 with the exact production prompt.~~ **Done** (single-seed; see `PROMPT_CONTRACT_REEVAL.md`). Optional multi-seed remains.
2. Curate the July field notes (**14/49**; continue).
3. Improve source chunking / locators (**1.6.0**); keep passage-window quality under eval.
4. Re-run real manuscripts after labels + chunking polish.
5. Decide whether the remaining errors are model errors.
6. Only then define S15’s data objective.

### Keep S15 training parked

Parallel work should mean **data curation only**, not Vast GPU spend.

- **Park** abstract-only combined-score recovery (repeats v1.13 cap/trim risk).
- **Allow parallel:** reviewing masdar-lite field notes into boost JSONL; locking Tier 3 schemas; piloting OA fetch; app tracks.
- **Un-park S15 train only when:** human-reviewed field-note boosts **or** Tier 3 body holdout exists, plus explicit go/no-go criteria that preserve h-045/h-088 behavior.

### Separate three evaluations

Current Sanad evaluation mostly measures grounding given a supplied excerpt. Tier 3 requires three independent suites:

1. **Retrieval evaluation** — Was the correct source found? Did top-k chunks contain the needed evidence? Was locator correct?
2. **Grounding evaluation** — Given a gold excerpt, did Sanad produce correct claims, verdicts, and quotes?
3. **End-to-end product evaluation** — Mapping → Raqim → Masdar → Sanad → UI/report uncertainty.

Without this separation, a retrieval error is incorrectly treated as a model error.

### Build a real full-text holdout before training

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
| W3 | Masdar-lite field-note curation | NassilaT | **Active** (14/49 labeled) | S15+ boost JSONL |
| W4 | `fetch_oa_fulltext.py` pilot (100 DOIs) | NassilaT | Not started | `source_pdf_extract` rows |
| W5 | Lock `doc_extract` / `source_pdf_extract` schemas | NassilaT | Not started (after W4) | M01 / Md01 dataset collection |
| W6 | `eval_holdout_body_*.jsonl` (30–50 rows) | NassilaT | Not started (after W4–W5) | Tier 3 Sanad eval |
| W7 | Maktab gold manuscripts (50–100) | NassilaT + manual | Not started (after W5) | M01 QLoRA smoke (E4B) |
| W8 | Tier 3 Sanad train (body chunks) | NassilaT | Parked until W6 + W3 | Tier 3 product ship |
| W9 | S15+ abstract recovery (optional) | NassilaT | Parked | Higher combined on S14 base |
| W10 | Raqim legislation + web (1.4–1.5) | Nassila | **Next** app cuts | Bibliography quality (orthogonal) |

**Critical path to Tier 3 train:** W4 → W5 → W6 → W8. App parallel: **1.4 → 1.5 → 1.6 (chunking) → 1.7**, then Tier 3 gate → 1.8.

### Phased 6–12 month recommendation

| Window | Focus |
|--------|--------|
| **Now (post-1.3.0)** | Cut public 1.3.0 when ready. No S15 Vast. Field-note curation (W3). Doc refresh. Start **1.4.0 Raqim Statute**. |
| **Next** | Tier 3 data plane: OA fetch pilot, schemas, body holdout draft (W4–W6). Ship **1.5** then **1.6** (chunking + OCR fixtures). |
| **Then** | **1.7** Integrity Bundle. First Tier 3 trains only after holdout exists (W8; M01/Md01 only if deterministic fails). |
| **Later** | Tier 3 product claim → **1.8 Shahid**. Optional S15 / merge research only if Tier 3 stable. Phase 6 merge stays non-shipping. |

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
| Release positioning | Yes | Baseline **1.3.0**; website train empty until 1.4 announced |
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

1. **App:** current `package.json` version (**1.3.0** baseline) — never freeze headers at `1.1.x` / `1.2.1`.
2. **Models:** **S12** / **S14** in mixed docs; `v1.12`/`v1.14` only in NassilaT archive walkthroughs.
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

**Baseline:** app **1.3.0** (2026-07-20). Models **S12** (E4B) · **S14** (12B).

### Shipped

| Release | Codename (EN) | Codename (AR) | Status |
|---------|---------------|---------------|--------|
| 1.3.0 | Sharh-lite | موجز شرح | **Shipped** 2026-07-20 (consolidates 1.2.2–1.2.9 train + EU ELI partial) |
| 1.2.1 | Masdar UX | تفاعل مصدر | Shipped |
| 1.2.0 | Masdar-lite | موجز مصدر | Shipped |

### Planned (see §5 Future release map)

| Release | Codename (EN) | Codename (AR) | Status |
|---------|---------------|---------------|--------|
| 1.4.0 | Raqim Statute | رقيم تشريع | Planned — US/UK legislation patterns; parser hardening |
| 1.5.0 | Raqim Web | رقيم ويب | Planned — webpage / grey-web cites |
| 1.6.0 | Maktab Loop | حلقة مكتب | Planned — OCR fixtures; loop UX; Masdar chunking |
| 1.7.0 | Integrity Bundle | حزمة النزاهة | Planned — preflight+; submission export; trust parity |
| 1.8.0 | Shahid | شاهد | Planned — Tier 3+ gate; tables/figures; confirm-before-apply grey lit |

### Long-term (see §5 · not versioned)

| Item | Theme | Status |
|------|-------|--------|
| Merged seven-worker GGUF | Models | Long-term |
| Shahid full multimodal | Shahid | Long-term (1.8.0 = bounded slice) |
| Institutional login webview | Masdar / access | Long-term |
| Train every worker (naming symmetry) | Training | Long-term |
| Cloud LLM as default | Product | Long-term / non-goal |
| Notification center | UX | Long-term / rejected |
| Thesis generation / open drafting | Product | Long-term / non-goal |
| Collaboration / cloud project sync | Product | Long-term |
| Fuzzy auto-apply (registry / gray lit) | Raqim | Long-term |

### Residual engine gaps (address across 1.4–1.7 as needed)

| Item | Notes |
|------|--------|
| PMCID in L1 `resolveRegistry` | Verify packaged + manuscript parity |
| arXiv URL → DOI | Partial in repair train; fixture coverage |
| OUP `article-abstract` | Partial |
| Springer `/chapter/` | Partial |
| DeLong-class parser | Regression fixture |
| Software false-positive guard | Journal titles mentioning “software” |
| Genre-aware APA | Preprints / chapters / reports |
| Operator regression fixtures | Expand with legislation + web cases |

### Architecture seams (remaining)

```text
Renderer / main-process
  ├─ Audit orchestration — shipped 1.3.0; tune rate limits in 1.7.0
  ├─ resolveRegistry / alignMetadata — verify packaged IPC parity (1.7.0)
  ├─ resolveL3Source → window.api — AbortSignal threading (1.7.0)
  └─ runGroundingLlm → window.api.llmChat — cancel mid-call (1.7.0)

Future seams
  ├─ Legislation host patterns — EU shipped; US/UK in 1.4.0
  ├─ Webpage host parsers — 1.5.0
  └─ Shahid pipeline — 1.8.0 after Tier 3 eval gate
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

Canonical table: **§5 → Long-term (not versioned)**. Expanded notes below.

**Do not prioritize before 1.4–1.8 + Tier 3 gate unless promoted with acceptance criteria.**

| Item | Notes |
|------|-------|
| Merged seven-worker GGUF | Prefer routed multi-artifact setup (§4); merged bundle only if eval proves no regression |
| Shahid full multimodal | Distinct from **1.8.0** bounded slice — separate multimodal holdout required |
| Embedded institutional-login webviews | SEC-06; publisher ToS; cookie/credential handling |
| Train every worker for naming symmetry | Facets train on task gates, not worker count |
| Cloud LLM as default | Non-goal — local Sanad path stays primary |
| Notification center | Rejected — no drawer/history product |
| Generic writing or thesis generation | Non-goal — bounded verdict + repair only |
| Collaboration / cloud project sync | Requires sync model beyond local `.nassila` |
| Automatic application of fuzzy registry or gray-literature matches | Near-term: user confirms before apply (1.5 / 1.8) |

**For institutional access, first exhaust:**

1. Open-access fetch.
2. User-attached local PDFs.
3. “Open DOI in browser” and reattach.
4. Configurable library proxy prefixes.

An embedded authenticated browser should be the last option because it creates credential, cookie, publisher-policy, and security complexity.

---

## 12. Top risks

| Risk | Severity | Status | Detail |
|------|----------|--------|--------|
| Registry/OA rate limits under audit concurrency | High | Open → **1.7** | Scheduler shipped; polite-pool / rate limits not fully enforced |
| Non-cancellable mid-LLM calls | High | Open → **1.7** | Cancel exists; AbortSignal through `llmChat` still needed |
| Concurrency + cancel interaction | Medium | Partial | Run IDs / pools shipped; keep store consistent under abort |
| Packaged manuscript L1 soft-fail (CSP) | High | **Mitigated** | Main-process audit IPC; packaged smoke PASS |
| False L3 pass on parse fail / LLM off | High | **Mitigated** | Phase 0-C invariant; do not regress |
| Prompt contract drift (app vs train) | High | **Mitigated** | `sanad-grounding-v1` synced; optional multi-seed remains |
| Raqim legislation / web scope creep | Medium | Open → **1.4–1.5** | Pattern families + confirm-before-apply; no fuzzy auto-apply |
| OCR first-use network dependency | Medium | **Mitigated** | Bundled packs; warn if fallback path triggers |
| Project persistence gaps | Medium | Partial | `.nassila` live; dirty-close / recovery → **1.7** |
| Release automation thin | Medium | Partial | CI + local smoke exist; public tag / checksums / signing open |
| Stale docs misleading agents | Medium | Open | §8 doc pass: stubs, `POST_V114` links, vision “stub” wording |

---

## Final recommendation

Nassila should spend the next cycles becoming more **trustworthy on gray literature and submission export** rather than merely broader.

**The single best strategy:**

> Build a durable, reproducible, closed evidence-and-repair loop around the existing deterministic engine and S12/S14 models — then extend Raqim to legislation and web cites before Shahid or S15.

**Shipped in 1.3.0:** orchestration, quote chips, Resolve, attach, projects, OCR packs, Sharh-lite, EU ELI partial.

**Next (§5 map):**

1. **1.4.0 Raqim Statute** — legislation pattern families; no Crossref false fixes.
2. **1.5.0 Raqim Web** — webpage / grey-web deterministic path.
3. **1.6.0 Maktab Loop** — OCR fixtures; one-upload loop; chunking.
4. **1.7.0 Integrity Bundle** — preflight+; submission export; remaining packaged parity.
5. **Tier 3 eval gate** (NassilaT) — then **1.8.0 Shahid** and S15 only if measurements show a model gap.

**Long-term (§5):** merged GGUF, full Shahid multimodal, institutional webview, cloud-default LLM, collaboration sync, thesis generation, notification center, fuzzy auto-apply — unversioned until promoted.

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
