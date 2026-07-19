# Nassila-Ouroboros Future

**Date:** 2026-07-18  
**Scope:** Nassila (app) · NassilaT (training) · nassila-web (docs)  
**Sources reviewed:** `NassilaT/training/OUROBOROS_OPERATOR_MAP.md`, `Nassila/docs/FEATURES-AND-TWEAKS.md`, `STATE.md`, `PRODUCT.md`, `OUROBOROS_CONTEXT.md`, `CHANGELOG.md`, engine/renderer code, field notes, website release train

---

## Executive conclusion

Nassila has a strong and differentiated product idea: a local-first submission-integrity workstation that connects a manuscript claim to its citation, canonical record, source text, verbatim evidence, correction, and final export.

The “Ouroboros, not Hydra” direction is correct. The deterministic-core / LLM-assistant boundary is also exactly right.

However, the current roadmap prioritizes feature cadence and model iterations ahead of several trust-critical gaps. **Do not implement 1.2.2 as “bounded concurrency only.”** Before making audits faster, Nassila needs to ensure that the packaged app is running the same pipeline that was evaluated, cannot produce unsupported pass states, and can preserve work across sessions.

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

## 3. Trust-critical implementation findings

### 3.1 Packaged manuscript registry resolution needs a production-parity fix

The production renderer CSP explicitly says external network traffic must use IPC (`connect-src 'self'`). Bibliography verification follows that architecture through `registry:verifyUnified`. The manuscript audit does not: its renderer hook directly calls the registry engine, whose resolvers use normal `fetch`.

This is architecturally incompatible with the production CSP and can soft-fail as “unresolved” instead of exposing the actual transport problem.

**Before concurrency:**

- Move manuscript registry resolution to main-process IPC.
- Add packaged-build coverage, not only dev smoke.
- Return canonical metadata needed by L3, not merely mismatch counts.
- Add validation tests for the new IPC contract.

### 3.2 Current logic can report a passage pass without valid LLM grounding

For full-text sources, both a parse failure and disabled LLM can become a `pass` when lexical overlap is medium/high (`use-manuscript-audit.ts`).

That undermines the product promise. Lexical overlap is useful evidence retrieval, but it is not claim grounding.

**Required invariant:**

- No L3 `pass` unless structured claims parsed successfully and every supported claim has valid source quotes.
- LLM disabled → `not run`, not pass.
- Parse failure → warning/error, never pass.
- Deterministic overlap should be displayed separately as retrieval confidence.
- Quote validation should become structured engine output, not text embedded in a top-level reason.

The quote chip is therefore not only a UI enhancement; it needs a stronger result model.

### 3.3 Failed citation mapping can audit unrelated references against the manuscript opening

When no citation mapping succeeds, the code selects up to the first 80 bibliography entries. Entries without a cite span then receive a synthetic span at the start of the manuscript.

For a trust product, this fallback should not produce L3 findings.

**Instead:**

- Report mapping coverage before running L3.
- Distinguish matched, ambiguous, and unmatched citations.
- Do not ground unmatched references.
- Offer bibliography repair or manual mapping.
- Set a minimum mapping-coverage gate before a full audit.

### 3.4 Passage construction is likely hurting Sanad more than another training cycle would help

`buildPassageWindow` uses a fixed ±260-character slice. It can begin and end mid-word or mid-sentence.

The July field notes (`masdar-lite-jul13`) show:

- 49 grounding calls.
- 18 full-text and 31 abstract fallbacks.
- 45 calls flagged as truncated passages.
- 19 heuristic quote/claim echo flags.
- One parse error.
- Zero human labels across all 49 calls and 142 extracted claims.

This should lead to **context engineering before S15:**

- Build sentence- or paragraph-bounded windows.
- Preserve the cited sentence plus adjacent context.
- Remove reference markers from claim text where safe.
- Avoid swallowing section headings, tables, or neighboring unrelated claims.
- Record exact manuscript offsets.
- Evaluate context quality independently from model quality.

The field notes are useful raw material but not yet training data because their expected-verdict columns are entirely unreviewed.

### 3.5 App and training prompts are no longer equivalent

The app now uses:

- A substantial system prompt.
- Explicit untrusted-data instructions.
- XML-delimited manuscript and source blocks.

NassilaT’s `validate_dataset.py` still:

- Places the full older instructions inside the user message.
- Adds a separate one-line system message.
- Uses `PASSAGE:` / `SOURCE_EXCERPT:` formatting.
- Tests against its own old single-file golden fixture.

**Consequences:**

