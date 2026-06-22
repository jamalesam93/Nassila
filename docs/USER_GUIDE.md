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

## Manuscript loop

The Manuscript view now includes an **integrated loop** that combines audit, grounding, and bibliography tasks in one surface (no separate audit tab).

- **Tasnif** (classification) and **Sharh** (explanation) appear inline in the loop detail and bibliography drawer — not as separate tabs.
- **Raqim** (numbering) works in bibliography mode.
- Grounding runs automatically through Sanad when the loop audit is triggered.
- Pipeline stages that are not yet implemented (Maktab, Masdar, Shahid) appear as honest stubs, not functional apps.

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

Outbound calls may include **Crossref**, **PubMed/NCBI**, **OpenAlex**, and (for optional features in retained manuscript code) **Unpaywall** / **Europe PMC**. Do not paste secrets into citation fields.
