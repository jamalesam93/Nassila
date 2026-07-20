# Maktab OCR — offline extraction plan

**Worker:** Maktab (مكتب) · **Task:** `doc_extract` (LLM facet planned)  
**Policy:** on-device only for v1; cloud optional later.  
**Languages:** English and French via Tesseract (`eng`, `fra`). Arabic PDF OCR is **deferred** (prefer DOCX; vision/LLM OCR planned).

---

## Role in Ouroboros

Maktab is the **first deterministic stage** after upload. It produces canonical text for:

- manuscript segmentation (`segments.ts`)
- in-text citation parsing (`intext.ts`)
- bibliography block detection

**Masdar** reuses the same extraction module for cited OA PDFs (1.2.0 Masdar-lite and beyond).

```
Upload PDF/DOCX
    → Maktab.extractFromPdf (tier A: pdf.js | tier B: OCR)
    → segments + cites
    → Masdar (source PDFs, same extract API)
    → Sanad grounding
```

Operator map: NassilaT [`training/OUROBOROS_OPERATOR_MAP.md`](../../NassilaT/training/OUROBOROS_OPERATOR_MAP.md) § Maktab OCR.

---

## Two-tier extraction

| Tier | Engine | When | Status |
|------|--------|------|--------|
| **A — embedded text** | `pdfjs-dist` via `pdf-extract.ts` | PDF has extractable glyphs | **Live** |
| **B — OCR** | Tesseract.js (Apache-2.0) + Leptonica (BSD-2) | Scan, empty glyph map, or OCR is requested | **Live (O1)** |

**Mode** (`MaktabExtractionOptions.mode`):

- `auto` (default) — try tier A; escalate to B when A fails or warns “very little text” **and** the document is not Arabic-deferred
- `embedded_only` — tier A only (fast path)
- `ocr_preferred` — try tier A first; use OCR when A is sparse/empty **for Latin**; Arabic-heavy or character-reversed PDFs keep embedded text and warn to prefer DOCX

OCR language packs for Tesseract are **`eng`/`fra` only**. Soft page budget for OCR is **200** pages (matches manuscript PDF extract).

---

## Nassila-owned module (code)

| Path | Role |
|------|------|
| [`src/engine/maktab/extract.ts`](../src/engine/maktab/extract.ts) | Public entry: `extractFromPdf` |
| [`src/engine/maktab/types.ts`](../src/engine/maktab/types.ts) | `MaktabExtractionResult`, languages, tiers |
| [`src/engine/maktab/ocr/`](../src/engine/maktab/ocr/) | OCR backend interface + post-process |
| [`src/engine/manuscript/pdf-extract.ts`](../src/engine/manuscript/pdf-extract.ts) | Tier A implementation (column-aware pdf.js) |

DOCX ingest remains separate (parser/document path); OCR applies to PDF and image-only inputs.

---

## OCR backend (Tesseract) — O1 live

1. **Rasterize** PDF pages (~300 DPI quality / 200 DPI fast).
2. **Preprocess** — grayscale, deskew, denoise (Nassila-owned heuristics).
3. **Language packs** — `eng` / `fra` from official `tessdata_fast` under `resources/tesseract/`. **`ara` is not shipped** until Maktab LLM/vision OCR; Arabic PDFs prefer DOCX.
4. **Recognize** — Tesseract.js runs in the **main process** through validated IPC.
5. **Post-process** — de-hyphenation, Unicode normalize, Arabic policy (conservative).
6. **Cache** — key = `sha256(file) + page + dpi + lang pack version`.

**Native packaging:** Main is mostly bundled (`externalizeDeps: false`) so portable builds ship `out/**` without the full `node_modules` tree. **`canvas` is external** — Node addons cannot be Rollup-bundled (broken CJS/.node interop; missing Windows Cairo DLLs). `electron-builder.yml` includes `node_modules/canvas/**/*` and `asarUnpack`s it so the `.node` and companion DLLs load from a real filesystem path.

**Licensing:** Tesseract.js and the official Tesseract `tessdata_fast` files are Apache-2.0; Leptonica is BSD-2-Clause. Pack source and license details are recorded in [`resources/tesseract/README.md`](../resources/tesseract/README.md).

Install or refresh the pinned language packs before packaging:

```bash
npm run ocr:langpacks
```

The script downloads the official `tessdata_fast` packs for eng/fra (pinned to 4.1.0) and writes `resources/tesseract/checksums.sha256`. Electron Builder copies that directory to the installed app's resources. In development, OCR reads the same files directly from the repository.

**Not in scope v1:** custom OCR model training; MinerU or other layout-VLM backends (optional plugin track only).

If the files are absent in a development or CI checkout, OCR emits a clear warning and leaves Tesseract.js's network fallback available. Release builds must run `npm run ocr:langpacks`; packaged builds always prefer the bundled directory.

---

## Golden fixtures (add with Tesseract backend)

| Fixture | Assert |
|---------|--------|
| Clean PDF with embedded text | tier A, no OCR |
| Scanned EN page | tier B, min char threshold |
| Scanned AR page | tier B, RTL text present |
| Two-column paper | reading order sane |
| References section | `segments.ts` finds bibliography |

---

## App versions (operator map alignment)

| Version | Maktab / OCR deliverable |
|---------|--------------------------|
| **1.2.0 / O1** | Tesseract.js backend (EN/AR/FR) in main-process IPC; Masdar-lite reuses `extractFromPdf` for OA PDF bytes |
| **1.2.8 / O2** | Offline/bundled language-pack policy, golden fixtures, provenance/cache UX, scan fallback, Enhanced OCR control, hardware smoke |
| **Tier 3** | Maktab LLM `doc_extract` facet + full-text eval corpus |

---

## Related

- [`LOOP.md`](../LOOP.md) — engineering loop
- [`docs/OUROBOROS.md`](./OUROBOROS.md) — worker map
- [`patterns/ouroboros-registry.yaml`](../patterns/ouroboros-registry.yaml) — stage registry