- S12/S14 metrics describe the prior inference contract.
- They do not directly establish performance under the currently shipped prompt.
- Security prompt changes may help or hurt JSON, quotes, and verdict distributions.

**Do not retrain immediately.** First:

1. Establish one versioned production prompt contract.
2. Run existing S12 and S14 binaries on the 115-row harness using the exact app messages.
3. Run the same test on the curated real-manuscript set.
4. Record prompt-contract version/hash in model cards and audit exports.
5. Train S15 only if the result identifies a model—not pipeline—gap.

### 3.6 Arabic product support is stronger than Arabic Sanad validation

Both model cards declare English and Arabic. A scan of the current grounding JSONL artifacts found **zero Arabic-script rows** across 18,207 grounding rows. The few Arabic rows in the repository occur in the broader paper corpus, not the Sanad task data.

This does not prove Gemma cannot handle Arabic. It does mean the Sanad task is not currently validated in Arabic.

**Honest options:**

- Qualify Arabic as unvalidated for grounding, while retaining Arabic UI support; or
- Build an Arabic grounding train/eval slice with domain reviewers.

Translated English tests alone are insufficient. Arabic scientific writing needs native passages, mixed Arabic/Latin terminology, Arabic numerals, DOI strings, and RTL evidence rendering.

### 3.7 OCR is local processing but not currently offline on first use

The shipped OCR path calls `createWorker(langArg)` without a bundled `langPath`. Tesseract.js downloads missing `eng`, `fra`, and `ara` traineddata from jsDelivr on cache miss. There are no traineddata assets in the repository or installer resources.

Therefore:

- Manuscript content remains local.
- But first-use OCR needs network access.
- First-use OCR can fail offline.
- The current “on-device only / offline” wording is incomplete.

**O2 should decide explicitly between:**

- Bundling language packs; or
- An explicit, consented language-pack download manager with checksums, versions, licenses, cache location, and removal controls.

Also include an offline-first-use packaged smoke test. The present O2 plan of fixtures/hardware smoke is not enough.

### 3.8 A long-running workstation needs project persistence

Citation rows, manuscript text, report state, user decisions, and attached source paths are ordinary in-memory Zustand state. There is no project save/open flow, crash recovery, or dirty-close warning.

This is more important than several planned polish items. A user can spend minutes auditing and repairing a manuscript, close the app, and lose the working state.

**A minimal local project should preserve:**

- Manuscript snapshot and source format.
- Canonical `CslItem` library.
- Cite-to-reference mappings.
- Attached-source metadata and hashes.
- Audit configuration.
- Model and prompt-contract version.
- Findings and user decisions.
- Unresolved conflicts.
- Export history.

A versioned `.nassila` JSON project is sufficient initially. PDFs need not be embedded by default; store path, hash, size, and extraction cache metadata.

### 3.9 The release process needs a reliability foundation

The app repository currently has:

- No GitHub CI workflows.
- No open issues or milestones despite a locked release train.
- Locally produced installers.
- No visible checksum/SBOM or automated release gate.
- No automated packaged Electron smoke.
- No code-signing configuration.

**Before broader institutional adoption:**

- Add CI for tests, lint, build, prompt-contract checks, links, and i18n parity.
- Add a Windows packaged smoke.
- Publish installer SHA-256 checksums.
- Verify third-party notices for Tesseract, Leptonica/data packs, pdf.js, and other bundled components.
- Verify whether the model-card `apache-2.0` metadata is compatible with the linked Gemma terms.
- Consider code signing when sustainable.

The recent two-day release cadence is impressive, but it leaves too little room for packaged and real-manuscript verification. Introduce a preview/RC build before stable releases.

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

Unlock the “#7 only” restriction. Correctness defects must preempt release-scope purity.

### Phase 0 — Trust reset, before 1.2.2

Estimated scope: one focused stabilization cycle.

**Work:**

1. Route manuscript registry resolution through main-process IPC.
2. Add a packaged audit smoke test.
3. Synchronize the production prompt contract across repositories.
4. Re-evaluate S12 and S14 under that exact prompt.
5. Eliminate L3 pass on disabled LLM or parse failure.
6. Remove synthetic-span grounding when mappings fail.
7. Add mapping coverage and ambiguity reporting.
8. Replace character-cut passage windows with sentence/paragraph windows.
9. Decide and implement the OCR language-pack policy.
10. Add basic CI.

**Exit gates:**

