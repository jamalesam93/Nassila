# Ouroboros context brief

> **For agents.** Single entry point for Nassila + NassilaT. Last updated: 2026-06-21.
> **Ship checkpoints:** `nassila-sanad-e4b` **v1.12** (default-tier) · `nassila-sanad-12b` **v1.14** (Tier 2). **v1.13 NO-GO.** **Laptop smoke PASS** (RTX 4060 8 GB, 2026-06-21). Operator map: NassilaT [`training/POST_V114_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/POST_V114_MAP.md). Sign-off: [`outputs/LAPTOP_SMOKE_SIGNOFF.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/outputs/LAPTOP_SMOKE_SIGNOFF.md).
> Training pack: [`TRAINING.md`](./TRAINING.md) → NassilaT repo. Do not read every historical walkthrough — use this brief, then drill into linked paths only.

## 1. Mission

**Nassila** — Windows-first Electron app for bibliography quality (offline validate, format, dedup, registry verify, predatory flags).

**Ouroboros** — one local GGUF identity in LM Studio over time; **seven workers** are **loop stages** and product modules, each forged one trainable facet at a time, then merged. **v1 trains worker 1 only: Sanad** (Tier 2 manual bridge in app; full loop requires Maktab/Masdar at Tier 3).

**Rule:** Workers assist where LLM helps; **deterministic core** (APIs, citeproc, lists, parsers) stays authoritative and **lives inside worker boundaries** — never LLM-replaced.

**Ouroboros, not Hydra:** Do not ship or plan UI where the user visits seven disconnected worker tabs and manually wires manuscript text between them. One manuscript audit loop is the product; worker names are vocabulary and code boundaries.

| Repo | Role | GitHub |
|------|------|--------|
| **Nassila** | App, engine, guardrails, eval hooks | `jamalesam93/Nassila` |
| **NassilaT** | QLoRA train, corpus, eval, reports | `jamalesam93/NassilaT` |

## 2. Workers = loop stages (two layers each)

Each worker is a **stage in the Ouroboros loop** and a **code module**, not only a GPU-trained facet. When Ouroboros is complete, the UI centers on **one manuscript audit journey** (upload → sources → audit → explain → export). The seven-item worker nav from the first UI slice is **transitional scaffolding** — not the end-state IA. See [`PRODUCT.md`](./PRODUCT.md).

| Layer | Role | Examples |
|-------|------|----------|
| **Deterministic core** | Authoritative; APIs and schemas decide | L1/L2 registry verify, citeproc, predatory lists, dedup, import parsers, JSON repair, quote substring checks |
| **LLM facet** | Bounded JSON task; train/eval on NassilaT | `l3_grounding`, `doc_extract`, `webpage_metadata`, … |

Do **not** read “no LLM facet yet” as “not part of Ouroboros.” Registry verify and citeproc are **Raqim/Tasnif module cores**, not a separate product outside the seven workers.

**Agent warning:** Future UI work must **not** recreate seven disconnected mini-apps (Hydra). Sanad must ultimately consume **Maktab** + **Masdar** outputs automatically; manual passage/excerpt paste remains a Tier 2 fallback and model test panel only.

**Today (v1 scaffold):** deterministic cores live under `src/engine/`; Sanad manual paste is live; Maktab/Masdar are stubs. **Target:** same logic, loop-first UI per [`DESIGN.md`](./DESIGN.md).

```
Ingest (Maktab) → Sources (Masdar) → Ground (Sanad) → Evidence (Shahid)
     ↘ References (Raqim + Tasnif) → Explain (Sharh) → Export (citeproc, engine)
```

**Train/eval scope** remains narrower than the full module: bounded LLM tasks with JSONL + eval gates per `task` id.

## 3. Seven workers (complete registry)

Codenames: `docs/BRAND.md`, `src/shared/nassila-agent-tasks.ts`. Forge **one LLM facet at a time**; merge into `nassila-agent-*` when ready.

