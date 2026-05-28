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

## L1 and L2 (no L3 in this release)

- **L1 (registry resolution)** — Whether the app could anchor the reference to a trusted catalog entry (DOI/PMID resolution, OpenAlex match, or explicit “grey / insufficient” outcomes).
- **L2 (metadata alignment)** — Whether your fields match the canonical record when L1 found one (title/year/journal/volume/page signals).

**L3** (passage-level checks tied to full manuscripts) is **not** exposed in the current product UI; related code remains in the repository for possible future use.

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

## Retired manuscript audit UI

The previous **Manuscript audit** tab is **not shown** anymore. Engine and UI code under `src/renderer/components/ManuscriptAudit/` and related hooks are **kept in the repo** but not mounted in the main window. See `src/renderer/components/ManuscriptAudit/README.md`.
