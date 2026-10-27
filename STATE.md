# Ouroboros loop state

**Last updated:** 2026-10-27  
**Operator:** Nassila maintainer

Read this at the start of every agent session. Update when focus, blockers, or ship gates change.

---

## Current focus

| Priority | Track | Status |
|----------|-------|--------|
| **P0** | **2.1.2 Arabic localization & security hardening** | **Shipped 2026-10-27** — comprehensive Arabic translation audit, full 6-form CLDR pluralization, zero-dependency DIB ICO generator, Electron 42.11.18, PDF.js 6.4.299, 0 dependency vulnerabilities, loadingTask cleanup lifecycle hardening. |
| **P0** | **2.1.1 Arabic OCR fidelity** | **Shipped 2026-10-23** — per-line Arabic OCR reversal, legacy-encoded layers routed to OCR, pdf-inspector 1.25.2. Indra (onnxruntime-node, ~14 MB download, no Python) reads Arabic OCR pages when installed; Paddle is the fallback and the path when Indra is absent. |
| **P0** | **2.1.0 Maktab Arabic** | **Shipped 2026-09-18** — Track A production Maktab Arabic OCR (Paddle PP-OCRv5) **+** Track C Arabic-aware mapping. No GPU. Do not claim Arabic L3. |
| **P0** | **2.2.0 Sanad Arabic** | **Paused (budget) 2026-10-23.** FT-7 **NO-GO** 2026-10-14. FT-7b **NO-GO** 2026-10-16 — AR verdict 0.776 (bar 0.90), EN v2 0.945 (bar 0.950). FT-7c v122 stays **frozen** and is **not** to be trained. Vast is the only ground when cash returns. No Colab. |
| **P0** | **2.0.0 MaktabOCR + Shahid** | **Shipped 2026-09-06** — native pdf-inspector + selective OCR; Shahid table/figure **deterministic** live; Tier 3 GO. Arabic adapter goldens PASS; **Track A runner landed in tree** (pack via `npm run ocr:arabic-adapter`). |
| **P0** | **1.10.1 Packaged network parity** | **Shipped 2026-08-23** — `FEATURES-AND-TWEAKS.md` #21: Keep-my-title/DOI-lookup/autocorrect-online/input-Resolve routed through main IPC; renderer network-boundary guard; predatory "Update list" failure toast |
| **P0** | **1.10.0 Masdar Papers** | **Shipped 2026-08-22** — installer `Nassila Setup 1.10.0.exe`; Wayback gating; papers dedupe + folder-scan attach; Raqim Resolve fixes |
| **P0** | **1.8.0 Sanad 9B** | **Shipped 2026-08-13** — sole-tier `nassila-sanad-9b` (4B/12B hard-cut) + Qwen3.5 thinking stripper |
| **P0** | **1.7.0 Integrity Bundle** | **Shipped 2026-08-10** |
| **P0** | **1.6.0 Maktab Loop** | **Shipped 2026-08-05** |
| **P1** | Infrastructure hygiene | Windows CI packaging job, dead-code cleanup, agent rule refresh |
| **P1∥** | NassilaT corpus / eval | Tier 3 gates completed; Docling clean holdout 419 claims / 175 DOIs; retrieval 100/100 DOIs; E2E 32 manuscripts; Shahid multimodal 150 pilot + 210 holdout; Sanad Hub = **9B FT-6** (`nassila-sanad-9b` v119) |

**Latest app:** **2.1.2** (Arabic localization & security hardening) — shipped 2026-10-27. Production Arabic scan OCR is still Paddle PP-OCRv5 (2.1.0). **Next planned:** **2.2.0 Sanad Arabic**, paused for budget. Do not start FT-7c.

**2.0.0 gate (2026-09-06):** **GO** — NassilaT `training/EVAL_GONOGO_TIER3_MEMO.md`. All hard gates satisfied across all 6 tracks. Release cut approved.

