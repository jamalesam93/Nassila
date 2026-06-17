# Changelog

All notable changes to **Nassila** are documented here.

## [Unreleased]

### Added

- **Training (NassilaT repo):** Phase 1.5 corpus pipeline (`build_paper_corpus.py`, `enrich_corpus_abstracts.py`) and Phase 2 abstract-only `l3_grounding_train.jsonl` (400 rows) for upcoming **`nassila-grounding-e4b-v1`** (target app **1.2.0** when GGUF ships on Hugging Face). See NassilaT `training/CORPUS_PIPELINE.md` and `training/PHASE2_VAST_WALKTHROUGH.md`.

- **One Ring strategy:** [`docs/ONE_RING.md`](docs/ONE_RING.md) — one local model identity, multi-task routing over time; task registry in [`src/shared/nassila-agent-tasks.ts`](src/shared/nassila-agent-tasks.ts). Restored [`docs/WEBPAGE_ROADMAP.md`](docs/WEBPAGE_ROADMAP.md) with One Ring cross-links. Training pack updates: `training/ROADMAP.md`, `training/ONE_RING.md`, `DATASET_SCHEMA.md`.

### Changed

- **L3 grounding engine (Phase 0.5):** JSON auto-repair (`grounding-json-repair.ts`, aligned with training eval harness), one LLM retry on parse failure, passage/excerpt length caps in `grounding-llm.ts`, dedicated **LM Studio** preset in `llm-presets.ts` (`http://localhost:1234`).

## [1.0.1] — 2026-06-03

### Fixed

- **More** menu closes when you click outside or choose an action (replaces native `<details>` that stayed open).
- **Import** (and other toolbar) hints dismiss when the pointer leaves the button, including after the file dialog closes.
- **Vancouver:** citation cards show six authors then “et al.” when there are seven or more; removed a validator rule that incorrectly flagged full author lists as “Needs fix” (export via CSL was already correct).

## [1.0.0] — 2026-05-24

Reference list verification baseline.

### Added

- Desktop app: import and validate bibliographies (BibTeX, RIS, CSL-JSON, plain text, DOCX/PDF extraction where supported).
- Unified registry verify (Crossref, PubMed, OpenAlex): L1 resolution + L2 metadata alignment (up to 200 rows per run).
- Autocorrect, duplicate detection, predatory-journal flags, CSL export (thousands of styles).
- English and Arabic UI with bilingual product positioning.

### Notes

- Manuscript audit / L3 grounding UI is not enabled in this release; engine code remains for a later phase.
- Windows `appId`: `com.nassila.app`.
