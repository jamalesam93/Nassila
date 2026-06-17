# Training — lives in NassilaT

**All QLoRA training, corpus generation, Vast pipelines, eval harnesses, and model cards live in the [NassilaT](https://github.com/jamalesam93/NassilaT) repository**, not in this app repo.

This repo (**Nassila**) owns the Electron app, citation engine, JSON repair guardrails, and LM Studio integration hooks. When a worker facet passes eval gates in NassilaT, merge the adapter/GGUF and align prompts here (`src/engine/manuscript/grounding-llm.ts`, etc.).

---

## Local layout (typical)

Clone both repos as siblings:

```
E:/Cursor Projects/
  citations-style/     ← this repo (Nassila app)
  NassilaT/            ← training pack
    training/
      ROADMAP.md
      DATASET_SCHEMA.md
      scripts/
      data/
      reports/
```

**Agent entry point for Ouroboros + Sanad state:** [`OUROBOROS_CONTEXT.md`](./OUROBOROS_CONTEXT.md)

---

## NassilaT operator index

| Need | Path (in NassilaT repo) |
|------|-------------------------|
| Roadmap | `training/ROADMAP.md` |
| Dataset schema | `training/DATASET_SCHEMA.md` |
| Corpus pipeline | `training/CORPUS_PIPELINE.md` |
| Vast walkthrough (v1.5) | `training/PHASE2_8_V1_5_WALKTHROUGH.md` |
| A/B pilot (E4B vs 12B) | `training/PHASE2_9_AB_PILOT_WALKTHROUGH.md` |
| Vast walkthrough (v1.4) | `training/PHASE2_7_V1_4_WALKTHROUGH.md` |
| Model card (v1.4) | `training/MODEL_CARD_v1_4.md` |
| Eval reports | `training/reports/` |
| Diagnosis | [`nassila_training_diagnosis.md`](https://github.com/jamalesam93/NassilaT/blob/main/nassila_training_diagnosis.md) |
| v1.5 train prep + Vast | `training/scripts/prepare_v15_train.py`, `training/PHASE2_8_V1_5_WALKTHROUGH.md` |
| Vast pipeline | `training/scripts/run_vast_pipeline.sh` |

GitHub tree: [github.com/jamalesam93/NassilaT/tree/main/training](https://github.com/jamalesam93/NassilaT/tree/main/training)

---

## Why there is no `training/` folder here

An older Phase 0–1 training pack existed locally under `training/` but was **superseded by NassilaT** (Phase 2+). Keeping two copies caused stale walkthroughs and drift. Delete any leftover local `training/` directory; use NassilaT only.

---

## App-side integration (this repo)

| Concern | Path |
|---------|------|
| Grounding prompt + schema | `src/engine/manuscript/grounding-llm.ts` |
| JSON repair (mirrors NassilaT `json_repair.py`) | `src/engine/manuscript/grounding-json-repair.ts` |
| Task ids + worker codenames | `src/shared/nassila-agent-tasks.ts` |
| LM Studio presets | `src/renderer/components/ManuscriptAudit/llm-presets.ts` |
