# Training — lives in NassilaT

**All QLoRA training, corpus generation, Vast pipelines, eval harnesses, and model cards live in the [NassilaT](https://github.com/jamalesam93/NassilaT) repository**, not in this app repo.

This repo (**Nassila**) owns the Electron app, citation engine, JSON repair guardrails, and LM Studio integration hooks. When a worker facet passes eval gates in NassilaT, merge the adapter/GGUF and align prompts here (`src/engine/manuscript/grounding-llm.ts`, etc.).

**Agent entry:** [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md)

**Current training arc:** v1.14 **GO** on 12B (selected quality tier). Laptop smoke **PASS** (RTX 4060 8 GB). See NassilaT [`training/POST_V114_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/POST_V114_MAP.md) and [`outputs/LAPTOP_SMOKE_SIGNOFF.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/outputs/LAPTOP_SMOKE_SIGNOFF.md).

---

## Local layout (typical)

```
E:/Cursor Projects/
  Nassila/             ← this repo (app)
  NassilaT/            ← training pack
    training/
      POST_V114_MAP.md
      LAPTOP_SMOKE_TEST.md
      ROADMAP.md
      scripts/
      data/
      reports/
    docs/
      DUAL_TIER_POLICY.md
```

---

## NassilaT operator index

| Need | Path (NassilaT) |
|------|-----------------|
| **Current map** | `training/POST_V114_MAP.md` |
| Laptop smoke sign-off | `training/outputs/LAPTOP_SMOKE_SIGNOFF.md` |
| HF verify | `training/HF_RELEASE_VERIFY.md` |
| Tier 3 plan | `training/PHASE3_TIER3_GROUNDWORK.md` |
| Next Vast run | `training/PHASE2_14_12B_MULTI_CLAIM_WALKTHROUGH.md` |
| Roadmap | `training/ROADMAP.md` |
| Ship gates | `docs/DUAL_TIER_POLICY.md` |
| GO/NO-GO log | `training/EVAL_GONOGO.md` |
| A/B pipeline | `training/PHASE2_9_AB_PILOT_WALKTHROUGH.md` |
| Dataset schema | `training/DATASET_SCHEMA.md` |
| Corpus | `training/CORPUS_PIPELINE.md` |
| Model cards | `training/MODEL_CARD_sanad_e4b.md`, `MODEL_CARD_sanad_12b.md` |
| Eval how-to | `training/EVALUATION_GUIDE.md` |
| Diagnosis themes | `nassila_training_diagnosis.md` |
| Archive (v1.4–v1.13) | `training/archive/` |

GitHub: [github.com/jamalesam93/NassilaT/tree/main/training](https://github.com/jamalesam93/NassilaT/tree/main/training)

---

## Why there is no `training/` folder here

Phase 0–1 pack was superseded by **NassilaT**. Do not duplicate; use NassilaT only.

---

## App-side integration (this repo)

| Concern | Path |
|---------|------|
| Grounding prompt + schema | `src/engine/manuscript/grounding-llm.ts` |
| JSON repair | `src/engine/manuscript/grounding-json-repair.ts` |
| Task ids + workers | `src/shared/nassila-agent-tasks.ts` |
| LM Studio presets | `src/renderer/components/ManuscriptAudit/llm-presets.ts` |

Prompt sync deferred until Ouroboros UI reform; Tier 2b quote guardrail is live in engine.
