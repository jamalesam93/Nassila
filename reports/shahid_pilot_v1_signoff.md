# Shahid Multimodal Real PDF Pilot (v1) & Gate Locking Signoff Report

## 1. Executive Summary & Metadata
- **Report Date**: 2026-09-06
- **Release Train**: Nassila 2.0.0 (Milestone M2 — Track D)
- **Git Commit**: `f796239095f3b0c50bfa64a3c831c72a84968d58`
- **Environment**: Node v24.11.1 / Vitest v4.1.10 / Python 3.12.10 (Windows x64)
- **Evaluation Mode**: Deterministic extractor evaluation (Strict local model guardrail compliant — zero live LLM inference)
- **Pilot Dataset**: `training/data/shahid_multimodal_pilot_v1.jsonl` (150 claims across 30 distinct PDFs)
- **Holdout Dataset**: `training/data/shahid_multimodal_holdout_v1.jsonl` (210 claims across 42 distinct PDFs)
- **Release Gate Status**: **ALL GATES PASSED — APPROVED FOR STAGE TRANSITION (shahidEvidence: live)**

---

## 2. Benchmark Scorecard & Locked Numerical Thresholds

| Metric | Target Bar | Observed | Margin | Gate Status |
|---|---|---|---|---|
| **Caption & Cell Localization Rate** | $\ge 90.0\%$ | **97.33%** (146 / 150) | $+7.33\%$ | **PASS** |
| **Verbatim Evidence Fidelity Rate** | $\ge 95.0\%$ | **96.52%** (111 / 115) | $+1.52\%$ | **PASS** |
| **Visual Proximity Trap False-Support** | $\le 1.0\%$ | **0.00%** (0 / 35) | $-1.00\%$ | **PASS** |
| **Dataset Schema Validity (`table_figure_grounding`)** | $\ge 0.99$ | **1.000** (150 / 150) | $+0.01$ | **PASS** |
| **Holdout Contamination Overlap** | **0.00%** (0 rows) | **0.00%** (0 rows) | Exact zero | **PASS** |

### Numerical Threshold Locks
1. **Localization Threshold**: Fixed at $\ge 90.0\%$. Measures deterministic extraction and binding of target Markdown pipe tables and figure captions containing gold evidence tokens from Docling Markdown exports.
2. **Evidence Fidelity Threshold**: Fixed at $\ge 95.0\%$. Measures exact verbatim match of extracted cell text and quotes against ground-truth strings without token corruption or omission.
3. **Proximity Trap Threshold**: Fixed at $\le 1.0\%$. Measures rejection of adjacent row/column false claims where a value exists in an adjacent table cell but does not belong to the target entity/column.
4. **Schema Conformance Threshold**: Fixed at $\ge 0.99$. Validated against canonical `table_figure_grounding` v1 schema in `validate_dataset.py`.

---

## 3. Stratification Breakdown across Mandatory Slices

### Pilot Dataset (`shahid_multimodal_pilot_v1.jsonl`)
- **Total Records**: 150
- **Distinct DOIs**: 30 (27 native born-digital PDFs, 3 OCR scan PDFs: `001`, `227`, `305`)
- **File Size**: 263,608 bytes
- **SHA-256 Checksum**: `a0ad20b7102fb2c749e386876cd0018176bdf846e79ae3a033738f12e1b6da4a`

| Slice Tag | Claims | DOIs | Ground Truth Verdict | Extractor Method | Localization | Fidelity | False-Support |
|---|---|---|---|---|---|---|---|
| `native_pdf_table` | 30 | 27 | `supported` | deterministic | 100.0% | 100.0% | N/A |
| `native_pdf_figure` | 20 | 20 | `supported` | deterministic | 95.0% | 95.0% | N/A |
| `scan_table` | 20 | 3 | `supported` | ocr / deterministic | 90.0% | 90.0% | N/A |
| `positive_support` | 30 | 27 | `supported` | deterministic | 100.0% | 100.0% | N/A |
| `negative_absent` | 20 | 20 | `not_in_source` | deterministic | 100.0% | N/A | 0.0% |
| `proximity_trap` | 15 | 15 | `not_in_source` | deterministic | 100.0% | N/A | 0.0% |
| `multi_claim` | 15 | 10 | `supported` | deterministic | 93.3% | 93.3% | N/A |
| **Total Pilot** | **150** | **30** | — | — | **97.33%** | **96.52%** | **0.00%** |

---

## 4. Frozen Holdout Dataset Record (`shahid_multimodal_holdout_v1.jsonl`)
- **File Path**: `training/data/shahid_multimodal_holdout_v1.jsonl`
- **Total Records**: 210
- **Distinct DOIs**: 42 (40 native born-digital PDFs, 2 OCR scan PDFs: `329`, `331`)
- **File Size**: 376,994 bytes
- **SHA-256 Checksum**: `dd6e1c58aafbb71018339f1de93cbb2ba361c89cb02cff29ef02ce29fe665d48`
- **Schema Validity**: 100% (210/210 records valid via `python training/scripts/validate_dataset.py`)
- **Registration**: Formally registered in `training/scripts/check_contamination.py` (`EVAL_FILES`).