| # | Worker | Arabic | `task` id | Future module (user-facing) | Deterministic core (no LLM replacement) | LLM facet | Phase | Status |
|---|--------|--------|-----------|----------------------------|----------------------------------------|-----------|-------|--------|
| 1 | **Sanad** | سند | `l3_grounding` | Ground claims to sources | JSON repair, quote substring checks, caps | Passage vs excerpt → grounding JSON | 1 | **E4B default-tier PASS** (v1.12 ship); **Tier 2 PASS** (12B v1.10 optional) |
| 2 | **Maktab** | مكتب | `doc_extract` | Bring in the manuscript | File I/O, DOCX/PDF routing, plain-text ingest | Structured text/chunks from PDF/DOCX | 2 | Planned |
| 3 | **Masdar** | مصدر | `source_pdf_extract` | Get source text for citations | OA fetch, chunking, secure desktop I/O | Cited OA PDF → text for Sanad | 2 | Planned |
| 4 | **Shahid** | شاهد | `table_figure_grounding` | Tables & figures as evidence | Region detection (future) | Claims vs table/figure regions | 3+ | Planned (12B) |
| 5 | **Raqim** | رقيم | `webpage_metadata` | Build & fix reference **records** | **L1/L2 verify**, import parsers (BibTeX/RIS/Zotero), metadata merge, **citeproc export** | Webpage → CSL field suggestions | 2+ | Planned |
| 6 | **Tasnif** | تصنيف | `webpage_classify` | Sort, type, dedupe, flag risk | **Predatory lists**, **dedup**, reference-type rules | Grey-web / platform typing | 2+ | Planned |
| 7 | **Sharh** | شرح | `issue_explain` | Explain what went wrong | Mismatch messages, i18n, guardrail copy | Fetch/verify/paywall explanations | 2+ | Planned |

**Suggested forge order:** Sanad → Maktab/Masdar → Raqim/Tasnif/Sharh → Shahid.

**Tier ↔ worker dependency (Sanad ship):**

| Milestone | Unlocks |
|-----------|---------|
| **Tier 2** (abstract Sanad ship, §10 model gates) | Ouroboros loop UI shipped; **start worker 2 Maktab** + **worker 3 Masdar** corpus/train planning |
| **Tier 3** (product Sanad ship) | Requires **Maktab** ingest + **Masdar** body-text in app loop + full-text eval slice; not abstract-only claims. **Maktab/Masdar are required for the real manuscript/PDF audit product**, not optional polish. |

Tier 2 completes Sanad on the abstract harness. Tier 3 needs Masdar even though Masdar is worker 3 — forge planning for Maktab/Masdar begins after Tier 2, not after Tier 3.

**Pillar ↔ worker map** (seven pillars: scraping, analyzing, thinking, structuring, drafting, aligning, refining):

| Pillar | Primary workers | Notes |
|--------|-----------------|-------|
| Scraping | Maktab, Masdar, Raqim | Ingest + sources + webpage capture |
| Analyzing | Sanad, Tasnif, Shahid | Compare, classify, multimodal evidence |
| Thinking | Sanad, Shahid | Bounded verdict reasoning per task |
| Structuring | Raqim | CSL records + citeproc export (deterministic) |
| Drafting | — | Out of scope for Sanad v1; optional cloud later |
| Aligning | Sanad, Sharh, Tasnif | Schema, repair, explain mismatches, risk flags |
| Refining | Sharh, Raqim | User-facing polish, formatted bibliography output |

Full vision: [`OUROBOROS.md`](./OUROBOROS.md). Web path: [`WEBPAGE_ROADMAP.md`](./WEBPAGE_ROADMAP.md).

## 4. Architecture snapshot (Sanad path)

**Active code (Nassila):**

- `src/renderer/components/loop/OuroborosLoopWorkspace.tsx` — **shipping** Manuscript loop UI (upload → audit → per-cite detail)
- `src/renderer/components/workers/WorkerShell.tsx` — mounts loop (`appSurface === 'loop'`) or bibliography (`RaqimWorkspace`)
- `src/engine/manuscript/grounding-llm.ts` — prompt + schema
- `src/engine/manuscript/grounding-json-repair.ts` — repair layer
- `src/shared/nassila-agent-tasks.ts` — task ids + worker codenames
- `src/renderer/settings/llm-presets.ts` — LM Studio preset

Production manuscript UX is the Ouroboros loop above.

## 5. Training arc (Sanad / E4B)

### Tiered ship gates (do not conflate)

| Tier | Label | Meaning | v1.4a status |
|------|-------|---------|--------------|
| **1** | **Adapter checkpoint** | Best LoRA from a train cycle; archive on HF; base for next fine-tune | **v1.4a** — current |
| **2** | **Abstract Sanad ship** | Pass **model gates** in §10 on abstract-only harness | **Not met** (quote validity 81.8%) |
| **2b** | **Product safety (app)** | Engine quote-substring guardrail: no `pass` when quotes are non-verbatim | **Implemented** in `grounding-llm.ts` (v1.5) |
| **3** | **Product Sanad ship** | Tier 2 model gates + **Masdar** body-text pipeline + full-text eval slice | **Not met** |

