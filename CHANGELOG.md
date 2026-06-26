# Changelog

All notable changes to **Nassila** are documented here.

## [Unreleased]

## [1.1.0] — 2026-06-27

### Added — Sanad & Ouroboros loop

- **Manuscript loop** — upload DOCX/PDF, run full audit (L1 registry + L2 metadata + L3 passage grounding), cited-sources table, and evidence detail (passage, source excerpt, quotes).
- **Passage grounding (Sanad)** — local runners (LM Studio, Ollama, vLLM, Custom) and Cloud API; E4B / 12B tier chips; **Set up Sanad** guide modal.
- **Settings → General → Manuscript source fetch** — one-time Unpaywall email for OA full-text lookups.
- **L1 multi-registry fallback** — DOI: Crossref/DataCite → OpenAlex → PubMed; PMID: PubMed → OpenAlex.
- **DOCX references fallback** — numbered bibliography block when no `References` heading.
- **Security (SEC-01–07):** LLM URL validation, redirect-safe OA fetch, production CSP, grounding prompt delimiters — see [`docs/SECURITY-FIX-PLAN.md`](docs/SECURITY-FIX-PLAN.md).

### Changed

- **Hydra worker tabs removed** — primary surfaces are **Manuscript loop** + **Bibliography**; Tasnif / Sharh inline in bibliography drawer and loop detail.
- **External Marker PDF CLI removed** — PDF ingest uses bundled pdf.js only.
- **OA fetch** — allows public `http://` Unpaywall links; soft-fails invalid URLs; tries multiple Unpaywall location fields.
- **L3 grounding engine:** JSON auto-repair, LLM retry on parse failure, passage/excerpt caps, system/user prompt split.

### Notes

- Ship checkpoints: `nassila-sanad-e4b` **v1.12**, `nassila-sanad-12b` **v1.14** (NassilaT). Re-run manuscript audit smoke after upgrade to validate L1/OA fixes on your corpus.

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

- Windows `appId`: `com.nassila.app`.
