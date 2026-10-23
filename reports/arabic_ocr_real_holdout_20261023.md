# Arabic OCR — large-scale evaluation on the AR-Books corpus

**Date:** 2026-10-23 · **Corpus:** `E:\AR-Books-to-OCR` (21 PDFs, 336 MB) · **Run:** 231 pages (105 gold, 126 scan); 103 gold pages scored after blank/short-page filters · plus 30 degradation images · 200 dpi · harness in workspace `ocr-ab/`

Supersedes the earlier 24- and 49-page runs. Both engines read the **same raster images**. Gold = the page's own PDF text layer; scan pages have none.

## Headline

**Indra is the better recognizer on normal Arabic pages, and the gap is large:** on 84 reference-valid pages it wins on **78**, with median CER **0.067 vs 0.156**, mean **0.136 vs 0.212**, 6-gram recall **0.879 vs 0.729**, precision **0.883 vs 0.770**, and **8× the speed** (306 ms vs 2,460 ms median). Its rotation handling is a capability Paddle simply lacks.

**Paddle wins on designed dark pages and is not redundant.** Of its 6 valid-page wins, three are dark/designed pages (`ink` 0.48–0.78) — including the one case where Indra collapses outright (CER 0.703 vs 0.020) — and three are statistical ties (CER gap ≤ 0.07; two within 0.01). It remains the better fallback for inverted text.

**And the per-line ordering fix remains the cheapest win:** Paddle's shipped whole-string reversal scores mean CER **0.811**; the per-line transform scores **0.286** on the same pages.

## Results — 103 gold pages

| metric | Paddle (all) | Indra (all) | Paddle (valid, 84) | Indra (valid, 84) |
|---|---|---|---|---|
| CER mean | 0.286 | 0.241 | 0.212 | **0.136** |
| CER median | 0.213 | 0.120 | 0.156 | **0.067** |
| CER p90 | 0.478 | 0.422 | 0.462 | **0.356** |
| 6-gram recall | 0.652 | 0.779 | 0.729 | **0.879** |
| 6-gram precision | 0.669 | 0.759 | 0.770 | **0.883** |
| keyword recall | 0.554 | 0.671 | 0.619 | **0.754** |
| ms/page median | 2,403 | **303** | 2,460 | **306** |
| pages with lower CER | 9/103 | **94/103** | 6/84 | **78/84** |

CER distribution (valid) — Paddle: `<0.05` 11, `0.05–0.15` 29, `0.15–0.30` 22, `≥0.30` 22. Indra: 32 / 23 / 18 / 11.

Per book:

| book | pages | Paddle CER (mean/med) | Indra CER (mean/med) | Paddle 6-gram | Indra 6-gram |
|---|---|---|---|---|---|
| كشف وإحباط إساءة استخدام الذكاء الاصطناعي | 18 | 0.189 / 0.121 | 0.108 / 0.031 | 0.785 | 0.930 |
| تقرير المخا الاستراتيجي 2024 | 40 | 0.205 / 0.177 | 0.139 / 0.101 | 0.701 | 0.845 |
| حقائق التمويلات الدولية لليمن | 31 | 0.406 / 0.274 | 0.394 / 0.120 | 0.757 | 0.905 |
| من الزيدية إلى الحوثية ⚠️ | 14 | 0.375 / 0.378 | 0.362 / 0.368 | 0.107 | 0.116 |

## Two reference failures the corpus exposed

**1. A text layer can be wrong without being incomplete.** *من الزيدية إلى الحوثية* stores Arabic in a **legacy non-Unicode encoding**: the layer decodes to mojibake (`u01uمقدمهبػعؾاختقار...`) while the rendered page is clean Arabic that Indra reads correctly (`مقدمه بفعل الاختيار العقدي والمعرفه العلميه...`). Both engines "fail" against it, so it is excluded from the valid view.

Critically, **pdf-inspector does not flag it**: `hasEncodingIssues = false`, `cmapGaps = []`, because every code *has* a mapping — it is simply the wrong mapping. Nassila's cmap-gap routing would trust this layer. Catching it needs an Arabic plausibility check (common-word/letter-frequency score, or a whitelist of expected Arabic ranges), not encoding metadata.

**2. Figure pages punish an engine for reading them.** Pages whose raster contains screenshot tables (e.g. حقائق p89: gold 1,079 chars, Indra 2,136) have no corresponding layer text; CER counts the correctly-read table as insertion errors. Five such pages are excluded from CER; 6-gram recall captures what is comparable.

## Failure taxonomy (valid pages)

- **Indra's real loss: dark backgrounds.** p100 (المخا, ink 0.779, navy callout): Paddle 0.020, Indra 0.703. A second dark page (p180, ink 0.732) is a near-tie won by Paddle. Three further Paddle wins are ties (CER within 0.01) and one is mid-dark (ink 0.479).
- **Paddle's losses: spread out.** 15 pages with CER gap > 0.15, across all three books, at ordinary ink levels — normal body pages, not an exotic layout.
- **Neither engine handles light-on-dark reliably;** Paddle does, Indra does not.

