# Arabic OCR adapter — eval plan (Step 4)

**Purpose:** Close the PP-OCRv6 Small **non-Arabic** gap without custom OCR training by default.  
**Index:** NassilaT [`2.0_OPERATOR_INDEX.md`](../../NassilaT/training/2.0_OPERATOR_INDEX.md)  
**Maktab context:** [`MAKTAB_OCR.md`](./MAKTAB_OCR.md)

---

## Scope

| In scope | Out of scope |
|----------|----------------|
| Pretrained Arabic recognizer behind `src/engine/maktab/ocr/arabic-adapter.ts` | FT-7 Arabic **L3** validation → **2.1.0** |
| Page images routed by native pdf-inspector | Custom QLoRA OCR train (last resort) |
| Same Maktab page contract (text, provenance, `needsReview`) | Enabling Tesseract `ara` as ship path |
| Golden PDF fixtures + pass bars | Claiming validated Arabic grounding |

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

1. **PaddleOCR Arabic PP-OCRv5** (or latest Arabic family) — preferred if adapter can consume routed page bitmaps
2. Other vetted pretrained Arabic models **only** if they accept the same input/output contract

**Do not assume** PP-OCRv5 weights drop into pdf-inspector's fixed PP-OCRv6 model directory — confirm API compatibility or contribute upstream configurability.

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

Add focused `tests/unit/arabic-ocr-adapter.test.ts` when adapter is real (not stub).

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