- No external registry fetch originates in the production renderer.
- No passage pass exists without parsed claims and valid quotes.
- Cancelled or superseded runs cannot append stale findings.
- Production prompt hash is identical in app and evaluator.
- S12/S14 production-prompt reports are recorded.
- Offline first-use OCR behavior matches public documentation.
- Packaged Windows audit smoke passes.

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

Do not store only a path in `attachedPdfByBibKey`; that existing scaffold is insufficient for reproducibility.

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

### 1.2.7–1.2.9, if those slots are retained

Do not label them “TBD.” Recommended outcomes:

| Version | Outcome |
|---------|---------|
| **1.2.7 — Projects** | Save/open/recover a complete local Nassila project; Help → website; doc sync; first-run bibliography path |
| **1.2.8 — Maktab O2 + a11y** | Offline language packs, golden OCR fixtures, page provenance, enhanced-OCR control, cache management; loop table keyboard navigation |
| **1.2.9 — Submission preflight** | Unresolved-identity gate, mapping-coverage summary, accessibility/keyboard pass, local diagnostic / quality ledger export |

### 1.3.0 — Sharh-lite

Sharh-lite should summarize structured evidence, not add another unconstrained LLM call.

**It should produce:**

- Supported, weak, contradicted, and not-found claim counts.
- Source-coverage limitations.
- Unresolved bibliography identities.
- Unmapped citations.
- Invalid or missing quote warnings.
- Concrete next actions.
- Deep links to the canonical website documentation.

**Also complete:**

- Granular cancellation.
- Project action log.
- Submission integrity bundle export.
- Accessibility and RTL acceptance.
- Five-to-ten real researcher usability sessions.

---

## 6. NassilaT and Tier 3 plan

### Freeze S12/S14 while rebuilding evaluation around production

S12 and S14 are useful shipping baselines. Do not train S15 merely to recover S12’s combined metric.

**Immediate sequence:**

1. Evaluate S12/S14 with the exact production prompt.
2. Curate the July field notes.
3. Fix mapping, passage-window, and retrieval defects.
4. Re-run real manuscripts.
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

| # | Workstream | Repo | Depends on | Unblocks |
|---|------------|------|------------|----------|
| W1 | App 1.2.2–1.2.4 (throughput, quote chip, Masdar attach) | Nassila | Phase 0 | Real Tier 3 UX + more field notes |
| W2 | Maktab OCR O2 + O4 golden fixtures | Nassila | O1 | Scan-quality ingest for M01 |
| W3 | Masdar-lite field-note curation | NassilaT | Operator review | S15+ boost JSONL |
| W4 | `fetch_oa_fulltext.py` pilot (100 DOIs) | NassilaT | CORPUS_PIPELINE | `source_pdf_extract` rows |
| W5 | Lock `doc_extract` / `source_pdf_extract` schemas | NassilaT | W4 | M01 / Md01 dataset collection |
| W6 | `eval_holdout_body_*.jsonl` (30–50 rows) | NassilaT | W4–W5 | Tier 3 Sanad eval |
| W7 | Maktab gold manuscripts (50–100) | NassilaT + manual | W5 | M01 QLoRA smoke (E4B) |
| W8 | Tier 3 Sanad train (body chunks) | NassilaT | W6 + W3 | Tier 3 product ship |
| W9 | S15+ abstract recovery (optional) | NassilaT | W3 + cap policy fix | Higher combined on S14 base |
| W10 | Raqim R1–R3 | Nassila | — | Bibliography quality (orthogonal) |

**Critical path to Tier 3 train:** W4 → W5 → W6 → W8 (W1/W2 parallel on app side).

### Phased 6–12 month recommendation

| Window | Focus |
|--------|--------|
| **Months 0–2** | Stabilize ship; no S15+ Vast. Phase 0 + 1.2.2–1.2.4. Field-note curation. Doc refresh. |
| **Months 2–4** | Tier 3 data plane: OA fetch pilot, schemas, body holdout draft, tier3 gate stub. |
| **Months 4–6** | First Tier 3 trains (smoke): M01, Masdar extract, Sanad body-chunk only after holdout exists. |
| **Months 6–9** | Tier 3 product integration (loop-fed, no peer tabs). Institutional access design spike. |
| **Months 9–12** | Optional S15+ / merge research only if Tier 3 stable. Phase 6 merge stays non-shipping. |

---

## 7. Product coherence addendum

Findings from cross-repo product review (app + website):

### Align first-run onboarding

Manuscript is the default surface (`shell-store`), but guidance recommends Bibliography-first. A first-time graduate student lands on Manuscript, sees upload/audit CTA, and only later discovers bibliography-first.

