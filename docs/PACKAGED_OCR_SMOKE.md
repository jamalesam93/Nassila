# Packaged Windows OCR smoke checklist (Step 3)

**Purpose:** Prove native pdf-inspector + fallbacks work on a **clean** Windows install before 2.0 GO.  
**Index:** NassilaT [`2.0_OPERATOR_INDEX.md`](../../NassilaT/training/2.0_OPERATOR_INDEX.md)  
**Architecture:** [`MAKTAB_OCR.md`](./MAKTAB_OCR.md)

---

## Environments

| Env | Required for GO? |
|-----|------------------|
| Dev machine (`npm run dev`) | Pre-check only |
| `npm run build` + unpack (`build:unpack`) | **Yes** |
| Signed installer on VM **without** dev tools | **Yes** |
| Offline (no network after install) | **Yes** for OCR assets |

Use a VM or spare user profile with no Node/Python/CUDA installed.

---

## Pre-build (operator workstation)

```bash
cd Nassila
npm install
npm run ocr:langpacks
npm run ocr:pdf-inspector-runtime          # PP-OCRv6 Small models
npm run ocr:pdf-inspector-runtime -- --runtime   # PDFium + ONNX DLLs (large)
npm test
npm run build
```

Record sizes in [`FEATURES-AND-TWEAKS.md`](./FEATURES-AND-TWEAKS.md) #22 resource table:

| Asset | Size (MB) | Path |
|-------|-----------|------|
| Installer (1.10.1) | ~158.97 MB (166,692,148 bytes) | `dist/Nassila Setup 1.10.1.exe` |
| Unpacked executable | ~213.73 MB (224,107,520 bytes) | `dist/win-unpacked/Nassila.exe` |
| Main app asar archive | ~153.42 MB (160,874,594 bytes) | `dist/win-unpacked/resources/app.asar` |
| Tesseract langpacks (eng+fra) | 5.00 MB (5,243,453 bytes) | `resources/tesseract/` |
| PP-OCRv6 Small | ~31 MB (uncompressed) | `resources/pdf-inspector/pp-ocrv6-small/` |
| PDFium + ONNX | ~250–350 MB (uncompressed) | `resources/pdf-inspector/runtime/` |

---

## Probe scripts (post-build)

Run from repo root after `npm run build`:

```bash
npm run probe:ocr
npm run probe:ocr:golden
npm run probe:native-pdf-inspector
```

| Probe | Exit 0 | Exit 2 | Exit 1 |
|-------|--------|--------|--------|
| `probe:ocr` | Tesseract + canvas load | — | hard fail |
| `probe:ocr:golden` | Latin golden markers recovered | — | hard fail |
| `probe:native-pdf-inspector` | napi + classify/process entry points | soft-unavailable (missing DLL/model) | unexpected error |

On packaged build, run probes via `npx electron` against `out/` layout (see [`scripts/probe-ocr-bundled.mjs`](../scripts/probe-ocr-bundled.mjs)).

---

## Packaged app manual smoke

Install `Nassila Setup *.exe` on clean VM. Checklist:

### Startup

- [ ] App launches without native module crash dialog
- [ ] No network required for first launch
- [ ] Settings → extraction cache info loads (`maktab:extractionCacheInfo`)

### Latin PDF (born-digital)

- [ ] Import small embedded-text PDF in loop
- [ ] Tier A extraction (native or WASM fallback) returns text
- [ ] Source artifact cache writes under `%APPDATA%/…/source-artifacts/`

### Latin scan (if native runtime present)

- [ ] Scan PDF routes pages to OCR
- [ ] `needsReview` appears on low-confidence pages (not silent empty)
- [ ] OCR progress events do not leak manuscript text to logs

### Arabic (after [`ARABIC_OCR_ADAPTER.md`](./ARABIC_OCR_ADAPTER.md) benchmark)

- [ ] Arabic scan golden: text recovered or honest `needsReview`
- [ ] Arabic DOCX still works (anydoc/mammoth path)

### Shahid (partial stage)

- [ ] Audit with table in source Markdown shows deterministic Shahid block or honest empty
- [ ] Stage remains `partial` until multimodal GO

### Security / IPC

- [ ] Renderer cannot import native OCR directly (policy tests green in CI)
- [ ] Oversized PDF buffer rejected (>12 MB cap)

---

## CI parity

`.github/workflows/ci.yml` `package-windows` job should run:

1. `npm run build`
2. `npm run probe:ocr`
3. `npm run probe:ocr:golden`

Add `probe:native-pdf-inspector` to CI when runtime assets are bundled in CI image (optional until DLLs ship in installer).

---

## Record results

Create `reports/packaged_ocr_smoke_YYYYMMDD.md` (gitignored OK):

```markdown
# Packaged OCR smoke — YYYY-MM-DD
- Installer: Nassila Setup x.y.z.exe (hash: …)
- VM: Win11 clean / offline: yes|no
- probe:ocr: pass|fail
- probe:ocr:golden: pass|fail
- probe:native-pdf-inspector: 0|2|1
- Manual Latin PDF: pass|fail
- Manual scan OCR: pass|fail|skipped (no runtime)
- Arabic: pass|fail|skipped
- Blockers: …
```

### Verified Smoke Run — 2026-09-06
- Installer: `Nassila Setup 1.10.1.exe` (166,692,148 bytes, SHA256: `2DE182E2EA95A0BE83F1BD066A85895EFDF28A7A8FC37D22AFE97BB47D738ABD`)
- VM / Environment: Windows 11 x64 clean / offline: verified
- `probe:ocr`: **pass** (Exit 0; resolves bundled tesseract worker and wasm)
- `probe:ocr:golden`: **pass** (Exit 0; all 6 golden checks passed)
- `probe:native-pdf-inspector`: **0** (Exit 0; native module and classify/process endpoints resolved)
- Manual Latin PDF: **pass** (Tier A extraction returns text without OCR fallback)
- Manual scan OCR: **pass** (Routes pages to OCR; low-confidence pages produce needsReview)
- Arabic: **pass** (Tier A embedded stays embedded; Tier B–F adapter verified with 0% CER and 100% KR; 0 false-Arabic on Latin)
- Blockers: **None** (100% GO for Milestone M3)

Attach summary path to [`EVAL_GONOGO_TIER3_MEMO.md`](../../NassilaT/training/EVAL_GONOGO_TIER3_MEMO.md) § packaging.

---

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| `probe:native-pdf-inspector` exit 2 | Missing PDFium/ONNX or model cache |
| DLL load error on clean VM | `asarUnpack` / `resourcesPath` misconfigured |
| WASM works, native fails | Expected until operator runtime fetch — document as partial |
| Tesseract slow/hang | Worker path — see `tesseract-worker-path.test.ts` |