**Tier 2 has two coupled criteria:**

1. **Model gate** — raw eval metrics in §10 (quote validity ≥98% on holdout, etc.). Training target for v1.5.
2. **Product-safety gate** — after deterministic quote-substring checks, **zero false `pass`** reaches the user for supported claims with invalid quotes. Achievable in-app even before the model gate passes.

**v1.4a** passed the **intermediate 4a gate** (JSON ≥98%, supported h-001–h-010 ≥8/10) and beat **v1.4b**, so it is the adapter checkpoint to build from. **v1.10 12B Q6_K** passes Tier 2 §10 on the hardened harness (see §5 scorecard). **Ouroboros loop UI** ships in-app; legacy `AuditView` tab layout stays retired.

**Excerpt scope:** Training and primary eval are **abstract-only**. Sanad compares passage vs text excerpt — it does not read PDFs. PDF → text is **Masdar** (`source_pdf_extract`) + engine extract; the app often falls back to abstract-only today. Do not claim full-paper grounding until Tier 3.

### Version scorecard

| Ver | Combined expect | JSON (repair) | Supported h-001–h-010 | Quote val (holdout) | False sup (ext core) | False sup (holdout) | Core 5 | Verdict |
|-----|-----------------|---------------|------------------------|---------------------|----------------------|---------------------|--------|---------|
| Stock baseline | 86% | 100% | 10/10 | 90.9% | — | — | 4/5 | Untuned reference |
| v1.2 | 86% | 100% | 9/10 | 90.9% | — | — | 2/5 | NO-GO |
| v1.3 | 80% | 86% | 3/10 | 36.4% | — | — | 5/5 | NO-GO |
| **v1.4a** | **90%** | **100%** | **8/10** | **81.8%** | **11.1%** | **2.94%** | **5/5** | **CHECKPOINT** (adapter) |
| v1.4b | 87.1% | 100% | 8/10 | 81.8% | — | — | 5/5 | NO-GO |
| v1.8 | 91.43% | 100% | 9/10 | 90.91% | — | 2.94% | 5/5 | NO-GO (legacy 70-row harness) |
| **v1.10 E4B Q6_K** | **88.12%** | **100%** | **10/10** | **89.47%** | — | **6.57%** | **5/5** | Superseded (default-tier only) |
| **v1.10 12B Q6_K** | **94.79%** | **100%** | **10/10** | **100%** | — | **2.82%** | **5/5** | **TIER 2 PASS** (optional quality tier) |
| **v1.12 E4B Q6_K** | **89.27%** | **100%** | **9–10/10** | **92.98%** | — | **3.81%** | **5/5** | **DEFAULT-TIER SHIP** (`nassila-sanad-e4b`) |

**Gate policy:** `false_supported` gates on **holdout only** (≤5%). **Monitor** extended-core false-supported (11.1% at v1.4a) in every report — it is not a ship gate but flags regression risk.

**Expect margin:** Tier 2 minimum is combined expect ≥90%; **operator target ≥92%** so one holdout row does not flip the gate (v1.4a combined expect is exactly 90.0%).

