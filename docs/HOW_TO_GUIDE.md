# Nassila — How-to guide

**Nassila** (ناسيلا) is a desktop app for building a reference list, validating it against CSL rules, running a **unified registry check** (L1 + L2), and exporting a formatted bibliography in thousands of CSL styles.

*Verify your references. Ground your claims.*

This guide walks through the main window, how to add and fix references, how verification works, and how to export.

---

## 1. Overview

The app opens to **Manuscript** (Ouroboros loop) or **Bibliography** mode via the header. In Bibliography mode: **Input** (left), **Output** (center), and **Issues** plus style controls (right). The **header** (`AppHeader`) shows counts and global actions; the **status bar** at the bottom shows progress and connectivity hints.

**Typical flow:** paste or import → resolve IDs if needed → fix validation/duplicate issues → **Verify** (online) → pick a CSL style → **Export**.

---

## 2. The window at a glance

| Area | Role |
|------|------|
| **Header** | Mode switch (Manuscript / Bibliography), citation/issue summary, **Import**, **Export**, **Verify**, **Autocorrect**, theme, **About**, and related actions. |
| **Input** | Paste plain text, BibTeX, RIS, or CSL-JSON; resolve DOI / PMID / URL from the top row; triggers parsing into rows. |
| **Output** | One row per reference: formatted preview, type badge, status chips (DOI, Find DOI, etc.), and inline validation lines. |
| **Issues** | Validation errors, duplicate groups, and (after verify) **registry mismatch** cards with jump-to-row. |
| **Style / sidebar** | Choose target journal or CSL style for formatting and export. |
| **Status bar** | Activity and network-related messages. |
---

## 3. Adding references

### 3.1 Paste text

Paste **plain-text references**, **BibTeX**, **RIS**, or **CSL-JSON** into the Input panel. Use **Parse** / the equivalent control to turn the text into bibliography rows in Output.

**Tips**

- Mixed plain-text lists work; the parser uses heuristics (DOI, journal cues, URLs). If a journal article is misclassified as a generic webpage, a DOI plus **Verify** often corrects the type after online resolution.
- For best results, prefer structured imports (`.bib`, `.ris`, `.json`) when you have them.

### 3.2 Resolve identifiers

Use the **top row** in Input for identifiers: paste a **DOI**, **PMID**, **URL**, or **one identifier per line**, then **Resolve**. The app fetches metadata from Crossref, PubMed/NCBI, or Open Library as appropriate and adds or updates rows.

### 3.3 Import files

Click **Import** in the toolbar or press **Ctrl+I**. Supported types include **`.bib`**, **`.ris`**, **`.json`** (CSL-JSON), **`.docx`**, and **`.pdf`**. For DOCX and PDF, the app attempts to extract reference-list-like regions where possible.

---

## 4. Reading the Output panel

Each row corresponds to one reference. You will see a **formatted preview** (using the current style), the **item type** (e.g. journal article, book), **status chips** on the row (DOI, **Find DOI**, volume, **Needs fix**), and any **inline validation** messages under the citation text.

**Per-row actions:** use **Find DOI** when online; read chip colors and inline messages to see what still needs attention. For **duplicate** rows, open the **`...`** menu on the right to **keep** or **delete** an entry. Row order in the list is the order used when you export (especially for numbered styles).

---

## 5. Fixing issues (Issues sidebar)

### 5.1 Validation

The Issues panel lists **missing fields**, **format problems**, and other **CSL validation** messages. Fix items in the Output panel or use **Autocorrect** where applicable.

### 5.2 Duplicates

**Detect duplicates** from the menu/shortcut (**Ctrl+Shift+U**). Duplicate groups appear in Issues; merge or delete extras so each work appears once.

### 5.3 Autocorrect and DOIs

- **Autocorrect** (**Ctrl+Shift+A**) applies safe fixes (normalization, formatting, and similar).
- **Find missing DOIs** (**Ctrl+Shift+D**) attempts to discover DOIs where the engine can infer them.

