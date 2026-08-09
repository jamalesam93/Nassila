# Ouroboros loop state

**Last updated:** 2026-08-05  
**Operator:** Nassila maintainer

Read this at the start of every agent session. Update when focus, blockers, or ship gates change.

---

## Current focus

| Priority | Track | Status |
|----------|-------|--------|
| **P0** | **1.6.0 Maktab Loop** | **Shipped 2026-08-05** — T1 golden fixtures; T2 cache controls + needsReview banner; T3 richer deterministic Sharh summaries; T4 Masdar attach verified + docs/test; T5 RTL acceptance + release cut |
| **P1** | Infrastructure hygiene | Windows CI packaging job, dead-code cleanup, agent rule refresh |
| **P1∥** | NassilaT S15 corpus | 49/49 labels exported; W4 100 DOI; body holdout contrastive v2 benchmarked; S15 is **shipped default** in app |

**Latest app:** **1.6.0** (Maktab Loop) — shipped 2026-08-05.

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

**Locked train:** 1.4.0 Raqim Statute → 1.5.0 Raqim Web → **1.6.0 Maktab Loop** (shipped)

**Next map:** 1.7.0 Integrity Bundle → 1.8.0 Shahid (see `docs/Nassila-Ouroboros-Future.md` §5)

**Models:** Sanad **S15** (4B, default) / **S14** (12B, quality). S15 is the shipped default; model improvements depend on Tier 3 corpus.

---

## Blockers

- **Tier 3 full-text grounding:** blocked on body holdout PDF extract + freeze + quote ≥98% e2e. Abstract-only grounding is the current shipped limit.
- **Vision/LLM Arabic OCR:** deferred; DOCX is the supported Arabic ingest path.

---

## Next actions (ordered)

1. Fix agent infrastructure: refresh stale cursor rules, clean dead-code references.
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
