# Manuscript audit (retired from UI)

This folder and related engine hooks remain in the repository for future reuse (L3, PDF ingest, LLM grounding). The main application no longer mounts `AuditView` or exposes manuscript mode in menus.

## Ouroboros (local model strategy)

Nassila’s long-term plan is **one LM Studio model** routed by `task` — see [`docs/OUROBOROS.md`](../../../docs/OUROBOROS.md) and [`docs/OUROBOROS_CONTEXT.md`](../../../docs/OUROBOROS_CONTEXT.md). **Sanad** ships as `nassila-sanad-e4b` / `nassila-sanad-12b` (**v1.12**). Remount only after Ouroboros UI reform (`docs/DESIGN.md`).

Task constants: [`src/shared/nassila-agent-tasks.ts`](../../../src/shared/nassila-agent-tasks.ts).

## Phase 0.5 (engine)

L3 grounding uses JSON auto-repair (`grounding-json-repair.ts`), **quote-substring guardrail** (`grounding-llm.ts`), one retry on parse failure, passage/excerpt length caps, and an **LM Studio** preset (`llm-presets.ts`, port `1234`).
