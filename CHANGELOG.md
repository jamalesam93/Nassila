# Changelog

All notable changes to **Nassila** are documented here.

## [Unreleased]

### Planned — 1.2.2 Throughput

- **Bounded audit concurrency** (#7) — split registry vs LLM pools.

### Planned — 1.2.3 Quote chip

- **Per-claim quote-verification chip** (#6) — inline “quote not found” on offending claim rows.
- **Header wordmark** (#15) — remove redundant in-app “Nassila” / ناسيلا from `AppHeader`.

### Planned — 1.2.4 Masdar attach

- **Per-reference source PDF attach** (#5) — file picker → extract → re-ground that reference; **Re-audit this reference**.

### Planned — 1.2.5 Raqim Repair

- **Bibliography resolver hardening** (#14) — PMCID L1 path, arXiv URL→DOI, OUP `article-abstract`, Springer chapter reclass, DeLong-class parser fix, registry title repair, software false-positive guard, genre-aware APA rules. See [`FEATURES-AND-TWEAKS.md`](docs/FEATURES-AND-TWEAKS.md) §14 and NassilaT operator map § Raqim track (R1).

### Planned — 1.2.6 Raqim Resolve

- **Bibliography repair panel** (#14b) — suggested matches on L1 fail; manual lookup key (title / DOI / PMID / PMCID / URL) → per-row Verify/Autocorrect; Hugging Face Hub + Kaggle gray-lit lookup for ML/AI cites. See [`FEATURES-AND-TWEAKS.md`](docs/FEATURES-AND-TWEAKS.md) §14b (R2–R3).

### Planned — 1.2.7–1.2.9

- TBD polish / product slots (not yet scoped).

### Planned — 1.3.0 Sharh-lite

- Deterministic summaries, Help → website, cancel granularity (#9–11).

### Parallel (not a numbered release)

- **Maktab OCR O2** — golden fixtures + hardware smoke (`docs/MAKTAB_OCR.md`); may land alongside any 1.2.x.
- **S15+** Sanad refinement — NassilaT; parallel with late 1.2.x / 1.3.0 when Tier 3 corpus exists.

## [1.2.1] — 2026-07-17 · Masdar UX (trust + polish)

Windows installer `Nassila Setup 1.2.1.exe`. **GitHub Release:** [v1.2.1](https://github.com/jamalesam93/Nassila/releases/tag/v1.2.1).

### Added

- **Audit in-progress panel (#4b)** — cited-sources table grows during the run; `LoopAuditDetail` stays locked until audit completes; no auto-select while `running`.
- **DOI↔title conflict — manual-only (#4c)** — verify does not auto-patch conflict rows; Autocorrect no longer auto-resolves DOI; predatory-list sync preserves mismatch panels. Buttons: **Keep my title — find correct DOI** / **Keep this DOI — update title** (AR: أبقِ عنواني — ابحث عن الـDOI الصحيح / أبقِ هذا الـDOI — حدِّث العنوان).
- **Shortcuts (#8)** — Ctrl/Cmd+Enter runs audit; **Copy evidence** and **Jump to Bibliography** on findings (re-audit deferred with #5).
- **Icon system (I2)** — toast kind icons, dropdown chevron, network wifi/offline + refresh, external-link on source URL, AppHeader toolbar icons. See NassilaT [`OUROBOROS_OPERATOR_MAP.md`](../../NassilaT/training/OUROBOROS_OPERATOR_MAP.md) § UI icon track.

### Deferred to later 1.2.x

- **Quote chip (#6)** + **header wordmark (#15)** → **1.2.3**.
- **Attach PDF (#5)** → **1.2.4**.

## [1.2.0] — 2026-07-15 · Masdar-lite

**GitHub Release:** [v1.2.0](https://github.com/jamalesam93/Nassila/releases/tag/v1.2.0) · Windows installer `Nassila Setup 1.2.0.exe`. **Icon I0/I1** included; **I2** shipped in **1.2.1**.

### Added

- **Masdar-lite** — Open-access PDFs from Unpaywall are extracted via Maktab `extractFromPdf` (pdf.js tier A; OCR tier B when Tesseract is available) and fed into L3 passage grounding as `full_text_oa_unpaywall` instead of the previous `pdf_pending` stub.
- **Incremental audit progress** — cited-sources table fills as each reference completes; `N / M` progress chip next to the phase label (loop workspace + status bar).
- **Maktab OCR O1** — main-process Tesseract backend (`eng` / `fra` / `ara`) with IPC (`maktab:ocrExtract`); renderer registers the backend on loop bootstrap for scan fallback in `extractFromPdf`.
- **Icon system (I0/I1)** — `react-icons` Lucide subset; shared `Icon` + `SeverityIcon` components; issue severity markers and journal clear button use Lucide instead of unicode / inline SVG (`IssuePanel`, `OutputPanel`, `TargetSelector`). Shipped in **1.2.0** installer; **I2** affordances shipped in **1.2.1**.

### Changed

- **`oa:fetchOaUrl`** — PDF responses now return `pdfBytes` (capped) so the renderer can extract text instead of discarding the body.

### Fixed

- **Bibliography PDF import (dev)** — pdf.js worker URL in Vite dev no longer fails with "Setting up fake worker failed" (browser-specific worker bundle).
- **Duplicate Online indicator** — network status shown once in the app header (removed duplicate from status bar).

### Deferred to later 1.2.x

- Per-reference source PDF attach (#5), quote-verification chip (#6), bounded audit concurrency (#7).

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
