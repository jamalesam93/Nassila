[![Nassila banner](docs/media/banner.png)](https://github.com/jamalesam93/Nassila/releases/latest)

# Nassila

**Nassila** (ناسيلا) is a Windows desktop app that helps you **clean and check a reference list before you submit** — not a full reference manager, but a quality pass on citations you already have.

*Verify your references. Ground your claims.*  
*The last check before you submit — bibliography, registries, and source-backed writing.*

Import or paste your bibliography, fix common errors, verify rows against Crossref / PubMed / OpenAlex, flag predatory journals, remove duplicates, and export in thousands of [CSL](https://citationstyles.org/) styles.

| | |
|---|---|
| **Download (Windows)** | [**v2.0.0**](https://github.com/jamalesam93/Nassila/releases/tag/v2.0.0) · [Latest release](https://github.com/jamalesam93/Nassila/releases/latest) |
| **Sanad model (HF)** | [`nassila-sanad-9b`](https://huggingface.co/QinEmPeRoR93/nassila-sanad-9b) (**FT-6** / v119 — sole tier; 6 default + 6 MTP GGUFs) — setup on the [website](https://nassila-web.vercel.app/en/docs/manuscript) |
| **Website & docs** | [nassila-web.vercel.app](https://nassila-web.vercel.app) — [How-to](https://nassila-web.vercel.app/en/docs/how-to) · [User guide](https://nassila-web.vercel.app/en/docs/user-guide) · [Changelog](https://nassila-web.vercel.app/en/changelog) |
| **Documentation (repo)** | [How-to guide](docs/HOW_TO_GUIDE.md) · [User guide](docs/USER_GUIDE.md) · [Brand](docs/BRAND.md) · [Changelog](CHANGELOG.md) |
| **License** | [MIT](LICENSE) |

> End users: install from **Releases** ([**v2.0.0**](https://github.com/jamalesam93/Nassila/releases/tag/v2.0.0)) or visit the [**website**](https://nassila-web.vercel.app). Developers: clone this repo and see [Getting started](#getting-started).

The name **Nassila** is coined, inspired by the idea of a **sanad** (سند): a clear chain from what you write to where it came from.

## What's new in v2.0.0 — MaktabOCR + Shahid

- **Maktab OCR (embedded + scan fallback)** — Native PDF layout inspection (`@firecrawl/pdf-inspector`) with selective scan OCR fallback. Born-digital PDFs extract vector text instantly, while scanned pages or degraded raster documents route automatically to bundled offline OCR (Tesseract English/French/Arabic) or the pretrained Arabic adapter.
- **Shahid Multimodal (table & figure evidence)** — Deterministic extraction and binding of target Markdown tables, data cells, and figure captions from complex literature to verify data-driven claims with cell-level precision and visual proximity protection.
- **End-to-End Grounding Verification** — Full Tier 3 validation across full-text manuscripts with verbatim citation evidence matching, zero false-supported hallucinations, and independent claim scoring decoupled from UI triage pills.
- **Two-Tier UX Decoupling** — Finding-level triage status (pill color: pass/warn/fail) is cleanly separated from individual claim scientific verdicts (supported/weak/contradicted/not_in_source/insufficient_evidence).
- **Abstract-Only Caution Chips** — Clear UI caution chips display on paywalled or closed-access citations evaluated only from abstracts, alerting authors when full-text inspection is recommended.
- **Offline Stability & Packaged Parity** — Verified zero-network installation and execution on Windows workstations with bundled language resources, full local privacy, and strict security boundaries.

## What's new in v1.10.1 — Packaged network parity

- **"Keep my title — find correct DOI" works in installed builds** — the DOI↔title repair searched Crossref / PubMed / OpenAlex from the sandboxed renderer, which the production security policy blocks, so the button silently did nothing in the installed app (dev runs were unaffected). The registry search now runs in the main process with the same semantics: your title is the trusted anchor, the replacement DOI must genuinely belong to it, and only empty fields fill from the new record.
- **DOI lookup, Autocorrect's online step, and the input-bar "Resolve" work in installed builds** — all three used the same blocked renderer path; all three now resolve through the main process.
- **"Update list" (predatory-journal banner) reports failure** with a toast instead of failing silently.

Full notes: [CHANGELOG.md](CHANGELOG.md) · [v2.0.0 release](https://github.com/jamalesam93/Nassila/releases/tag/v2.0.0).

## Who is this for?

- Students and researchers preparing a thesis or manuscript reference list  
- Anyone exporting from **Zotero**, **Mendeley**, or **EndNote** who wants validation and registry checks before submission  
- Editors who need a quick **predatory-journal** screen and **duplicate** detection on a batch of references  

## What it does

1. **Import or paste** — BibTeX, RIS, CSL-JSON, plain text, DOCX/PDF reference sections, or manager exports  
2. **Validate** — missing fields and style-specific issues (works offline)  
3. **Autocorrect** — DOI formats, capitalization, page ranges, medRxiv/bioRxiv DOI canonicalization, and more  
4. **Verify references** — one action: resolve each row to Crossref, PubMed, or OpenAlex (**L1**), then compare your metadata to the canonical record (**L2**), with safe auto-patches when registries agree (up to **200** prioritized rows per run)  
5. **Predatory journal scan** — match journal titles against bundled and updatable predatory/pseudo-journal lists  
6. **Deduplicate** and **export** — formatted bibliography in APA, IEEE, Vancouver, Chicago, Harvard, MLA, Nature (bundled), or any style from the [Zotero CSL repository](https://github.com/citation-style-language/styles)  
7. **Manuscript loop (Ouroboros)** — upload or paste a manuscript, verify cited references (L1/L2) with duplicate entries merged, fetch open-access source text, attach source PDFs individually or by scanning a whole folder (matched references re-audited only), and optional **Sanad** passage grounding (L3) — [manuscript guide](https://nassila-web.vercel.app/en/docs/manuscript)

**Privacy:** list editing and validation work offline. Registry verification, DOI lookup, predatory-list sync, and manuscript source fetch use the network only when you run those actions.

## Highlights

| Area | Capability |
|------|------------|
| Parsing | BibTeX, RIS, CSL-JSON, plain text, URL-only webpages, DOCX/PDF reference extraction (PDF uses fast Rust WASM parser with Markdown tables & column layout) |
| Resolution | DOI, ISBN, PMID, URL → Crossref, PubMed, Open Library |
| Verification | Unified L1+L2 registry check (main-process IPC in packaged app), up to 200 rows per run |
| Integrity | Predatory/suspicious journal flags, duplicate groups with merge |
| Manuscript | Ouroboros loop: L1/L2 verify + bibliography dedupe, OA source fetch, per-source PDF attach or folder-scan attach with review, targeted re-audit, optional Sanad L3 ([HF model](https://huggingface.co/QinEmPeRoR93/nassila-sanad-9b)) |
| Output | CSL formatting, undo/redo, dark/light mode, EN/AR UI |

## Getting started

### Prerequisites

- Node.js 20.19+ (Node 22 LTS recommended)
- npm 9+

### Install and run locally

```bash
npm install
npm run dev
```

### Build the Windows installer

```bash
npm run icon:raster   # once: generates build/icon.png
npm run build
npm run build:win     # → dist/Nassila Setup <version>.exe
```

Other targets: `npm run build:mac`, `npm run build:linux`, `npm run build:unpack` (unpacked Windows folder for testing).

### Tests

```bash
npm test
```

## Tech stack

Electron · React 19 · TypeScript · Tailwind · citeproc-js · Zustand · Vitest

## Open-source acknowledgments

Nassila is built on top of incredible open-source tools, libraries, and specifications:

| Project | Role in Nassila | License |
|---------|-----------------|---------|
| [**pdf-inspector**](https://github.com/firecrawl/pdf-inspector) | Fast Rust PDF classification, layout recovery, and Markdown text/table extraction (Maktab Tier A) | MIT |
| [**citeproc-js**](https://github.com/juris-m/citeproc-js) | CSL citation formatting engine powering APA, IEEE, Vancouver, Chicago, and custom styles | AGPL-2.0 / CPAL-1.0 |
| [**Tesseract.js**](https://github.com/naptha/tesseract.js) | Pure JS OCR engine for offline document scan text extraction (Maktab Tier B) | Apache-2.0 |
| [**PDF.js**](https://github.com/mozilla/pdf.js) | Fallback PDF rendering and text content extraction | Apache-2.0 |
| [**Citation-js**](https://github.com/citation-js/citation-js) | Parsing BibTeX, RIS, and CSL-JSON reference formats | MIT |
| [**Mammoth**](https://github.com/mwilliamson/mammoth.js) | Converting DOCX manuscript documents for reference section ingest | BSD-2-Clause |
| [**CSL Styles**](https://github.com/citation-style-language/styles) | Citation Style Language (CSL) repository powering 10,000+ academic styles | CC-BY-SA 3.0 |