**Must-do:** Treat bibliography-first as guided first-run (optional checklist on empty Manuscript, or default first launch to Bibliography with one dismissible banner). Slot: **1.2.7**.

### Define “New Session”

`NEW_SESSION` currently clears citations only; manuscript text and audit report are left untouched. Define a unified session model for what New Session clears.

### Loop accessibility

The cited-sources findings table is click-only. `DESIGN.md` requires table keyboard navigation. Add roving tabindex + Enter to open detail (**1.2.8**).

### Fix copy that over-promises attach

i18n strings such as `loop.intro` / `loop.pipelineGap` imply manual PDF attach is live, but `attachedPdfByBibKey` is not wired into audit. Fix now or with 1.2.4/1.2.5.

### Help and discoverability

Help menu lacks locale-aware docs deep links; `reportIssue` wrongly points at the CSL styles repo. Pull Help → website forward to **1.2.7**.

### Privacy-respecting quality measurement

No in-app quality signal exists today. Prefer an opt-in, local-first quality ledger (aggregates only; no manuscript text) plus optional user-initiated diagnostic export — not remote telemetry by default (**1.2.9**).

### Coherence scorecard

| Dimension | Coherent? | Notes |
|-----------|-----------|-------|
| Ouroboros not Hydra | Yes | Renderer matches PRODUCT/DESIGN; Hydra removed |
| Bibliography-first | Partial | Doctrine strong; default entry weak |
| Local-model setup | Yes | Web canonical + shortened modal; USER_GUIDE slightly stale |
| Evidence transparency | Partial | Strong panels; quote chip pending |
| Bilingual UX | Yes | Parity test + AR docs; Help not linked |
| Release positioning | Yes | Nassila / nassila-web / STATE aligned at 1.2.1 |
| Onboarding | Partial | Website good; in-app first-run thin |
| Documentation | Partial | Web > in-repo HOW_TO; copy over-promises attach |
| Persistence | No | Major journey gap |
| Telemetry / quality | No | Not on train |
| Accessibility | Partial | Criteria documented; loop table gaps |
| Failure recovery | Partial | Improved 1.2.0–1.2.1; retry/cancel gaps remain |

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

1. **App:** `Nassila 1.2.x` (from `package.json`) — never freeze headers at `1.1.x`.
2. **Models:** **S12** / **S14** in mixed docs; `v1.12`/`v1.14` only in NassilaT archive walkthroughs.
3. **Workers:** two columns everywhere — **Deterministic stage** (Live / Partial / Planned) vs **LLM facet** (Planned / M01 / etc.).

### Ship ritual

On each app release X.Y.Z:

1. `package.json` version + git tag.
2. `CHANGELOG.md` — move [Unreleased] → `[X.Y.Z]`.
3. Operator map — move row to Shipped; check §G; bump Last updated.
4. `STATE.md` — latest app, last run.
5. FEATURES — `[x]` acceptance for shipped #ids; bump Status date.
6. nassila-web release-train + roadmap MDX if user-visible.
7. USER_GUIDE / HOW_TO for behavior changes.
8. Grep for `POST_V114_MAP` → replace with `OUROBOROS_OPERATOR_MAP`.
9. Vision docs quarterly or on milestone only.

### Immediate doc fixes (documentation only)