**Honesty (2026-10-27):** **2.1.2 shipped.** Comprehensive Arabic localization and CLDR pluralization audit. Zero dependency vulnerabilities with Electron 42 and PDF.js 6. Resource cleanup hardened across PDF.js extraction/OCR. Arabic scan OCR uses Indra when downloaded, and PP-OCRv5 otherwise. Arabic L3 remains unvalidated until **2.2.0 / FT-7**, which is **paused for budget**.

**Honesty (2026-10-24):** **2.1.1 shipped.** Arabic scan OCR uses Indra when the user has downloaded its weights, and PP-OCRv5 otherwise. 2.1.1 also fixes line order and flags legacy-encoded Arabic layers. Reverse-font still prefers DOCX. Arabic L3 remains unvalidated until **2.2.0 / FT-7**, which is **paused for budget**. **Sanad trains English and Arabic only** — do not add French (or any third language) as a gate or prospective cut.

**IA:** Manuscript loop vs Bibliography only — old seven-worker navigation is gone.

## 2.0.0 ship notes (2026-09-06)

| Step | Status |
|------|--------|
| Native PDF layout inspector (`@firecrawl/pdf-inspector`) with selective scan OCR fallback | **PASS** |
| Pretrained Arabic OCR adapter with zero character corruption (100% key recognition, 0% CER) | **PASS** |
| Shahid multimodal table and figure evidence extraction with cell-level precision | **PASS** |
| Two-tier UX decoupling: claim verdicts decoupled from UI finding pills | **PASS** |
| Abstract-only caution chips for paywalled or closed-access citations | **PASS** |
| Packaged Windows installer smoke (`dist/Nassila Setup 2.0.0.exe`, 158.97 MB) + offline clean pass | **PASS** |
| Full Tier 3 evaluation gates (Retrieval 100%, Grounding 95.8%, E2E 95.9%, Shahid 100%, Maktab 100%) | **PASS** |

---

## 1.10.1 ship notes (2026-08-23)

| Step | Status |
|------|--------|
| Keep-my-title via `registry:lookupRaqimCandidates` + `resolveDoiFromCandidates` core (guards ported) | **PASS** |
| `registry:enhanceCitations` IPC (DOI lookup + autocorrect online step) | **PASS** |
| `registry:resolveIdentifiers` IPC (input-bar Resolve) | **PASS** |
| Renderer network-boundary guard test + predatory Update-list failure toast | **PASS** |
| Tests/lint/typecheck gates (109 files, 536 tests) | **PASS** |

---

## 1.10.0 ship notes (2026-08-22)

