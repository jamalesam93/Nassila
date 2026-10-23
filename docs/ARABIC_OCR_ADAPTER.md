# Arabic OCR adapter — eval plan (Step 4) + 2.1 production track

**Purpose:** Close the PP-OCRv6 Small **non-Arabic** gap without custom OCR training by default.  
**Index:** NassilaT [`2.1_2.2_ARABIC_OPERATOR_INDEX.md`](../../NassilaT/training/2.1_2.2_ARABIC_OPERATOR_INDEX.md) (2.0 stub → archive)  
**Maktab context:** [`MAKTAB_OCR.md`](./MAKTAB_OCR.md) · pack [`resources/arabic-ocr/README.md`](../resources/arabic-ocr/README.md)

**Honesty (2026-10-23):** **2.1.1 shipped.** Official Arabic PP-OCRv5 ONNX pack + main-process `ppu-paddle-ocr` runner + IPC `ara` route remain the extractor (2.1.0). 2.1.1 adds per-line reversal, legacy-encoded routing, and an optional Indra fetch. Operator: `npm run ocr:arabic-adapter` then `npm run probe:arabic-ocr`. Reverse-font ToUnicode **always** prefers DOCX. Sanad FT-7 is **2.2.0**, paused for budget.

---

## Scope

| In scope | Out of scope |
|----------|----------------|
| Pretrained Arabic recognizer behind `src/engine/maktab/ocr/arabic-adapter.ts` | Claiming FT-7 Arabic **L3** without 2.2.0 GO |
| Page images routed by native pdf-inspector | Custom QLoRA OCR train (last resort) |
| Same Maktab page contract (text, provenance, `needsReview`) | Enabling Tesseract `ara` as ship path |
| Golden PDF fixtures + pass bars | Shipping 2.2.0 before Track B PASS |
| Pack `resources/arabic-ocr/` + lift scan deferral (shipped 2.1.0) | Waiting on FT-7 / Vast to ship 2.2.0 |

---

## Architecture (locked)

```
native pdf-inspector (page image route)
  → ArabicRecognizerAdapter.recognize(pageImage)
  → normalized page text + confidence + engineId
  → Maktab result (same as Latin OCR path)
```

Code seam: [`src/engine/maktab/ocr/arabic-adapter.ts`](../src/engine/maktab/ocr/arabic-adapter.ts)  
IPC stays in main — renderer uses `maktab:native*` only.

---

## Candidate recognizers (benchmark before picking)

Evaluate in this order; record in `reports/arabic_ocr_benchmark_YYYYMMDD.md`:

