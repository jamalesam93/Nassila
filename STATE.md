# Ouroboros loop state

**Last updated:** 2026-08-03  
**Operator:** Nassila maintainer

Read this at the start of every agent session. Update when focus, blockers, or ship gates change.

---

## Current focus

| Priority | Track | Status |
|----------|-------|--------|
| **P0** | **1.6.0 Ouroboros Stage Polish** | Active — Tier-4 dead features (template picker, source format badge) wired; loop panels split + component tests done |
| **P1** | Infrastructure hygiene | Windows CI packaging job, dead-code cleanup, agent rule refresh |
| **P1∥** | NassilaT S15 corpus | 49/49 labels exported; W4 100 DOI; body holdout contrastive v2 benchmarked; S15 is **shipped default** in app |

**Latest app:** **1.5.0** (Raqim Web) — shipped 2026-07-29.

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

**Locked train:** 1.4.0 Raqim Statute → **1.5.0 Raqim Web** (shipped)

**Next map:** 1.6.0 Stage Polish → 1.7.0 Integrity Bundle → 1.8.0 Shahid (see `docs/Nassila-Ouroboros-Future.md` §5)

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
6. Continue NassilaT Tier 3 body holdout corpus work for S15 refinement.