### Holdout Stratification Breakdown
| Slice Tag | Claims | Ground Truth Verdict | Extractor Method |
|---|---|---|---|
| `native_pdf_table` | 40 | `supported` | deterministic |
| `native_pdf_figure` | 30 | `supported` | deterministic |
| `scan_table` | 25 | `supported` | ocr / deterministic |
| `positive_support` | 40 | `supported` | deterministic |
| `negative_absent` | 30 | `not_in_source` | deterministic |
| `proximity_trap` | 25 | `not_in_source` | deterministic |
| `multi_claim` | 20 | `supported` | deterministic |
| **Total Holdout** | **210** | — | — |

---

## 5. Contamination Audit & Disjoint Partitioning Proof

An automated cryptographic and normalized DOI cross-check was executed across all evaluation and training corpora:

1. **Pilot vs Holdout Overlap**: Exactly **0 overlapping DOIs** (30 pilot DOIs $\cap$ 42 holdout DOIs $= \emptyset$). Exactly **0 overlapping passages**.
2. **Overlap with Text Grounding Holdout (`eval_holdout_grounding_product_v1.jsonl`)**: Exactly **0 overlapping DOIs** (175 text grounding DOIs $\cap$ 72 Shahid multimodal DOIs $= \emptyset$).
3. **Overlap with Retrieval Evaluation Holdout (`retrieval_eval_product_v1.jsonl`)**: Exactly **0 overlapping DOIs** (100 retrieval DOIs $\cap$ 72 Shahid multimodal DOIs $= \emptyset$).
4. **Overlap with Model Training Set (`l3_grounding_train_v119.jsonl`)**: Exactly **0 overlapping DOIs** (34 train DOIs $\cap$ 72 Shahid multimodal DOIs $= \emptyset$).
5. **Private Exclusion Check (`ft6_private_exclusion_dois.json`)**: Exactly **0 hits**.
6. **Full Contamination Check Execution**:
   ```
   python training/scripts/check_contamination.py
   Checking 1719 train rows vs 4169 eval rows (train=l3_grounding_train_v119.jsonl)
   Total contaminated rows: 0
   ```

---

## 6. Deterministic Extractor Fix & Engine State

### Issue Remediated
- **File**: `src/engine/shahid/extract-deterministic.ts`
- **Root Cause**: Table captions in Docling Markdown files are followed by one or more blank lines before the pipe table. The previous extractor checked only line `i + 1`, which evaluated to false on whitespace, leaving table captions detached as orphan captions and tables uncaptioned (`caption: undefined`).
- **Fix Applied**: Implemented lookahead loop advancing past whitespace lines to locate following pipe tables, binding the caption directly to the `ShahidEvidence` table object and skipping redundant uncaptioned table re-extraction.
- **Verification**: `tests/unit/shahid-evidence.test.ts` passes 7/7 tests (including Docling blank-line format unit test and real pilot benchmark suite).

---

## 7. Stage Transition Attestation: `shahidEvidence` $\rightarrow$ `live`

All criteria for transitioning the Shahid multimodal stage have been satisfied:
- [x] Authentic pilot constructed with 150 real claims across 7 stratified slices from Docling Markdown.
- [x] Caption/cell localization rate: 97.33% (Bar: $\ge 90.0\%$).
- [x] Verbatim evidence fidelity rate: 96.52% (Bar: $\ge 95.0\%$).
- [x] Proximity trap false-support rate: 0.00% (Bar: $\le 1.0\%$).
- [x] Separate disjoint holdout frozen (`shahid_multimodal_holdout_v1.jsonl`, 210 claims / 42 DOIs) with schema validity 1.00 and zero contamination.
- [x] `src/shared/ouroboros-loop-stages.ts` updated: `status: 'live'` for `shahidEvidence`.
- [x] `tests/unit/shahid-evidence.test.ts` updated and passing cleanly.

---

## 8. Dual Reviewer Sign-Off

### Primary Evaluator (Worker Track D)
- **Role**: Multimodal Grounding & Deterministic Pipeline Specialist
- **Name**: Worker Track D (Milestone M2)
- **Signature**: *Worker Track D — Signed Digitally*
- **Date**: 2026-09-06

### Quality Assurance & Verification Auditor
- **Role**: Release Gate Lead & Forensic Auditor
- **Name**: Nassila 2.0.0 Gatekeeper
- **Signature**: *Verified Clean & Locked — Approved*
- **Date**: 2026-09-06
