# Changelog

All notable changes to **Nassila** are documented here.

## [Unreleased]

## [1.1.3] — 2026-06-29 · Polish

### Added

- **Notifications** — in-app toasts for verify, autocorrect, DOI lookup, export, predatory-list update, and bibliography bridge; OS notifications when a manuscript audit finishes while the window is in the background (toggle in Settings → General).
- **Sanad setup guide link** — slim **Set up Sanad** modal with Hugging Face download links and a locale-aware link to the canonical website docs (`/docs/sanad-setup`).

### Changed

- **Arabic UI** — glossary-aligned copy across the app (workers, modes, panels, passage grounding); shipped with this release.
- **Bibliography busy state** — task-specific status strip (verify / autocorrect / DOI lookup) instead of a dimmed overlay on the reference list.
- **Sanad setup modal** — removed duplicated LM Studio / Ollama / vLLM walkthrough (now on nassila-web).

### Fixed

- **Windows app icon** — taskbar/titlebar now uses Nassila icon in dev and builds (generated `build/icon.png` + `build/icon.ico`).
- **Network status** — reduced false Offline flapping during verify/audit; added **Retry connection** when Offline.
- **DOI ↔ title conflicts** — when a DOI resolves to a different article than the row title, Nassila now treats it as an identity conflict. UI offers **Find DOI for title** or **Use DOI’s title**; autocorrect prefers fixing the DOI rather than overwriting the title.
- **Webpage titles** — placeholder titles like `()` are now replaced from fetched page metadata during autocorrect.

## [1.1.2] — 2026-06-27

### Added

- **Bibliography bridge** — send manuscript References to Raqim; audit from Bibliography library with `manuscript-ref:N` cite-key preservation.
- Unit tests: `bibliography-bridge`, `manuscript-preview-bridge`.

### Fixed

- **Bibliography PDF import** — reference extraction now uses manuscript-grade PDF text layout (line breaks, columns, de-hyphenation) so numbered bibliography entries split correctly; matches DOCX import quality instead of merging most refs into a handful of entries.
- **Bibliography verify references** — unified L1+L2 registry checks now run in the main process (IPC), so **Verify references** works in packaged builds where production CSP blocks renderer network calls to Crossref/PubMed.
- **PDF `9. References` heading** — IMRAD-style numbered reference headings detected on PDF export.
- **L3 rollup** — deduplicated insufficient-evidence reasons across cite sites.
- **Cited-sources table** — opaque sticky header (no row bleed-through on scroll).

### Changed

- **Loop audit detail** — compact layer summary and cite-site list (`LoopAuditDetail`).

## [1.1.1] — 2026-06-27

### Added

- **Bibliography-first workflow** — loop hint + link to Bibliography when references should be curated before audit; documented in `PRODUCT.md` / `USER_GUIDE.md`.
- **Bibliography DOCX import** — shared `segmentManuscriptText` extraction; import status feedback on File → Import References.
- **Journal search (CrossRef)** — main-process IPC (`registry:searchJournals`); always queries online when connected; bundled list capped at 8 matches.
- Unit tests: `document-parser`, `plain-text-doi-url`, `journal-target-search`, `content-security-policy`.

### Fixed

- **DOI from `https://doi.org/...` URLs** — plain-text parser populates `DOI` when only a doi.org link is present.
- Manuscript segmentation — numbered section headings no longer swallowed as bibliography.

### Changed

- Settings clarifies Unpaywall email is **not** university paywall login.

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