---

## 6. Verifying references (L1 + L2)

When you are **online**, run **Verify references** from the toolbar, the **References** menu (**Verify references (L1/L2)…**), or **Ctrl+Shift+V**.

### What L1 and L2 mean

- **L1 (registry resolution)** — Whether the app could **anchor** the reference to a trusted catalog entry (DOI/PMID resolution, OpenAlex match, or an explicit “grey / insufficient” outcome).
- **L2 (metadata alignment)** — When L1 found a canonical record, whether **your fields match** (title, year, journal, volume, pages, etc.).

The run uses **one network pass per prioritized row** (up to **200 items** per action): L1 resolves the row to Crossref, PubMed, or OpenAlex; L2 compares your metadata to that record. Crossref/PubMed rows may be **auto-patched** when the registry disagrees; remaining differences appear as **mismatch** cards.

### Mismatch cards

When verify finds fields that still disagree with Crossref, PubMed, or OpenAlex after auto-patch, **yellow mismatch cards** appear in the same **Issues** panel (title, author, year, field name, your value vs canonical). **Click a card** to **scroll to** that row in Output.

The figure above shows **L1/L2 pass** summaries after a successful verify run; when mismatches remain, additional **yellow** cards stack in this panel with a click-to-jump hint.

> **L3** (manuscript-level checks) is **not** part of the current product UI. Legacy code may remain in the repository but is not shown in the app.

---

## 7. Choosing a style and exporting

Pick a **CSL style** from the sidebar (bundled styles plus support for loading styles from the Zotero CSL repository).

- **Export** (**Ctrl+E**) — Export the formatted bibliography (per app prompts and filters).
- **Export CSL JSON** (**Ctrl+Shift+E**) — Export the reference data as CSL-JSON.

---

## 8. Settings and About

Use **About** from the toolbar/menu to see version information, a short description of the workflow, and notes on **network** usage.

Theme (light/dark) follows your preference where the app exposes it; use the theme control in the toolbar if present.

---

## 9. Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+I** | Import reference files |
| **Ctrl+E** | Export bibliography |
| **Ctrl+Shift+E** | Export CSL JSON |
| **Ctrl+Shift+A** | Run autocorrect |
| **Ctrl+Shift+D** | Find missing DOIs |
| **Ctrl+Shift+V** | Verify references (unified L1+L2) |
| **Ctrl+Shift+U** | Detect duplicates |
| **Ctrl+Z** / **Ctrl+Shift+Z** | Undo / Redo |
| **Ctrl+Enter** (Manuscript textarea) | Run manuscript audit |

---

## 10. Network, privacy, and offline use

**Outbound services** may include **Crossref**, **PubMed/NCBI**, **OpenAlex**, and (in retained non-UI code paths) **Unpaywall** / **Europe PMC**. **Do not** paste secrets, credentials, or private unrelated text into citation fields.

**Offline:** parsing, editing, validation, and export of **already loaded** data work without the internet. **Verify**, identifier **Resolve**, and online enhancement require connectivity.

---

## 11. Troubleshooting

| Problem | What to try |
|---------|----------------|
| **Verify** does nothing or shows errors | Check internet, VPN/firewall, and retry; verification is capped to a batch of rows per run. |
| Wrong **item type** (e.g. webpage vs article) | Ensure a **DOI** is present or use **Resolve**; run **Verify** to reclassify from Crossref/PubMed when possible. |
| **Mismatch** after verify | Open the card, jump to the row, compare fields; accept patches already applied or edit manually. |
| Import from **PDF** is empty or partial | PDF reference extraction is heuristic; try pasting text or use a `.bib` / `.ris` export from your reference manager. |
| Export looks wrong | Confirm the chosen **CSL style** matches your venue; check missing fields in Issues. |

---

See [README.md](../README.md) for details.
