# Changelog

All notable changes to **Nassila** are documented here.

## [Unreleased]

### Added

- **Training (NassilaT):** Sanad ship checkpoints E4B **v1.12**, 12B **v1.14** selected; v1.13 **NO-GO**; operator map `training/POST_V114_MAP.md`; laptop smoke `training/LAPTOP_SMOKE_TEST.md`.
- **Ouroboros strategy:** [`docs/OUROBOROS.md`](docs/OUROBOROS.md), [`docs/OUROBOROS_CONTEXT.md`](docs/OUROBOROS_CONTEXT.md); task registry [`src/shared/nassila-agent-tasks.ts`](src/shared/nassila-agent-tasks.ts). [`docs/WEBPAGE_ROADMAP.md`](docs/WEBPAGE_ROADMAP.md) for future Raqim/Tasnif/Sharh webpage tasks.

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
