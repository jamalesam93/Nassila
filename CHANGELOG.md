# Changelog

All notable changes to **Nassila** are documented here.

## [1.6.0] — 2026-08-05 · Ouroboros Stage Polish

Windows installer `Nassila Setup 1.6.0.exe`. **GitHub Release:** [v1.6.0](https://github.com/jamalesam93/Nassila/releases/tag/v1.6.0).

### Added

- **Maktab OCR golden fixtures** — generated PDF suite (text + image/scan pages) with byte-level goldens and a real-Tesseract OCR probe (`scripts/probe-ocr-golden.mjs`) wired into the Windows CI packaging job. Signoff recorded in `tests/smoke/MAKTAB_OCR_GOLDEN_SIGNOFF.md`.
- **Cache controls** — settings → Storage section with source-artifact and Maktab extraction cache info + clear actions (new `sourceArtifactCacheInfo`/`clearSourceArtifactCache` and `maktab:extractionCacheInfo`/`maktab:clearExtractionCache` IPC, policy-policed).
- **Review-after-import banner** — dismissible needsReview notice in the loop when PDF import extraction needs human attention.
- **Richer deterministic Sharh summaries** — aggregate `coverageBreakdown`/`passageBuckets`/`claimBreakdownByFinding` in `sharh-lite.ts`, localized headline + per-finding copy (`sharh-copy.ts`), and an expanded SharhLitePanel (EN/AR).
- **LoopAuditDetail source-attach coverage** — renderer test asserting attach stores the artifact, surfaces descriptor, re-audits the single bibKey, and that attach/clear are guarded while an audit is in flight.
- **RTL acceptance pass** — swept physical-direction strays to logical utilities (`text-start`, `end-2`) across panels, settings, and tooltip chrome.

### Fixed

- Reconcile stale "local-PDF attach planned" wording across `OUROBOROS_CONTEXT`, `PRODUCT`, `OUROBOROS`, and `USER_GUIDE` — Masdar per-reference PDF attach and single-reference re-audit are live.

## [1.5.0] — 2026-07-29 · Raqim Web

Windows installer `Nassila Setup 1.5.0.exe`. **GitHub Release:** [v1.5.0](https://github.com/jamalesam93/Nassila/releases/tag/v1.5.0).

### Added

- **Maktab Tier A Rust WASM Engine** — integrated `@firecrawl/pdf-inspector-wasm` into `extractManuscriptFromPdf` (`pdf-inspector-extract.ts`). Accelerates text-based PDF ingest by 10–20× (~10–50ms execution), extracts Markdown headings (`# Intro`) and vector/heuristic Markdown tables (`| ... |`), while maintaining seamless fallback to `pdfjs-dist` and Maktab Tesseract OCR.
- **Raqim Web metadata resolver** — deterministic webpage resolution (`webpage-metadata.ts`) extracting Open Graph (`og:*`), Dublin Core (`dc.*`), Schema.org JSON-LD, and standard HTML meta tags.
- **Host-specific platform extractors** — structured title/publisher extraction for GitHub repositories (`owner/repo`), Kaggle datasets, Hugging Face models/datasets, Substack, Medium, and YouTube videos (`webpage-hosts.ts`).
- **Wayback Machine archive integration** — automatic fallback link generation (`web.archive.org/web/*/${url}`) and `[Wayback ↗]` action on webpage URL citations.
- **IPC IPC bridge** — `registry:resolveWebpageMetadata` exposed via `window.api` for packaged Electron app parity (bypasses renderer CORS).
- **Raqim Resolve UX** — "Fetch webpage metadata" button and inline Wayback Machine archive link.
- **Parser & access date support** — plain-text parser extracts `accessed` dates and auto-classifies URL-only references as `type: 'webpage'`.

### Changed

- **Sanad model preset alignment** — swapped default Sanad model target from `nassila-sanad-e4b` to `nassila-sanad-4b` for S15 default grounding performance and compatibility.

## [1.4.0] — 2026-07-21 · Raqim Statute

Windows installer `Nassila Setup 1.4.0.exe`. **GitHub Release:** [v1.4.0](https://github.com/jamalesam93/Nassila/releases/tag/v1.4.0).

### Added

- **Legislation catalogue** — US federal (`congress.gov`, `govinfo.gov`, `uscode.house.gov`), UK `legislation.gov.uk`, generic `.gov` official URLs; EU ELI retained from 1.3.x.
- **Raqim Resolve** — legislation-specific panel hint; provider labels for `us_federal`, `uk_legislation`, `official_catalogue`, `grey_web`.
- **Grey-web stubs** (1.5 prep) — deterministic webpage classification and URL catalogue items without page fetch.
- **Statute import** — merge statute numbers split across PDF/DOCX lines in plain-text bibliography import.
- **Masdar chunking** — paragraph/page-aware excerpt selection with page hints on cite sites.
- **Preflight+** — citation-mapping coverage block/warn thresholds; abstract-only and no-source warnings.
- **Submission integrity bundle** — export JSON from Sharh-lite (preflight + summary + provenance index, no manuscript body).

### Fixed

- **Documentation site (nassila-web)** — resolved 404 routing errors on related doc pages (`/docs/sanad-setup`, `/docs/verification`, `/docs/roadmap`).

### Tests / tooling

- Operator regression fixtures — EU AI Act, US PL 117-58, UK Act 2024/12, statute line-merge; US/UK catalogue and grey-web Resolve unit coverage.

## [1.3.1] — 2026-07-20 · Maktab OCR hardening

Windows installer `Nassila Setup 1.3.1.exe`. **GitHub Release:** [v1.3.1](https://github.com/jamalesam93/Nassila/releases/tag/v1.3.1).

### Fixed

- **OCR packaging** — externalize and unpack `canvas` / `@napi-rs/canvas` / `tesseract.js` (+ core); resolve explicit Tesseract worker/core paths; rasterize PDF pages via pdf.js `canvasFactory` (fixes “Image or Canvas expected” and missing natives in packaged builds).
- **IPC clone errors** — copy PDF buffers before pdf.js / OCR so detached `ArrayBuffer`s no longer throw “An object could not be cloned”; return plain JSON from OCR IPC.
- **Bibliography import** — skip resume/CV preamble before the references block; every OutputPanel row has a delete control.
- **Manuscript PDF** — detect character-reversed Arabic ToUnicode; raise soft OCR page budget **50 → 200**; clearer DOCX guidance when encoding is broken.
- **CI lint** — fix `no-misleading-character-class` in Arabic OCR strip regex.

### Changed

- **Arabic Tesseract deferred** — Arabic-heavy or character-reversed PDFs keep embedded text and warn to prefer **DOCX**; Enhanced OCR runs **eng/fra** only for Latin scans until vision/LLM OCR ships. Settings hint and import warnings updated (EN/AR).
- **Installer size** — do not ship unused `ara.traineddata` (~12 MB); Latin packs remain `eng`/`fra` only until vision/LLM Arabic OCR.
- **OCR progress** — per-page progress IPC (`maktab:ocrProgress`) with loop banner + status bar during long imports.
- **Language packs** — download script ships `eng`/`fra` from `tessdata_fast` only.
- **Raqim Resolve** — EU legislation / EUR-Lex ELI lookup path for statute-style references.

### Added (tests / tooling)

- Unit coverage for OCR language gating, Latin/digit noise cleanup, canvas packaging boundaries, Tesseract worker paths, EU legislation resolve, and document/segment parser cases.
- Optional `scripts/probe-ocr-bundled.mjs` for packaged OCR smoke.

## [1.3.0] — 2026-07-20 · Ouroboros train (Projects → Sharh-lite)

Windows installer `Nassila Setup 1.3.0.exe`.

### Added / changed (1.2.2–1.3.0 train)

- **1.2.2 Throughput** — main-process audit scheduler, run-safe progress/cancellation, resilient partial audits, trust parity tests.
- **1.2.3 Evidence integrity** — per-claim quote validation, evidence provenance, clearer audit semantics, header wordmark cleanup.
- **1.2.4 Raqim Repair** — PMCID/arXiv/OUP/Springer resolver hardening, parser guards, identity-safe registry apply, operator regression fixtures.
- **1.2.5 Masdar Attach** — per-reference source PDF attach, content-addressed extraction cache, offline grounding precedence.
- **1.2.6 Raqim Resolve** — bibliography repair panel; Crossref/PubMed/OpenAlex/DataCite plus Hugging Face, Kaggle, and GitHub host lookup (user applies matches).
- **1.2.7 Projects + Help** — `.nassila` save/open, unified New Session, first-run bibliography tip, Help → website docs, Report issue → GitHub.
- **1.2.8 OCR O2 + a11y** — bundled tessdata_fast eng/fra/ara, enhanced OCR setting, loop findings keyboard navigation.
- **1.2.9 Preflight + quality ledger** — submission preflight gates; opt-in diagnostic export (no manuscript text).
- **1.3.0 Sharh-lite** — deterministic evidence summary panel (claim counts, next actions, deep-link ready).
- **Windows packaging** — correct app/taskbar/shortcut icons via extraResources + post-`--dir` exe stamp before NSIS.
- **Bibliography document import** — DOCX blank-line and PDF numbered-list splitting no longer under-/over-count references.

### Parallel NassilaT data work

- Curate field notes and Tier 3 data. **S15 is parked** until the corpus and holdout exist.

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
