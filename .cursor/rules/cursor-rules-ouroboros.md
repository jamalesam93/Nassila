---
description: Ouroboros loop UI — layout, design discipline, implementation guidance
globs: src/renderer/components/loop/**,src/renderer/components/workers/**,src/renderer/components/shell/**
alwaysApply: false
---

# Ouroboros Loop UI Rules

## 1. Layout rules (live surfaces)

1. **AppHeader** (`shell/AppHeader.tsx`): brand mark left, primary actions center, dropdown right. One row, no decorative pipeline pills.
2. **Master-detail split**: `RaqimWorkspace.tsx` (bibliography) and `OuroborosLoopWorkspace.tsx` (loop) use a 2-column split for the primary flow.
3. **Drawer pattern**: target style configs (`By Journal` / `By Style`) live in the collapsible `BibliographyDrawer`.
4. **StatusBar** (`StatusBar.tsx`): only actionable counts (Issues, Predatory, Duplicates) + target style + network status. Must not wrap into two lines.

## 2. Loop component structure (splits done 2026-08-03)

The loop panels were split into focused files 2026-08-03. Keep new UI out of the orchestrator:

| File | Lines | Role |
|------|-------|------|
| `OuroborosLoopWorkspace.tsx` | ~120 | Thin orchestrator: bootstrap, run/reaudit handlers, selection effects, `running` computation |
| `LoopEditorPane.tsx` | ~370 | Left column: Sanad bar, banners, dropzone/text editor, footer with template picker and run button |
| `LoopSourcesPanel.tsx` | ~170 | Right column: findings table with keyboard nav, audit detail + Sharh-lite composition |
| `LoopAuditDetail.tsx` | ~210 | Per-reference detail: header actions, verdict rows, cite sites |
| `LoopVerdictUi.tsx` | ~230 | Shared verdict primitives: `StatusPill`, `LayerRow`, `QuoteValidationChip`, `ExcerptBlock`, `SiteBlock`, `sourceProviderKey` |
| `SharhLitePanel.tsx` | ~140 | Preflight + quality ledger export (kept as-is; already small) |

Add jsdom component tests when changing component boundaries.

## 3. Open anti-scaffold items (live files only)

* **Flatten citation rows** in `OutputPanel.tsx` — use flat divider-only layout for routine citations; reserve card borders only for citations with active issues or predatory flags.
* **Eradicate native `<details>` popovers** in `OutputPanel.tsx` — replace with proper UI menus or inline action bars.
* **Fix hand-rolled dropdowns** — replace raw `pointerdown` absolute wrappers with an accessible component layer (Escape-to-close, arrow-key navigation, ARIA states).
* **Custom confirm dialogs** — ensure no remaining `window.confirm()` calls. The `confirm-dialog.tsx` component exists; use it everywhere.

## 4. Impeccable design discipline (absolute bans)

| Element | Banned | Required |
|---------|--------|----------|
| **Headers & Themes** | Purple-to-blue gradients, glassmorphism cards, neon glows, vibrant ambient shadows | Flat, deep, authoritative tinted neutrals. Calm primary colors as focal sparks only |
| **Typography** | Defaulting to raw `system-ui` or Inter for everything | Custom font stack: Source Sans 3 / IBM Plex for chrome, serif for citation bodies, monospace for DOIs/IDs |
| **Containers** | Nesting cards inside cards; rounded-square icon tiles above every header | Clean tables and flat dividers. 4px padding/spacing rhythm. Maximize information density |
| **Aesthetics** | Over-rounded corners (>16px), wide fuzzy shadows, tiny uppercase tracked eyebrows | 4px–8px rounding max, 1px solid borders, sentence-case typography |
| **Interactions** | Bouncy/elastic easing, fake theatrical loading for stubs | Instantaneous or micro-fade. Respect `prefers-reduced-motion` |

## 5. Implementation sequence

When working on renderer/view layers:

1. Verify whether the target view is **Manuscript Audit** (loop) or **Bibliography-Only** (Raqim).
2. Render verdict chips with text label + status color (color-blind accessible).
3. Full structural mirroring for LTR (EN) ↔ RTL (AR); keep DOIs, IDs, and URLs locked to LTR.
4. Provide explicit UI feedback or skeleton shimmers for long async operations (verify, audit).