1. Replace all `POST_V114_MAP.md` → `OUROBOROS_OPERATOR_MAP.md`.
2. Reconcile Masdar/Maktab maturity language (deterministic live vs LLM facet planned).
3. Refresh stale headers (FEATURES date, OUROBOROS_CONTEXT date, operator map status, ROADMAP).
4. Check off shipped FEATURES acceptance (#1, #2, #13; complete #8 docs).
5. Fix operator map Planned table and #15 scheduling.
6. Update `MAKTAB_OCR.md`, `LOOP.md`, `USER_GUIDE.md`.
7. Annotate CHANGELOG 1.1.3 DOI↔title as superseded by 1.2.1 #4c.

### Website metrics honesty

If Sanad validation metrics appear on the site, do not publish bare “accuracy.” Include harness size, prompt version, synthetic/real composition, what the metric does and does not mean, per-language coverage, and known limitations.

---

## 9. Implementation matrix (current vs planned)

**Baseline:** app **1.2.1** (2026-07-17). Models **S12** (E4B) · **S14** (12B).

| Release | Codename | FEATURES | Status |
|---------|----------|----------|--------|
| 1.2.1 | Masdar UX | #4b, #4c, #8, I2 | **Shipped** |
| 1.2.2 | Throughput | #7 | **Missing** (after Phase 0) |
| 1.2.3 | Quote chip | #6, #15 | **Missing** (engine exists; UI missing) |
| 1.2.4 | Raqim Repair | #14 R1 | **Mostly missing** (recommended before attach) |
| 1.2.5 | Masdar attach | #5 + re-audit | **Scaffold only** (`attachedPdfByBibKey`) |
| 1.2.6 | Raqim Resolve | #14b R2–R3 | **Missing** |
| 1.2.7 | Projects + Help + onboarding | — | **Recommended** (was TBD) |
| 1.2.8 | OCR O2 + a11y | O2 | **Partial** (O1 live; O2 UX/fixtures missing) |
| 1.2.9 | Preflight + quality ledger | — | **Recommended** (was TBD) |
| 1.3.0 | Sharh-lite | #9–11 | **Missing** |

### Raqim R1 detail

| Item | Status |
|------|--------|
| PMCID in L1 `resolveRegistry` | Missing (enhance-only today) |
| arXiv URL → DOI | Missing |
| OUP `article-abstract` | Partial (`article`/`article-pdf` only) |
| Springer `/chapter/` | Partial |
| DeLong-class parser | Partial (no regression fixture) |
| Software false-positive guard | Missing |
| Genre-aware APA | Missing |
| Operator regression fixtures | Missing |

### Architecture seams for upcoming work

```text
Renderer hooks (use-manuscript-audit.ts)
  ├─ Sequential orchestration — bottleneck for #7
  ├─ resolveRegistry / alignMetadata — needs main IPC for packaged builds
  ├─ resolveL3Source → window.api — no AbortSignal threaded
  └─ runGroundingLlm → window.api.llmChat — blocking IPC, no cancel

Orphan / future seams
  ├─ ouroboros-loop-store.attachedPdfByBibKey — not wired to audit
  ├─ evaluateCiteSite pdf_pending branch — dead after Masdar-lite
  └─ maktab/ocr/backend — unavailable until IPC registration + language packs
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

## 11. Work that should remain later

Do not prioritize yet:

- A merged seven-worker GGUF.
- Shahid multimodal grounding.
- Embedded institutional-login webviews.
- Training every worker for naming symmetry.
- Cloud LLM as default.
- A notification center.
- Generic writing or thesis generation.
- Collaboration / cloud project sync.
- Automatic application of fuzzy registry or gray-literature matches.

**For institutional access, first exhaust:**

1. Open-access fetch.
2. User-attached local PDFs.
3. “Open DOI in browser” and reattach.
4. Configurable library proxy prefixes.

An embedded authenticated browser should be the last option because it creates credential, cookie, publisher-policy, and security complexity.

---

## 12. Top risks

| Risk | Severity | Detail |
|------|----------|--------|
| Registry/OA rate limits under audit concurrency | High | No rate limiter in audit path; Crossref/PubMed polite-pool not enforced |
| Non-cancellable LLM calls | High | Single Sanad call can block Cancel for minutes |
| Concurrency + cancel interaction | Medium | In-flight workers must honor abort; store must stay consistent |
| Packaged manuscript L1 soft-fail | High | Renderer fetch vs CSP |
| False L3 pass on parse fail / LLM off | High | Lexical overlap treated as grounding |
| Prompt contract drift (app vs train) | High | S12/S14 metrics may not match shipped prompt |
| R1 / R2–R3 scope creep | Medium | Many engine touchpoints + new Bibliography UI |
| OCR first-use network dependency | Medium | Traineddata from CDN; docs claim offline |
| No project persistence | High (product) | Weeks-long thesis work lost on close |
| No CI / packaged smoke | Medium | Fast release cadence without automated gates |
| Stale docs misleading agents | Medium | Stub language, dead POST_V114 links, over-promised attach |

---

## Final recommendation

Nassila should spend the next cycle becoming more **trustworthy** rather than merely broader.

**The single best strategy:**

> Build a durable, reproducible, closed evidence-and-repair loop around the existing deterministic engine and S12/S14 models.

That means:

1. Fix packaged network parity.
2. Re-establish prompt parity.
3. Eliminate false pass paths.
4. Stop grounding unmapped references.
5. Improve passage and source context.
6. Add cancellable orchestration.
7. Make quote validity and provenance visible.
8. Repair references before adding more model facets.
9. Save the user’s project.
10. Validate real full-text and Arabic workflows.
11. Train S15 only after those measurements identify a genuine model gap.

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
| `nassila-web/lib/release-train.ts` | Public release train |
