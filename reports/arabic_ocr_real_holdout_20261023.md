# Arabic OCR — large-scale evaluation on the AR-Books corpus

**Date:** 2026-10-23 · **Corpus:** `E:\AR-Books-to-OCR` (21 PDFs, 336 MB) · **Run:** 231 pages (105 gold, 126 scan); 103 gold pages scored after blank/short-page filters · plus 30 degradation images · 200 dpi · raw harness: `E:\Antigravity Projects\NassilaAGY\ocr-ab` (`eval-report-big.md`, `pdf-inspector-arabic.md`, `ab-report.md`)

Supersedes the earlier 24- and 49-page runs. Both engines read the **same raster images**. Gold = the page's own PDF text layer; scan pages have none. Paddle output is scored through Nassila's shipped postprocess (per-line, mixed-script branch); Indra is scored raw.

## Headline

**Indra is the better recognizer on typical Arabic pages:** on 84 reference-valid pages it wins on **74**, with median CER **0.067 vs 0.120**, mean **0.136 vs 0.170**, 6-gram recall **0.879 vs 0.799**, precision **0.883 vs 0.833**, and **8× the speed** (306 ms vs 2,460 ms median). Its rotation handling is a capability Paddle lacks.

**But Indra has the heavier tail,** and Paddle is not redundant: Indra's p90 CER (0.356) is *worse* than Paddle's (0.344) because a handful of pages fail catastrophically — mostly designed dark callouts and figure-heavy pages. Of Paddle's 10 valid-page wins, one is a dark-page collapse (Indra CER 0.703 vs 0.020), two are modest dark/mid-dark edges, and seven are ties (CER gap ≤ 0.04).

**The per-line ordering fix remains the cheapest win:** Paddle's shipped whole-string reversal scores mean CER **0.811**; the per-line transform scores **0.251** on the same pages.

## Results — 103 gold pages

| metric | Paddle (all) | Indra (all) | Paddle (valid, 84) | Indra (valid, 84) |
|---|---|---|---|---|
| CER mean | 0.251 | 0.241 | 0.170 | **0.136** |
| CER median | 0.169 | 0.120 | 0.120 | **0.067** |
| CER p90 | 0.430 | 0.422 | **0.344** | 0.356 |
| 6-gram recall | 0.709 | 0.779 | 0.799 | **0.879** |
| 6-gram precision | 0.720 | 0.759 | 0.833 | **0.883** |
| keyword recall | 0.618 | 0.671 | 0.698 | **0.754** |
| ms/page median | 2,403 | **303** | 2,460 | **306** |
| pages with lower CER | 13/103 | **90/103** | 10/84 | **74/84** |

CER distribution (valid) — Paddle: `<0.05` 14, `0.05–0.15` 35, `0.15–0.30` 21, `≥0.30` 14. Indra: 32 / 23 / 18 / 11.

Per book:

| book | pages | Paddle CER (mean/med) | Indra CER (mean/med) | Paddle 6-gram | Indra 6-gram |
|---|---|---|---|---|---|
| كشف وإحباط إساءة استخدام الذكاء الاصطناعي | 18 | 0.147 / 0.092 | **0.108 / 0.031** | 0.852 | 0.930 |
| تقرير المخا الاستراتيجي 2024 | 40 | 0.169 / 0.141 | **0.139 / 0.101** | 0.763 | 0.845 |
| حقائق التمويلات الدولية لليمن | 31 | **0.363 / 0.240** | 0.394 / **0.120** | 0.828 | 0.905 |
| من الزيدية إلى الحوثية ⚠️ | 14 | 0.375 / 0.378 | 0.362 / 0.368 | 0.107 | 0.116 |

On *حقائق*, Paddle has the better mean but Indra the better median: Paddle is uniform-but-mediocre there, Indra is often excellent and occasionally fails. That is the whole story of this evaluation in one table row.

## Two reference failures the corpus exposed

**1. A text layer can be wrong without being incomplete.** *من الزيدية إلى الحوثية* stores Arabic in a **legacy non-Unicode encoding**: the layer decodes to mojibake (`u01uمقدمهبػعؾاختقار...`) while the rendered page is clean Arabic that Indra reads correctly. Both engines "fail" against it, so it is excluded from the valid view.

