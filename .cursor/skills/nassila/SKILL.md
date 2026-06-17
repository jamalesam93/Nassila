---
name: nassila-engine
description: Work on Nassila citation engine — parsing, CSL formatting, registry verification, resolvers, dedup, predatory lists. Use when editing src/engine or related unit tests.
---

# Nassila engine skill

Use with [AGENTS.md](../../../AGENTS.md) at the repo root.

## When to use

- Files under `src/engine/`
- Unit tests in `tests/unit/` for parser, formatter, verifier, resolver, dedup, validator, autocorrect, predatory

## Core types

- **`CslItem`** (`src/engine/types.ts`) — single source of truth for a reference row.
- Do not introduce parallel citation DTOs in engine code; extend `CslItem` or shared types in `src/shared/` if needed.

## Parsing

| Module | Notes |
|--------|--------|
| `parser/index.ts` | Sniff order and dispatch |
| `parser/bibtex.ts`, `ris.ts`, `csl-json.ts` | Structured imports |
| `parser/plain-text.ts`, `document.ts` | Heavier heuristics, URLs, DOCX/PDF extraction |
| `import/` | Zotero, Mendeley, EndNote |

After parser changes, add fixtures in `tests/unit/` and run `npm test`.

## Formatting (CSL)

- Output path: `formatter/index.ts` → `citeproc-wrapper.ts` + `styles.ts` / `styles-extended.ts`.
- Never format bibliography lines by string concatenation in feature code.
- Extended Zotero styles are loaded dynamically; bundled styles are in `formatter/styles.ts`.

## Resolvers and verification

**Resolvers** (`resolver/`): Crossref, PubMed, OpenAlex, DataCite, ISBN/Open Library, URL — each module should stay isolated.

**Verification** (`verifier/`):

1. L1: resolve identifier to canonical metadata.
2. L2: compare user fields to canonical record; safe auto-patch via `apply-mismatches.ts` / `verify-and-apply.ts`.
3. Hard limit: **200 items** per unified run (`src/shared/verification-limits.ts`); prioritize DOI and PMID rows.

Use `network/http.ts` for HTTP; respect offline-first product behavior (callers trigger network, not background polling in engine).

## Other engine areas

- **Validator** (`validator/`) — offline field and style rules.
- **Autocorrect** (`autocorrect/`) — DOI normalization, capitalization, page ranges, medRxiv/bioRxiv canonicalization.
- **Dedup** (`dedup/`) — duplicate groups and merge semantics.
- **Predatory** (`predatory/`) — bundled lists, mirror sync, throttling.
- **Manuscript** (`manuscript/`) — L3 grounding JSON, PDF extract; **Ouroboros** strategy in `docs/OUROBOROS.md`; task ids in `src/shared/nassila-agent-tasks.ts`; UI not shipped; do not assume audit panels exist.

## Checklist before finishing

1. `npm test` — all unit tests green.
2. `npm run lint` — no new ESLint issues in touched files.
3. Minimal diff; no unrelated refactors.
4. If IPC or types cross process boundaries, update `src/shared/`, preload, and main handlers together.