| Step | Status |
|------|--------|
| Track C (#20) Resolve fixes: grey-web de-suppression + confidence rebalance + panel prefill parity | **PASS** |
| Track A (#18) Wayback availability gating: `queryWaybackSnapshot` + IPC + gated UI + DOI-target fix | **PASS** |
| Track B (#19) Papers dedupe + folder-scan attach + `bibKeyFilter` string[] contract | **PASS** |
| Tests/lint/typecheck gates (107 files, 528 tests) | **PASS** |
| Version bump + CHANGELOG + STATE/future-map/web-train syncs | **PASS** |

**Locked train:** 1.4.0 Raqim Statute → 1.5.0 Raqim Web → **1.6.0 Maktab Loop** (shipped) → **1.7.0 Integrity Bundle** (shipped) → **1.8.0 Sanad 9B** (shipped; Shahid **not** included) → (**FT-6 Hub-only**, no 1.9.0 installer) → **1.10.0 Masdar Papers** (shipped) → **1.10.1 Packaged network parity** (shipped) → **2.0.0 MaktabOCR + Shahid** (shipped 2026-09-06) → **2.1.0 Maktab Arabic** (shipped 2026-09-18)

**Next map:** 2.2.0 Sanad Arabic (paused) → 2.3.0–5.0.0 — see `docs/Nassila-Ouroboros-Future.md` §5. Merged GGUF is a **5.0.0 non-goal**; M01/Md01 stay gated.

---

## 2.0.0 ship notes (2026-09-06)

| Step | Status |
|------|--------|
| Maktab OCR: Firecrawl native pdf-inspector + selective OCR + scan fallback (eng/fra/ara) | **PASS** |
| Shahid Multimodal: Table/figure evidence path with cell-level precision | **PASS** |
| Tier 3 full-text grounding: Docling Clean v1 holdout (419 claims / 175 DOIs) | **PASS** |
| End-to-end product suite: 102 docs / 480 claims, 98.6% quote validity, zero false pass | **PASS** |
| Offline stability & packaging: Clean-machine Windows installer smoke test | **PASS** |
| Version bump + CHANGELOG + STATE/future-map/web-train syncs | **PASS** |

---

## Aug 27 field-audit baseline (pre-2.0, committed in 2.0.0)

Committed and verified in the 2.0.0 release:

| Fix | Where |
|-----|--------|
| Objectives list markers `(1)…(4)` rejected as citations | `src/engine/manuscript/intext.ts` |
| Active-bib-key passage clipping + claim filtering | `passage-window.ts`, `audit-runner.ts`, `grounding-llm.ts` |
| Extraction-normalized, non-fuzzy quote validation | grounding path |
| Filename-stem matching (`3.pdf` → `[3]`) | `src/engine/papers/match.ts` |
| Citation-marker strip before numeric contradiction checks | grounding / audit guards |
| pdf.js two-column clustering | `src/engine/manuscript/pdf-extract.ts` |
| Source-artifact `CACHE_VERSION` **2** | `src/engine/manuscript/source-artifact-cache.ts` |
| Focused regressions + offline verify scripts | `tests/unit/*`, `scripts/verify-*.ts` |

**Status:** Verified in 2.0.0 suite; full regression and live re-audit PASS.

---

## 1.6.0 ship notes (2026-08-05)

| Step | Status |
|------|--------|
| T1 Maktab OCR golden fixtures + CI OCR probe (`tests/smoke/MAKTAB_OCR_GOLDEN_SIGNOFF.md`) | **PASS** |
| T2 Cache controls (source-artifact + Maktab extraction) + Storage section + needsReview import banner | **PASS** |
| T3 Richer deterministic Sharh summaries (aggregate coverage/passage/claim + headline + per-finding copy, EN/AR) | **PASS** |
| T4 Masdar attach verified (single-ref re-audit), docs reconciled, `LoopAuditDetail` attach test + in-flight guard | **PASS** |
| T5 RTL acceptance pass (logical-direction sweep) + release cut | **PASS** |
| Version bump + CHANGELOG + STATE.md/future-map synced | **PASS** |

---

## 1.5.0 ship notes (2026-07-29)

| Step | Status |
|------|--------|
| Maktab Tier A Rust WASM engine (`@firecrawl/pdf-inspector-wasm`) | **PASS** |
| Raqim Web metadata resolver (OG, Dublin Core, Schema.org, HTML meta) | **PASS** |
| Host-specific extractors (GitHub, Kaggle, HF, Substack, Medium, YouTube) | **PASS** |
| Wayback Machine archive integration | **PASS** |
| Sanad default preset → `nassila-sanad-4b` (S15) | **PASS** |
| Version bump + CHANGELOG + release notes | **PASS** |
| GitHub **v1.5.0** tag + installer | **PASS** |

**Models:** Sanad **9B FT-6** (`nassila-sanad-9b`, sole published GGUF/unquant; v119). FT-5 (v117) superseded on Hub. 4B S15 / 12B S14 retired.

---

## Blockers

- **2.1.2 Arabic localization & security hardening:** **SHIPPED 2026-10-27** — comprehensive Arabic translation audit, CLDR 6-form plurals, zero-dependency DIB ICO generator, Electron 42.11.18, PDF.js 6.4.299, 0 dependency vulnerabilities, loadingTask cleanup.
- **2.1.1 Arabic OCR fidelity:** **SHIPPED 2026-10-23** — line order, legacy-encoded routing, pdf-inspector 1.25.2, in-app Indra (Paddle fallback).
- **2.1.0 Maktab Arabic (Tracks A+C):** **SHIPPED 2026-09-18** — Paddle pack + IPC `ara` + mapping fixtures; reverse-font still DOCX; `probe:arabic-ocr` PASS. Arabic L3 unvalidated.
- **2.2.0 Sanad Arabic (Track B):** **Paused for budget (2026-10-23).** FT-7 NO-GO 2026-10-14. FT-7b NO-GO 2026-10-16 — Arabic compounds never split, `weak` confused with insufficient, quotes copy paraphrase wording; EN v2 0.945 vs 0.950. FT-7c v122 is frozen and must not be trained. Quants withheld; v119 / v120 / v121 LoRA repos public, v120 and v121 cards marked NO-GO. UI AR ≠ model AR until GO. Vast is the only ground when cash returns.
- DOCX remains a supported Arabic ingest path; scanned Arabic PDF uses Paddle when the pack is present.

---

## Next actions (ordered)

0. **2.2.0 Track B (paused for budget):** Do not start FT-7c. v122 stays frozen (`NassilaT/training/FT7C_VAST_RUN.md`). When cash returns, Vast is the only ground: a fresh LoRA from the base model, same gates and holdouts. No Colab. Sign GO only when every gate passes.
0b. Cut GitHub **v2.1.2** + installer `Nassila Setup 2.1.2.exe` when publishing this patch. v2.1.0 remains the last published installer binary until build:win.
1. Fix agent infrastructure: refresh stale cursor rules, clean dead-code references.
1b. ✅ **done (2026-10-11) — packaging hygiene: −255.0 MB unpacked (973.8 → 718.8 MB).** `onnxruntime-node` shipped all five prebuilt slices (~282 MB) while only `win32/x64` can load on a Windows x64 build → **−219 MB**, pruned via `scripts/prune-native-platforms.mjs` on `beforePack`/`afterPack` (reversible: `afterPack` restores the source tree). Script-only `canvas` moved to `devDependencies` → **−35 MB**. `@napi-rs/canvas` stays — pdf.js requires it at runtime. Verified by `npm run build:unpack` + measurement (`resources/app.asar.unpacked` 443.9 → 189.7 MB; one ORT slice present). Recorded in `FEATURES-AND-TWEAKS.md` package budgets. **Do not** re-implement the slice prune as a `win.files` negation — it trips `containsOnlyIgnore()` in electron-builder and packs the whole repo (+174.6 MB). See `docs/Nassila-Ouroboros-Future.md` §4.0.0 workstream **C**.
2. Add **Windows packaging CI job** (`windows-latest` → `build:unpack` → `probe-ocr-bundled`).
3. Wire Tier-4 dead features: **structure template picker UI** + **`manuscriptSourceFormat` badge** in loop. ✅ done — shipped in 1.5.0/1.6.0 tree; see rules §2 live structure.
4. Split the three loop monolith panels + add jsdom component tests. ✅ done (2026-08-03) — `LoopEditorPane`, `LoopSourcesPanel`, `LoopVerdictUi`; `SharhLitePanel` was already ~140 lines and kept as-is.
5. Housekeeping: gitignore `*.tsbuildinfo`, migrate `PRESETS_DIR` from `~/.citations-style` → `~/.nassila`, fill `package.json` author. ✅ done (2026-07-29/08-03 hygiene sweep).
6. 1.6.0 T1 golden fixtures: generated PDF suite + unit goldens + real-Tesseract OCR probe wired into `package-windows` CI; signoff `tests/smoke/MAKTAB_OCR_GOLDEN_SIGNOFF.md`. ✅ done (2026-08-03/04).
7. 1.6.0 T2 cache controls: `sourceArtifactCacheInfo`/`clearSourceArtifactCache`, `maktab:extractionCacheInfo`/`maktab:clearExtractionCache` IPC + policy rows, Settings → Storage section, needsReview import banner. ✅ done (2026-08-04).
8. 1.6.0 T3 richer deterministic Sharh summaries: aggregate `coverageBreakdown`/`passageBuckets`/`claimBreakdownByFinding` in `sharh-lite.ts`; localized headline + per-finding copy via `sharh-copy.ts`; SharhLitePanel additions; EN/AR `sharhLite.*` keys. ✅ done (2026-08-05).
9. 1.6.0 T4 Masdar loop polish: attach verified against single-ref re-audit, stale "planned" docs reconciled, `LoopAuditDetail` attach/in-flight-guard renderer tests. ✅ done (2026-08-05).
10. 1.6.0 T5 RTL acceptance + release cut: logical-direction sweep, version 1.6.0, CHANGELOG, installer. ✅ done (2026-08-05).
11. Continue NassilaT Tier 3 body holdout corpus work for S15 refinement.
12. **1.7.0 planned — structured DOCX ingest for the loop** (Maktab Route C): replace `mammoth.extractRawText` with `convertToHtml` in `importManuscriptFromPath`; headings side-channel; no native deps / no IPC; bibliography `parseDocx` untouched. ✅ done (2026-08-10) — `src/engine/maktab/docx-extract.ts` (`extractStructuredDocx`, real Word heading levels as `HeadingNode[]` side-channel with offsets), fixture builder `tests/fixtures/maktab-docx-builder.ts` (jszip, in-memory OOXML), `tests/unit/docx-extract.test.ts` (6 tests); wired into `importManuscriptFromPath` with `manuscriptAudit.docxWarnings` review notice (EN/AR).
13. **1.7.0 Preflight+ UI** — matched/ambiguous/unmatched mapping breakdown in SharhLitePanel (`sharhLite.mappingBreakdown`, EN/AR). ✅ done (2026-08-10).
14. **1.7.0 Projects residual — dirty-close warning** — main-process close guard (`src/main/app-close-guard.ts`, channels `app:close-requested`/`app:confirm-close`, IPC policy entries), preload `onCloseRequested`/`confirmClose`, renderer `useDirtyCloseGuard` hook showing the existing ConfirmDialog when `sessionIsDirty()`, `project.closeDirtyConfirm` (EN/AR). ✅ done (2026-08-10) — `tests/unit/app-close-guard.test.ts` + `tests/unit/dirty-close-guard.test.tsx`.
15. **1.8.0 Sanad 9B** — `stripQwenThinkingTraces` in `repairGroundingJsonText` + `max_tokens: 2048` for sanad9b (`ipc-llm.ts`) + no-thinking template inline on the nassila-web Sanad setup guide (llama.cpp tab) with the Custom preset linking there (initial bundled `resources/qwen3.5-no-thinking.jinja` + `SanadQwenTemplateCard` + `app:qwen-template` IPC removed in favor of the website) + sole-tier `nassila-sanad-9b` registry (4B/12B/E4B hard-cut; single 9B chip; defaults; i18n) + doc refresh + version 1.8.0. ✅ done (2026-08-13) — `FEATURES-AND-TWEAKS.md` #16/#17 acceptance closed.
16. **1.10.0 Masdar Papers** — #18 Wayback availability gating (`queryWaybackSnapshot` in webpage-metadata; `registry:checkWaybackAvailability` IPC; unconditional `[Wayback ↗]` deleted from OutputPanel; Resolve panel gated with direct snapshot links; DOI-as-target fixed); #19 papers dedupe (`dedupeBibEntries` + aliases in prepareAudit, `bibliographyDedupe` on report, conditional Sharh-lite line EN/AR) + folder-scan attach (`papers:scanFolder`/`papers:identify` IPC with SEC-01 pinning + caps in `shared/papers-limits.ts`, `engine/papers/match.ts` first-page DOI/title matcher, LoopSourcesPanel review flow, multi-key targeted re-audit via `bibKeyFilter: string[]` with legacy normalization); #20 Resolve fixes (grey-web de-suppression, confidence rebalance, panel prefill parity). ✅ done (2026-08-22) — tests/lint/typecheck green; installer `Nassila Setup 1.10.0.exe` cut same day.