1. **Official Paddle Arabic PP-OCRv5 ONNX** (locked for 2.1) — [`arabic_PP-OCRv5_mobile_rec_onnx`](https://huggingface.co/PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx) + [`PP-OCRv5_mobile_det_onnx`](https://huggingface.co/PaddlePaddle/PP-OCRv5_mobile_det_onnx). Fetch via `npm run ocr:arabic-adapter`.
2. **Not** multilingual PP-OCRv5/v6 from the [PP-OCRv6 collection](https://huggingface.co/collections/PaddlePaddle/pp-ocrv6) (CJK/EN/Latin — no Arabic).
3. **Not** community [`medyas/arabic_PP-OCRv6_small_rec`](https://huggingface.co/medyas/arabic_PP-OCRv6_small_rec) for the first ship (optional later A/B only).

**Do not assume** Arabic weights drop into pdf-inspector's fixed PP-OCRv6 Latin model directory — pack under `resources/arabic-ocr/` and run behind `ArabicRecognizerAdapter`.

### Indra OCR (evaluated, fetched on demand, not shipped in extraction)

Indra (`datalab-to/indra-ocr`, ONNX CPU, 80+ languages including `rec_rtl`) is the leading candidate from the 2026-10 evaluation: on 84 reference-valid pages it beat PP-OCRv5 (median CER 0.067 vs 0.120) at ~8× speed, but it has a heavier tail (dark/designed pages, historical handwriting fails on both) and a modified OpenRAIL-M license.

- **App wiring:** Settings → Local models → **Arabic OCR candidate (Indra)** (`maktab:indraFetch`, `maktab:indraStatus`, progress on `maktab:indraFetchProgress`). It fetches 17 model files (~92 MB) to `userData/indra-ocr` and provisions `indra-ocr==1.1.2`; nothing is bundled. Operator equivalent: `npm run ocr:indra-fetch`.
- **Not wired into `extractFromPdf`.** Arabic extraction remains PP-OCRv5 until the router + plausibility guards and the Tauri 2 ONNX port land.
- **Harness:** `npm run eval:ocr:arabic -- all --corpus <dir>` scores both engines on the same rasters; see [`scripts/eval-arabic-ocr/README.md`](../scripts/eval-arabic-ocr/README.md).
- **Evidence:** [`reports/arabic_ocr_real_holdout_20261023.md`](../reports/arabic_ocr_real_holdout_20261023.md). Raw harness (not in this repo): `E:\Antigravity Projects\NassilaAGY\ocr-ab` — `eval-report-big.md` (103 gold + 126 scan pages; Indra wins 74/84 valid pages, median CER 0.067 vs 0.120, heavier tail), `pdf-inspector-arabic.md`, `ab-report.md`.

---

## Golden fixture tiers

Extend [`tests/fixtures/maktab-pdf-builder.ts`](../tests/fixtures/maktab-pdf-builder.ts) and [`tests/unit/maktab-golden-fixtures.test.ts`](../tests/unit/maktab-golden-fixtures.test.ts):

| Tier | Cases | Pass criterion |
|------|-------|----------------|
| **A** | Arabic embedded text PDF (Identity-H) | No OCR route; text recovered |
| **B** | Arabic scan (synthetic raster) | Adapter OCR; CER/WER vs gold |
| **C** | Mixed AR/Latin references, Arabic-Indic digits | Both scripts in output |
| **D** | Two-column Arabic page | Reading order vs gold order |
| **E** | Low-res / rotated scan | `needsReview` or recover above floor |
| **F** | Table + caption (deterministic region) | Caption tokens present |

Store expected gold strings in test fixtures — **no** private thesis PDFs in repo.

---

## Benchmark procedure

### 1. Prepare page images

- Use native `classifyPdf` / `processPdfWithOcr` to export routed page images (or fixture builder raster at 300 dpi).
- Hash inputs: `sha256(pdf) + page + dpi + adapter_revision`.

### 2. Run adapter

```bash
# After implementation — example
npm test -- tests/unit/maktab-golden-fixtures.test.ts
npm test -- tests/unit/native-pdf-inspector.test.ts
```

Focused pack tests: `tests/unit/arabic-paddle-ocr-pack.test.ts`. Golden fixtures: `tests/unit/maktab-golden-fixtures.test.ts`.

### 3. Score

| Metric | Initial bar (lock before holdout) | Notes |
|--------|----------------------------------|-------|
| Character accuracy (CER) on tier B/C | TBD — set after pilot n≥20 pages | |
| Keyword recall (gold token set) | ≥95% on tier B pilot | Domain tokens from fixtures |
| `needsReview` rate on tier E | Honest flag — no fake pass | |
| False Arabic on Latin-only scans | 0 on Latin golden set | No regression |

Declare final bars in this file's **Freeze** section before Arabic DOCX deferral is lifted.

---

## Integration gates

Status for 2.0.0 scaffold & candidate adapter:

- [x] Adapter returns Maktab contract fields (`engineId`, confidence, provenance)
- [x] Native path uses adapter only when page language/route requires Arabic OCR
- [x] Packaged Windows probe includes Arabic negative controls and Tier B–F golden cases ([`PACKAGED_OCR_SMOKE.md`](./PACKAGED_OCR_SMOKE.md))
- [x] Retrieval suite includes layout / OCR cases ([`retrieval_eval_product_v1.md`](../../NassilaT/training/reports/retrieval_eval_product_v1.md))
- [x] Resource budget row filled in [`FEATURES-AND-TWEAKS.md`](./FEATURES-AND-TWEAKS.md) #22

---

## Freeze block (benchmarked 2026-09-06)

```markdown
## Arabic adapter freeze — 2026-09-06
- **Chosen model:** PaddleOCR Arabic PP-OCRv5 (`paddleocr-arabic-ppocrv5`)
- **Adapter revision:** `2026.09-v5`
- **CER (tier B):** 0.00 (distance: 0 vs gold text; gate < 0.05)
- **Keyword recall:** 100.0% (3/3 gold tokens matched: مقاومة مضادات الميكروبات, المستشفيات, المراقبة; gate >= 95%)
- **Latin negative control:** 0 false-Arabic characters on Latin goldens
- **Reviewer:** Maktab OCR & Packaging Specialist (Track E)
```

---

## Failure actions

| Symptom | Action |
|---------|--------|
| CER above bar on clean scans | Try next candidate model; do not ship `ara` Tesseract |
| pdf-inspector API too rigid | Upstream issue or thin wrapper; document blocker |
| Latin regression | Keep adapter off for non-Arabic routes |
| Still failing after 2 candidates | Written memo → optional custom train (explicitly out of default 2.0 path) |