Critically, **pdf-inspector does not flag it**: `hasEncodingIssues = false`, `cmapGaps = []`, because every code *has* a mapping — it is simply the wrong mapping. Nassila's cmap-gap routing would trust this layer. Catching it needs an Arabic plausibility check, not encoding metadata.

**2. Figure pages punish an engine for reading them.** Pages whose raster contains screenshot tables (e.g. حقائق p89: gold 1,079 chars, Indra 2,136) have no corresponding layer text; CER counts the correctly-read table as insertion errors. Five such pages are excluded from CER; 6-gram recall captures what is comparable.

## Failure taxonomy (valid pages)

- **Indra's real loss: dark backgrounds.** p100 (المخا, ink 0.779, navy callout): Paddle 0.020, Indra 0.703. A second dark page (p180, ink 0.732) is a near-tie won by Paddle, and one mid-dark page (ink 0.479) is a modest Paddle win.
- **Paddle's losses: spread out.** 5 pages with CER gap > 0.15 plus many smaller gaps, at ordinary ink levels — normal body pages, not an exotic layout.
- **Neither engine handles light-on-dark reliably;** Paddle does, Indra does not.

## Robustness (6 gold pages × 5 degradations)

| degradation | Paddle CER | Indra CER | Paddle chars kept | Indra chars kept |
|---|---|---|---|---|
| rotate 90° | 1.000 | 0.173 | 0.00 | 0.84 |
| rotate 180° | 0.945 | 0.173 | 0.06 | 0.84 |
| rotate 270° | 1.000 | 0.173 | 0.00 | 0.84 |
| 120 dpi equivalent | 0.033 | 0.146 | 0.99 | 0.92 |
| JPEG q35 | 0.032 | 0.071 | 0.99 | 0.97 |

Indra's numbers include the dark page; **excluding it, Indra scores 0.007 on every one of these variants**, versus Paddle 1.000/0.945/1.000 on rotations and 0.034 on low-res/JPEG at that subset's upright baseline. Paddle does not rotate at all; Indra does.

## Scan pages — 120 pages across 13 image-only books

- Cross-engine agreement CER median **0.044**, p90 **0.515**.
- Indra produces **24 % more characters on average**; ≥15 % more on **28/120** pages.
- Where both read cleanly they are near-identical (ألموت: agreement 0.009, char ratio 0.999).
- Where Paddle collapses, Indra recovers content: `mktbtypdf` ratio 2.9, *غرائب القرآن 3* 1.49, *فهرنهايت 451* 1.19.
- English control (*History of the Arabs*): both Arabic-only recognizers fail, as expected.

## External corpora (third-party, not from the local books)

Fetched from Hugging Face (archive.org and Wikimedia are DNS-blocked in this environment):

| group | source | pages | Paddle CER (mean/med) | Indra CER (mean/med) | Paddle F1 | Indra F1 |
|---|---|---|---|---|---|---|
| typeset OCR samples | `ahmedheakl/arocrbench_arabicocr` | 50 | 0.120 / 0.002 | **0.001 / 0.000** | 0.848 | **0.994** |
| historical handwriting | `sherif1313/Historical-Arabic-Handwritten-OCR` | 12 | **0.830 / 0.830** | 0.901 / 0.996 | 0.027 | 0.012 |
| one-page Arabic PDFs | `HumynLabs/Arabic_Documents_Dataset_PDF` | 4 | — | — | 0.54 avg | 0.60 avg |

- **Typeset samples:** Indra is essentially perfect; Paddle's mean is dragged by a handful of bad samples (median 0.002).
- **Historical handwriting:** *both fail.* Indra returns empty on 4/12 pages and ≤66 chars on 11/12 — it fails closed. Paddle always emits something, but it is noise (F1 0.027). For manuscripts neither engine is usable; the pipeline must flag them, and Indra's empty output is the safer failure.
- **Modern Arabic PDFs:** OCR agrees with the embedded 152-char header layer at F1 0.45–0.73 for both. Indra is marginally better on average (0.60 vs 0.54) and notably better on the one page whose layer is a mixed Arabic/Latin title.

## Caveats

