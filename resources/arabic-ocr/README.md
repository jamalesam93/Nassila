# Arabic OCR pack (official PP-OCRv5)

Production Arabic scan OCR for Nassila **2.1.0 Maktab Arabic**.

**Pinned models (official PaddlePaddle — not community medyas v6):**

| Role | Hub |
|------|-----|
| Recognition | [`PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx`](https://huggingface.co/PaddlePaddle/arabic_PP-OCRv5_mobile_rec_onnx) |
| Detection | [`PaddlePaddle/PP-OCRv5_mobile_det_onnx`](https://huggingface.co/PaddlePaddle/PP-OCRv5_mobile_det_onnx) |
| Dictionary | [`snowfluke/ppu-paddle-ocr-models` arabic v5 dict](https://huggingface.co/snowfluke/ppu-paddle-ocr-models) (one char/line for `ppu-paddle-ocr`) |

**Runtime:** `ppu-paddle-ocr` + `onnxruntime-node` in the Electron main process (`src/main/maktab/arabic-paddle-ocr.ts`). IPC routes `languages` containing `ara` to this path — never Tesseract `ara`.

Do **not** use multilingual PP-OCRv5/v6 from the [PP-OCRv6 collection](https://huggingface.co/collections/PaddlePaddle/pp-ocrv6) for Arabic.

## Status

| Item | Status |
|------|--------|
| Adapter seam | Live |
| ONNX pack + dict | `npm run ocr:arabic-adapter` |
| Main-process runner | `arabic-paddle-ocr.ts` |
| Character-reversed ToUnicode PDFs | Still prefer **DOCX** |

## Layout

```
resources/arabic-ocr/
  .nassila-arabic-ocr-ready
  arabic_ppocrv5_mobile_rec.onnx
  arabic_ppocrv5_mobile_rec.yml
  ppocrv5_mobile_det.onnx
  ppocrv5_mobile_det.yml
  ppocrv5_arabic_dict.txt
  checksums.sha256
  README.md
```

## Operator

```bash
npm run ocr:arabic-adapter
npm run probe:arabic-ocr
```

Never ship Tesseract `ara.traineddata` as the primary Arabic path.
