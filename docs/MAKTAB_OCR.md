# Maktab OCR — offline extraction plan

**Worker:** Maktab (مكتب) · **Task:** `doc_extract` (LLM facet planned)  
**Policy:** on-device only for v1; cloud optional later.  
**Languages:** English, Arabic, French (`eng`, `ara`, `fra`).

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
| **B — OCR** | Tesseract (Apache-2.0) + Leptonica (BSD-2) | Scan, empty glyph map, or user selects Enhanced OCR | **Interface stub** |

**Mode** (`MaktabExtractionOptions.mode`):

- `auto` (default) — try tier A; escalate to B when A fails or warns “very little text”
- `embedded_only` — tier A only (fast path)
- `ocr_preferred` — skip to tier B when backend available

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

## OCR backend (Tesseract) — next implementation

1. **Rasterize** PDF pages (~300 DPI quality / 200 DPI fast).
2. **Preprocess** — grayscale, deskew, denoise (Nassila-owned heuristics).
3. **Language packs** — ship or download `eng`, `fra`, `ara` traineddata; optional `osd` for orientation.
4. **Recognize** — Tesseract CLI or native binding in **main process** (IPC to renderer).
5. **Post-process** — de-hyphenation, Unicode normalize, Arabic policy (conservative).
6. **Cache** — key = `sha256(file) + page + dpi + lang pack version`.

**Licensing:** include Tesseract + Leptonica + traineddata notices in `THIRD_PARTY_NOTICES` when bundled.

**Not in scope v1:** custom OCR model training; MinerU or other layout-VLM backends (optional plugin track only).

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
| **Now** | Module interface + tier A routing via `extractFromPdf` |
| **1.2.0** | Masdar-lite uses same extract for OA PDF bytes |
| **1.2.x** | Tesseract backend + OCR fallback in ingest |
| **Tier 3** | Maktab LLM `doc_extract` facet + full-text eval corpus |

---

## Related

- [`LOOP.md`](../LOOP.md) — engineering loop
- [`docs/OUROBOROS.md`](./OUROBOROS.md) — worker map
- [`patterns/ouroboros-registry.yaml`](../patterns/ouroboros-registry.yaml) — stage registry