**HF adapter (checkpoint):** [`QinEmPeRoR93/nassila-grounding-e4b-v1.4a-adapter`](https://huggingface.co/QinEmPeRoR93/nassila-grounding-e4b-v1.4a-adapter) (legacy name; v1.4a only)

**HF Sanad GGUF:** [`QinEmPeRoR93/nassila-sanad-e4b`](https://huggingface.co/QinEmPeRoR93/nassila-sanad-e4b) (E4B Q6_K, **checkpoint v1.12**) · [`QinEmPeRoR93/nassila-sanad-12b`](https://huggingface.co/QinEmPeRoR93/nassila-sanad-12b) (12B Q6_K, **checkpoint v1.14**). Upload: [`PHASE2_9_AB_PILOT_WALKTHROUGH.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/PHASE2_9_AB_PILOT_WALKTHROUGH.md) Part 9 · Verify: [`HF_RELEASE_VERIFY.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/HF_RELEASE_VERIFY.md)

## 6. v1.4 fixes (what worked)

1. **`canonical_claim()`** — uniform JSON; `hasNumericClaim` always last
2. **Priority balancing** — rare suffixes in `PRIORITY_SUFFIXES`; not `-multi-`/`-multip-`
3. **Prompt dedup** — system line only in chat `system` role (NassilaT); `grounding-llm.ts` align at app merge
4. **Seq-safe train** — `l3_grounding_train_v14a.jsonl` (850 rows, 2048 tokens)
5. **`save_strategy=no`** — Unsloth/Gemma4 checkpoint pickle crash on Vast
6. **Pipeline** — `NassilaT/training/scripts/run_vast_pipeline.sh`

## 7. v1.4 gaps → v1.5 targets

| Gap | Detail |
|-----|--------|
| **Quote validity** | 81.8% vs target **≥98%** — primary v1.5 goal |
| **h-010** | Paraphrase supported — persistent `wrong_verdict` |
| **h-043, h-045** | Multi-claim / not-in-source edge cases |
| **Semantic supported** | h-006/h-008 tradeoffs between 4a and 4b |

**v1.4b lesson:** More epochs (3 @ 1.5e-4) did not improve quotes or combined score. v1.5 needs **data / loss / contrastive**, not hyperparams alone.

## 8. Holdout matrix (summary)

v1.3: supported cluster dominated by `parse_json` (schema drift).
v1.4a: JSON recovered; misses h-006, h-010, h-043, h-045.

Full matrix: NassilaT `training/reports/holdout_failure_matrix.md`

## 9. Diagnosis themes

Source: [NassilaT `nassila_training_diagnosis.md`](https://github.com/jamalesam93/NassilaT/blob/main/nassila_training_diagnosis.md)

- **Whack-a-mole** across v1.0–v1.3
- **v1.3 root cause:** mixed JSON schemas (`rationale` last vs `hasNumericClaim` last)
- **h-001 pattern:** correct quotes, wrong verdict — paraphrase → `weak` bias
- **§6.2:** contrastive / loss weighting for paraphrase-supported (v1.5 candidate)

## 10. Eval protocol (go/no-go)

**Canonical source for all repos.** NassilaT [`EVALUATION_GUIDE.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/EVALUATION_GUIDE.md) and [`EVAL_GONOGO.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/EVAL_GONOGO.md) reference this section only.

**Harness:** **115 rows** = legacy core 5 + extended 20 + holdout **90** (hardened; was 45). Build: NassilaT `python scripts/build_hardened_holdout.py` → `data/eval_holdout_90.jsonl`. Legacy 45-row slice kept as `eval_holdout_45.jsonl` for version regression only.

**Multi-seed:** A/B pilot runs ≥3 decode seeds (`run_multi_seed_eval.py`) so single-row gate flips do not decide ship.

**Scoring:** `python scripts/run_eval_reports.py --predictions … --repair --holdout data/eval_holdout_90.jsonl` writes per-slice quote validity and `tier2_gates` block (see NassilaT `scripts/tier_gates.py`).

### Tier 2 — abstract Sanad ship (model gates)

All must pass:

| Metric | Target | Slice |
|--------|--------|-------|
| Combined expect pass | ≥90% (target ≥92%) | Combined **115** rows |
| JSON parse (with repair) | ≥98% | Combined |
| Supported h-001–h-010 | ≥8/10 | Holdout |
| Core legacy 5 | 5/5 | Legacy core |
| Quote validity | ≥98% | **Holdout** |
| False supported | ≤5% | **Holdout** |

### Tier 2b — product safety (app, not eval-scored)

After `passageVerdictFromGroundingClaims(..., sourceExcerpt)` in [`grounding-llm.ts`](../src/engine/manuscript/grounding-llm.ts): supported claims with non-substring `sourceQuotes` demote to `warn`. **No false `pass`** on invalid quotes.

### Tier 1 — adapter checkpoint (v1.4a intermediate gate)

Used to decide whether to run the next hyperparam phase (e.g. v1.4b): JSON parse ≥98%, supported h-001–h-010 ≥8/10. **Not sufficient for product ship.**

### Tier 3 — product Sanad ship (additional)

- Tier 2 on abstract harness **and**
- **Maktab** manuscript ingest + **Masdar** pipeline supplies cited-source body text in app loop **and**
- Eval slice on full-text / body-chunk excerpts passes same quote + expect gates

Manual Sanad paste does **not** satisfy Tier 3 product ship; it is a bridge until the loop feeds Sanad automatically.

**Vast (NassilaT):** `PHASE=4a|4b|5 bash training/scripts/run_vast_pipeline.sh` · llama.cpp **b9608** · port **1234**

## 11. Model tier policy (A/B pilot — recorded)

- **Default tier:** Gemma 4 **E4B** Q6_K — **`nassila-sanad-e4b` v1.12** = 89.27% combined, E4B default-tier **PASS**
- **Quality tier:** Gemma 4 **12B** Q6_K — **v1.14 selected** = 90.43% combined, quote 100%, Tier 2 **PASS** (h-045/h-088 fixed); v1.12 = 94.20% higher-combined fallback
- **v1.13:** **NO-GO** — do not publish ([`POST_V114_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/POST_V114_MAP.md))
- **Shahid:** 12B when multimodal worker forges (unchanged)
- **v1.11:** trained, **NO-GO** (80.58% regression) — do not publish
- **v1.12 E4B:** **GO** — archive [`PHASE2_11_V112_WALKTHROUGH.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/archive/PHASE2_11_V112_WALKTHROUGH.md)
- **v1.12 12B:** **GO** — archive [`PHASE2_12_12B_QUALITY_WALKTHROUGH.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/archive/PHASE2_12_12B_QUALITY_WALKTHROUGH.md)
- **v1.14 12B:** **GO** — [`PHASE2_14_12B_MULTI_CLAIM_WALKTHROUGH.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/PHASE2_14_12B_MULTI_CLAIM_WALKTHROUGH.md)
- No Manuscript Audit UI re-enable without explicit request

## 12. Open (post v1.14 select)

- ~~E4B v1.12 + 12B v1.14 train/eval~~ **Done (GO)**
- ~~Laptop smoke~~ **Done (PASS, RTX 4060 8 GB, 2026-06-21)**
- **HF release verify** — [`HF_RELEASE_VERIFY.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/HF_RELEASE_VERIFY.md)
- Ouroboros loop UI (Nassila `docs/PRODUCT.md`, `docs/DESIGN.md`) — primary IA correction after laptop smoke pass
- Maktab/Masdar → Tier 3 — [`PHASE3_TIER3_GROUNDWORK.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/PHASE3_TIER3_GROUNDWORK.md)
- Optional **v1.15** combined-score recovery (not default)

## 13. NassilaT operator index

Repo: [jamalesam93/NassilaT](https://github.com/jamalesam93/NassilaT). See [`TRAINING.md`](./TRAINING.md).

| Need | Path (NassilaT) |
|------|-----------------|
| **Current map** | `training/POST_V114_MAP.md` |
| Laptop smoke | `training/LAPTOP_SMOKE_TEST.md` |
| Tier 3 plan | `training/PHASE3_TIER3_GROUNDWORK.md` |
| Next Vast | `training/PHASE2_14_12B_MULTI_CLAIM_WALKTHROUGH.md` |
| Ship gates | `docs/DUAL_TIER_POLICY.md` |
| GO/NO-GO | `training/EVAL_GONOGO.md` |
| A/B pipeline | `training/PHASE2_9_AB_PILOT_WALKTHROUGH.md` |
| Model cards | `training/MODEL_CARD_sanad_e4b.md`, `MODEL_CARD_sanad_12b.md` |
| Dataset schema | `training/DATASET_SCHEMA.md` |
| Corpus | `training/CORPUS_PIPELINE.md` |
| Archive | `training/archive/` |

Historical v1.0–v1.13 walkthroughs: **`training/archive/`** — not root `training/`.

## 14. Agent prompts

**Whole-plan review (architecture + v1.5):**

```
@docs/OUROBOROS_CONTEXT.md
@docs/OUROBOROS.md

Review the Ouroboros plan as a whole:
- **Ouroboros, not Hydra** — one manuscript audit loop; seven workers as loop stages (deterministic core + LLM facet per §2–§3)
- Pillar ↔ worker mapping and loop-first UI (not seven peer worker tabs as end-state IA)
- Sanad v1.4a **checkpoint** state, tiered ship gates (§5, §10), and v1.5 targets (§7–§8)
- Forge order, eval gates, and what must pass before worker 2 (Maktab)
- Risks, gaps, and explicit non-goals (APIs stay authoritative; no LLM replacement of registry/citeproc)

Produce: strengths, weaknesses, recommended changes, and a prioritized v1.5 action list.
```

**v1.5 planning (Sanad only):**

```
@docs/OUROBOROS_CONTEXT.md

Read Nassila + NassilaT code only where §3–§4 and §13 point.
Produce a rigorous v1.5 plan for worker Sanad: hypotheses, dataset, train recipe,
eval gates, app merge checklist, explicit non-goals.
```

**Monthly reset / full arc:**

```
@docs/OUROBOROS_CONTEXT.md

Summarize Ouroboros worker forge order, module ownership (§3), and what must pass before starting worker 2 (Maktab).
```

## 15. Maintenance

After each Vast eval: update §5–§8 (metrics, checkpoint version, holdout misses, tier status).