## Robustness (6 gold pages × 5 degradations, earlier suite)

| degradation | Paddle CER | Indra CER | Paddle chars kept | Indra chars kept |
|---|---|---|---|---|
| rotate 90° | 1.000 | 0.173 | 0.00 | 0.84 |
| rotate 180° | 0.945 | 0.173 | 0.06 | 0.84 |
| rotate 270° | 1.000 | 0.173 | 0.00 | 0.84 |
| 120 dpi equivalent | 0.033 | 0.146 | 0.99 | 0.92 |
| JPEG q35 | 0.032 | 0.071 | 0.99 | 0.97 |

Indra's numbers include the dark page; **excluding it, Indra scores 0.007 on every one of these variants**, versus Paddle 1.000/0.945/1.000 on rotations and 0.034 on low-res/JPEG at that subset's upright baseline. Paddle does not rotate at all; Indra does.

## Scan pages — 120 pages across 13 image-only books

- Cross-engine agreement CER median **0.053**, p90 **0.586**.
- Indra produces **24 % more characters on average**; ≥15 % more on **28/120** pages.
- Where both read cleanly they are near-identical (ألموت: agreement 0.010, char ratio 0.999).
- Where Paddle collapses, Indra recovers content: `mktbtypdf` ratio 2.9, *غرائب القرآن 3* 1.49, *فهرنهايت 451* 1.19.
- English control (*History of the Arabs*): both Arabic-only recognizers fail, as expected.

## Caveats

- Pseudo-gold is the PDF text layer; three of the four scored books mix body text, designed callouts, screenshot tables and figures. The valid view (84 pages) is the fair comparison; the all-pages view is reported for transparency.
- 40 pages come from one report (المخا), which is design-heavy; book-weighted averages would shift toward it.
- Indra ran on Windows from PyPI (`indra-ocr 1.1.2`), outside upstream's tested platforms (Linux/macOS), including its orientation model.
- Timing is single-process on this machine; Paddle's `ppu-paddle-ocr` uses one ORT session, Indra ran with 4 threads.

## Recommendation

1. **Ship the per-line fix** (done) — largest single Paddle gain, no new dependency.
2. **If Arabic recognition is upgraded, route by page, not by engine:** Indra for normal pages, Paddle for high-ink / light-on-dark pages. A cheap `ink` threshold on the raster (≈0.45–0.5) separates every dark-page case in this corpus.
3. **Add an Arabic plausibility guard** to text-layer routing — `cmapGaps` catches unmapped codes but **not** mis-mapped legacy encodings like *من الزيدية*.
4. **Do not bundle Indra weights yet.** Distribution obligations are §4(a) (flow use restrictions into the EULA, ship the license) and §8 (share-a-like extends to *Output*); the app's own license does not address them. Evaluation use is unaffected.
5. Next: port `det.onnx` + `rec_rtl.onnx` to `onnxruntime-node` behind `ArabicRecognizerAdapter` with the ink-based router, then rerun this harness.

## How pdf-inspector handles Arabic text (1.17.0 → 1.25.2)

pdf-inspector never OCRs in the text path — it decodes the PDF text layer. On these books the upgrade is a **major Arabic fix**, not a Latin-only improvement. Same pages, both versions, compared with Indra OCR of the rendered page (6-gram F1; recall = how much of the page's OCR content the layer contains, precision = how much of the layer the OCR confirms):

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

That is precisely the "Arabic text from this PDF looks character-reversed (broken font encoding)" condition Nassila's `pdf-extract.ts` warns about and defers to DOCX for. The 1.23–1.25 RTL fixes (visual-order storage, line-by-line bidi, ligature reversal, dependent marks) remove the root cause on the native path; the warning regex is now only meaningful as a pdf.js-tier backstop.

### Limits found

- **A wrong encoding is not an order bug.** *من الزيدية* maps every code to the wrong legacy character; 1.25 cannot fix it (F1 0.12). `cmapGaps = 0` and `hasEncodingIssues = false` there, so the new routing signal does **not** catch it. Rare-Arabic-letter count does: 1,090 in that book vs 0 in the others.
- **`hasEncodingIssues` is not a safe trigger on its own**: it is `true` for *تقرير المخا*, whose 1.25 layer is good (F1 0.84).
- Arabic presentation forms are fully normalized to base letters in all sampled books (count 0).
- API trap for maintainers: `extractPagesMarkdown*` takes **0-indexed** pages, while `processPdf*`/`processPdfWithOcr` page arguments are **1-indexed**. Mixing them silently compares different pages (it produced a false F1 of 0.08 during this analysis).

### What this means for Maktab

1. Born-digital Arabic PDFs should now stay on the text layer: 1.25 output agrees with good OCR at 0.84–0.92 F1 for free, with no raster/OCR cost.
2. The Arabic DOCX deferral can be narrowed to genuine failures (mojibake / missing layer), not to native-path reversal.
3. Add an Arabic plausibility check (rare-letter share, common-word share) so mis-mapped layers are flagged before they reach citation parsing.
