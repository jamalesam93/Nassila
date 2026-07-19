# Nassila — User guide

For a step-by-step walkthrough with figures, see **[HOW_TO_GUIDE.md](HOW_TO_GUIDE.md)**.

**Nassila** (ناسيلا) is a desktop app for **building a reference list**, **validating** it against CSL rules, running a **unified registry check** (L1 + L2), and **exporting** a formatted bibliography before you submit.

*Verify your references. Ground your claims.*

## Main workflow

1. **Add references** — Paste plain text, BibTeX, RIS, or CSL-JSON in the **Input** panel, or use **Import** (toolbar or Ctrl+I) for `.bib`, `.ris`, `.json`, `.docx`, or `.pdf` (DOCX/PDF extract reference lists where possible).
2. **Resolve identifiers** — Use the top row in Input to paste a DOI, PMID, URL, or one identifier per line, then **Resolve**.
3. **Fix local issues** — The **Issues** sidebar lists validation problems, duplicate groups, and (after you verify) registry field mismatches. Use **Autocorrect** and per-row actions in **Output**.
4. **Verify references** — Toolbar button, **References → Verify references (L1/L2)…**, or **Ctrl+Shift+V** (when online). This runs **one network pass per prioritized row** (up to 200 items): **L1** resolves the row to Crossref, PubMed, or OpenAlex; **L2** compares your metadata to the canonical record. Crossref/PubMed rows may be **auto-patched** when the registry disagrees; remaining differences appear as mismatch cards.
5. **Choose style & export** — Pick a CSL style in the sidebar, then **Export** (Ctrl+E).

## Passage grounding (Sanad)

Sanad checks manuscript claims against source excerpts using a local LLM and returns structured JSON verdicts with verbatim quotes.

### Setup

1. Open **Settings → Passage grounding**.
2. Choose a local runner (LM Studio, Ollama, vLLM, or Custom) or a **Cloud API**.
3. Select a tier chip: **E4B** (default, ~8 GB VRAM) or **12B** (quality, ~12 GB+ VRAM).
4. The model auto-defaults to `nassila-sanad-e4b` / `nassila-sanad-12b`.

A **Set up Sanad** modal appears on first use with links to Hugging Face, runner downloads, and Ollama pull commands. Dismiss it after setup.

### Manuscript Sanad bar

When editing a manuscript, a **Sanad bar** appears at the top with:

- **Toggle** — enable/disable grounding for the current session
- **Tier chip** — switch between E4B and 12B
- **Setup / Configure** links — reopen the Sanad setup modal or Passage grounding settings

### Open-access source fetch (Unpaywall)

For **DOI** references, Nassila can ask [Unpaywall](https://unpaywall.org/products/api) whether open-access full text exists (in addition to Europe PMC and registry abstracts).

1. Open **Settings → General → Manuscript source fetch**.
2. Enter your email once (Unpaywall API policy). It is saved **only on this computer** and sent **directly to Unpaywall** from the app — not to Nassila servers.
3. Future manuscript audits reuse it automatically.

If the email is unset, the loop still uses **registry abstracts** and **Europe PMC** where available; only the Unpaywall OA path is skipped.

**This is not university login.** Your `@institution.edu` address is only an Unpaywall API contact. It does **not** unlock paywalled publisher PDFs through your library subscription. For those papers, use open-access copies when Unpaywall finds them, or attach PDFs you download yourself (Masdar, planned). Tier 3 may add library proxy or institutional login — separate from this field.

## Bibliography before manuscript audit

If your **References** section is messy or never verified, audit results will be weak (bad cite→ref mapping, false L1 flags, poor Sanad input). **Organize in Bibliography first:**

1. Switch to **Bibliography** in the header.
2. Import or paste references; run **Verify references** and fix issues in **Output**.
3. Return to **Manuscript**, ensure the embedded reference list matches your curated library, then **Run audit**.

## Manuscript loop

The Manuscript view includes an **integrated loop**: paste or upload a manuscript (with a References section), run **Run audit**, then review each cited source on the right.

### What you see after an audit

For each in-text citation, expand **Passage grounding** to review:

| Panel | Meaning |
|-------|---------|
| **Your passage** | Text from your manuscript around the cite (what Sanad judges) |
| **Source excerpt** | Chunk from the cited work (abstract or OA text) actually sent to the model |
| **Claims + quotes** | Per-claim verdict and verbatim quotes from the excerpt when supported |
| **Source text** (header) | `Abstract only`, `Open-access full text`, or `Unavailable` — what was fetched |

**L1 / L2 / L3** chips summarize registry match, metadata alignment, and passage grounding for that reference.

### Coverage labels

- **Abstract only** — Full paper not available via OA; Sanad compared against the registry abstract.
- **Open-access full text** — Europe PMC text or an OA PDF discovered through Unpaywall was extracted and used (the excerpt may still be chunk-selected).
- **Source text unavailable** — No abstract and no OA text; passage checks are limited.

Cited **local PDF attach** is not wired into audits yet; it remains planned for Masdar. Masdar-lite already fetches and extracts open-access source text when available.

- **Tasnif** (classification) and **Sharh** (explanation) appear inline in the loop detail and bibliography drawer — not as separate tabs.
- **Raqim** (numbering) works in bibliography mode.
- Grounding runs automatically through Sanad when the loop audit is triggered.
- **Maktab** manuscript extraction is live through DOCX/text and pdf.js/Tesseract O1; **Masdar-lite** OA source extraction is live. Their LLM facets, local-PDF attach, and **Shahid** evidence remain planned.

For scanned PDFs, Tesseract O1 supports English, Arabic, and French OCR. The first OCR use for a language currently downloads its traineddata pack from the Tesseract.js CDN; offline/bundled packs and enhanced OCR controls are planned for O2.

## L1 and L2 (bibliography mode)

- **L1 (registry resolution)** — Whether the app could anchor the reference to a trusted catalog entry (DOI/PMID resolution, OpenAlex match, or explicit “grey / insufficient” outcomes).
- **L2 (metadata alignment)** — Whether your fields match the canonical record when L1 found one (title/year/journal/volume/page signals).

**L3** (passage-level grounding) runs in the **Manuscript loop** when Passage grounding is enabled (see above). Bibliography-only mode uses L1+L2.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+I | Import reference files |
| Ctrl+E | Export bibliography |
| Ctrl+Shift+E | Export CSL JSON |
| Ctrl+Shift+A | Run autocorrect |
| Ctrl+Shift+D | Find missing DOIs |
| Ctrl+Shift+V | Verify references (unified L1+L2) |
| Ctrl+Shift+U | Detect duplicates |
| Ctrl+Z / Ctrl+Shift+Z | Undo / Redo |

## Network and privacy

Outbound calls may include **Crossref**, **PubMed/NCBI**, **OpenAlex**, **Unpaywall** (when you save an email in Settings → General), and **Europe PMC** for manuscript source fetch. Local LLM grounding (Sanad) runs on your machine via LM Studio, Ollama, vLLM, or a cloud API you configure. Do not paste secrets into citation fields.
