# Indra OCR — downloaded by the app (not bundled)

This directory is empty in git. The app downloads the Arabic-path weights into
`userData/indra-ocr` (or `NASSILA_INDRA_DIR`). A checkout of the weights for
local evaluation can live here, and is gitignored.

```
userData/indra-ocr/models/
  det.onnx
  script.onnx
  rec.onnx
  rec_rtl.onnx
  orient.onnx
  order.onnx
  meta.json
  LICENSE
```

About 14 MB. Revision `v1.1.0`. The CJK, math, and language-model files are
not used by the Arabic path.

## Why downloaded, not bundled

The weights use a **modified OpenRAIL-M** license rather than an OSI one:

- free for research, personal use, and organizations under $20M
  revenue/funding;
- must not be used to compete with Datalab's API;
- §4(a) requires the use restrictions to flow into any agreement that
  distributes the model, and §4(b) requires shipping the license;
- §8 applies share-a-like to the model **and to its Output**.

The installer does not contain the weights. Settings → Local models downloads
them, and the LICENSE file is stored beside the models.

## How the app runs them

`src/main/maktab/indra-ocr.ts` loads the eight files with onnxruntime-node
(the same runtime Paddle uses) and OpenCV.js for resize and rotation. No
Python. Arabic OCR pages go to Indra first. PaddleOCR re-reads a page when
Indra throws or returns fewer than 40 characters.

## Operator comparison against the Python package

`npm run ocr:indra-fetch` still installs the Python `indra-ocr` package for
`scripts/eval-arabic-ocr/run_indra.py`. That path is not used by the app.
The TypeScript runner is `scripts/eval-arabic-ocr/run-indra-ts.ts`.
