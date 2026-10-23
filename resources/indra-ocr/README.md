# Indra OCR — fetched at first run (not bundled)

This directory is intentionally empty in git. `npm run ocr:indra-fetch` populates:

```
resources/indra-ocr/
  models/                 # datalab-to/indra-ocr weights (~97 MB), gitignored
  venv/                   # Python env with the `indra-ocr` package, gitignored
  checksums.sha256        # written by the fetch script
  .nassila-indra-ocr-ready
```

## Why fetched, not bundled

Indra runs as a Python package (`pip install indra-ocr`), and its weights use a
**modified OpenRAIL-M** license rather than an OSI one:

- free for research, personal use, and organizations under $20M
  revenue/funding;
- must not be used to compete with Datalab's API;
- §4(a) requires the use restrictions to flow into any agreement that
  distributes the model, and §4(b) requires shipping the license;
- §8 applies share-a-like to the model **and to its Output**.

Keeping the weights out of the installer and fetching them on demand keeps the
distribution story clean, and the license/notice files are written next to the
models. Bundling them into a release needs a deliberate legal decision — do not
"just include" them in a build.

## Until the Tauri 2 / Rust port

The plan is to port the ONNX graphs (`det.onnx` + `rec_rtl.onnx`) to
`onnxruntime-node` once the app moves to Tauri 2 and the runtime shrinks. Until
then the evaluation harness uses the Python package from this directory. The
app itself does not depend on this folder.

## Commands

```bash
npm run ocr:indra-fetch                 # operator CLI; idempotent, --force to redo
node scripts/fetch-indra-ocr.mjs --force
```

Environment overrides:

- `NASSILA_INDRA_DIR` — destination (default for the CLI: `resources/indra-ocr`)
- `INDRA_OCR_MODEL_DIR` — used by the harness to point at `models/`

## In the app (first run)

`Settings → Local models → Arabic OCR candidate (Indra)` triggers the same
fetch from the main process:

- destination: `userData/indra-ocr` (or `NASSILA_INDRA_DIR`), never the
  installer directory;
- `maktab:indraStatus` — readiness, model size, package version, license;
- `maktab:indraFetch` — downloads the 17 files and provisions the pinned
  `indra-ocr==1.1.2` environment (`uv` preferred, `pip` fallback);
- `maktab:indraFetchProgress` — phase/count stream for the settings card.

The runtime does **not** feed `extractFromPdf` yet; Arabic extraction still
uses PP-OCRv5. It exists for the evaluation harness and the planned Tauri 2
port, where `det.onnx` + `rec_rtl.onnx` move to `onnxruntime-node`.