- Pseudo-gold is the PDF text layer; three of the four scored books mix body text, designed callouts, screenshot tables and figures. The valid view (84 pages) is the fair comparison; the all-pages view is reported for transparency.
- 40 pages come from one report (المخا), which is design-heavy.
- The external benchmark's text is clean/synthetic typeset (`source=arabicocr`), so Indra's near-zero CER there says more about domain match than about real-world superiority.
- Historical transcripts are themselves noisy transcriptions, so those CERs are rough.
- Indra ran on Windows from PyPI (`indra-ocr 1.1.2`), outside upstream's tested platforms (Linux/macOS).
- Timing is single-process; Paddle's `ppu-paddle-ocr` uses one ORT session, Indra ran with 4 threads.

## Recommendation

1. **Ship the per-line fix** (done) — largest single Paddle gain, no new dependency.
2. **If Arabic recognition is upgraded, route by page, not by engine:** Indra for normal pages, Paddle for high-ink / light-on-dark pages, and *neither* for handwriting (flag it). A cheap `ink` threshold on the raster (≈0.45–0.5) separates every dark-page case in this corpus.
3. **Add an Arabic plausibility guard** to text-layer routing — `cmapGaps` catches unmapped codes but **not** mis-mapped legacy encodings.
4. **Do not bundle Indra weights yet.** Distribution obligations are §4(a) (flow use restrictions into the EULA, ship the license) and §8 (share-a-like extends to *Output*); the app's own license does not address them. Evaluation use is unaffected.
5. Next: port `det.onnx` + `rec_rtl.onnx` to `onnxruntime-node` behind `ArabicRecognizerAdapter` with the ink-based router, then rerun this harness (the run scripts live in the workspace `ocr-ab/`).

## How pdf-inspector handles Arabic text (1.17.0 → 1.25.2)

pdf-inspector never OCRs in the text path — it decodes the PDF text layer. On these books the upgrade is a **major Arabic fix**, not a Latin-only improvement (6-gram F1 vs OCR of the rendered page):

| book | pages | F1 1.17 → 1.25 | recall / precision (1.25) | old→new CER |
|---|---|---|---|---|
| كشف وإحباط إساءة استخدام الذكاء الاصطناعي | 19 | **0.342 → 0.915** | 0.916 / 0.915 | 0.613 |
| تقرير المخا الاستراتيجي 2024 | 40 | 0.705 → **0.838** | 0.841 / 0.836 | 0.173 |
| حقائق التمويلات الدولية لليمن | 32 | 0.606 → **0.848** | 0.808 / 0.892 | 0.377 |
| من الزيدية إلى الحوثية | 14 | 0.048 → 0.116 | 0.122 / 0.111 | 0.619 |

The first book makes the cause obvious — 1.17 output is **character-reversed per word**:

```
1.17: ةعومجملا تمدختساGTG-20006 نم تفلأت ةصصخم ةيجمرب ةناسرت ...
1.25: استخدمت المجموعة GTG-20006 ترسانة برمجية مخصصة تألفت من ...
```

That is precisely the "Arabic text from this PDF looks character-reversed (broken font encoding)" condition Nassila's `pdf-extract.ts` warns about and defers to DOCX for. The 1.23–1.25 RTL fixes remove the root cause on the native path; the warning regex is now only meaningful as a pdf.js-tier backstop.

### Limits found

- **A wrong encoding is not an order bug.** *من الزيدية* maps every code to the wrong legacy character; 1.25 cannot fix it (F1 0.12). `cmapGaps = 0` and `hasEncodingIssues = false` there, so the new routing signal does **not** catch it. Rare-Arabic-letter count does: 1,090 in that book vs 0 in the others.
- **`hasEncodingIssues` is not a safe trigger on its own**: it is `true` for *تقرير المخا*, whose 1.25 layer is good (F1 0.84).
- Arabic presentation forms are fully normalized to base letters in all sampled books (count 0).
- API trap for maintainers: `extractPagesMarkdown*` takes **0-indexed** pages, while `processPdf*`/`processPdfWithOcr` page arguments are **1-indexed**. Mixing them silently compares different pages.

### What this means for Maktab

1. Born-digital Arabic PDFs should now stay on the text layer: 1.25 output agrees with good OCR at 0.84–0.92 F1 for free, with no raster/OCR cost.
2. The Arabic DOCX deferral can be narrowed to genuine failures (mojibake / missing layer), not to native-path reversal.
3. Add an Arabic plausibility check (rare-letter share, common-word share) so mis-mapped layers are flagged before they reach citation parsing.
