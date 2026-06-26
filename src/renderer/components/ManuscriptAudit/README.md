# Manuscript audit — legacy folder vs shipping loop

## Shipping UI (Ouroboros loop)

The production **Manuscript** surface is **[`OuroborosLoopWorkspace`](../loop/OuroborosLoopWorkspace.tsx)** — mounted from [`WorkerShell`](../workers/WorkerShell.tsx) when `appSurface === 'loop'` (default). It runs the integrated pipeline: manuscript ingest → L1/L2 verify → OA source fetch → L3 Sanad grounding → inline Tasnif/Sharh copy.

User-facing docs: [`docs/USER_GUIDE.md`](../../../docs/USER_GUIDE.md) § Manuscript loop, [`docs/PRODUCT.md`](../../../docs/PRODUCT.md).

## Legacy `AuditView` (retired)

This folder still holds the **pre–Ouroboros-reform** tab layout (`AuditView` and related panels). That UI is **not** mounted. Do **not** remount it wholesale — extend the loop workspace per [`docs/DESIGN.md`](../../../docs/DESIGN.md) and [`docs/PRODUCT.md`](../../../docs/PRODUCT.md).

Shared pieces still used by the loop:

- [`llm-presets.ts`](./llm-presets.ts) — LM Studio / runner presets (Settings → Passage grounding)
- Engine hooks and stores wired from [`use-manuscript-audit.ts`](../../hooks/use-manuscript-audit.ts)

## Ouroboros (local model strategy)

Nassila routes **one LM Studio model** by `task` — see [`docs/OUROBOROS.md`](../../../docs/OUROBOROS.md) and [`docs/OUROBOROS_CONTEXT.md`](../../../docs/OUROBOROS_CONTEXT.md). **Sanad** ships as `nassila-sanad-e4b` / `nassila-sanad-12b` (**v1.12** default tier).

Task constants: [`src/shared/nassila-agent-tasks.ts`](../../../src/shared/nassila-agent-tasks.ts).

## Engine (L3 grounding)

L3 grounding uses JSON auto-repair (`grounding-json-repair.ts`), **quote-substring guardrail** (`grounding-llm.ts`), one retry on parse failure, passage/excerpt length caps, and delimited system/user prompts (SEC-05).
