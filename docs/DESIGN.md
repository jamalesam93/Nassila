# Nassila — design system

Visual and interaction rules for Ouroboros worker UI. Product scope: [`PRODUCT.md`](./PRODUCT.md). Brand: [`BRAND.md`](./BRAND.md).

Inspired by disciplined academic-tool patterns (see [Impeccable](https://github.com/pbakaus/impeccable) anti-patterns): avoid template SaaS chrome; prefer clarity, density, and bilingual parity.

## Lane

**Product** — desktop Electron app, not marketing. Feels like a serious bibliography workstation, not a startup landing page.

## Typography

- Prefer a distinctive but readable sans for UI chrome; a separate readable face for citation text and monospace for DOI/PMID/JSON debug.
- Do **not** default to Inter, Arial, or system-ui-only stacks.
- EN and AR: line-height slightly generous for RTL; test mixed Latin + Arabic in table cells.

## Color

- Tint neutrals (no pure `#000` / flat `#888` on colored backgrounds).
- Status colors: verified, warn, error, predatory — distinct hues with sufficient contrast in light and dark themes.
- Accent sparingly; bibliography tables are the hero, not gradient heroes.

## Layout

- Worker shell: persistent side or top nav with seven workers + Settings.
- **Raqim** / **Tasnif**: table-first layouts; filters as toolbar, not nested cards.
- **Sanad**: passage + excerpt inputs, claim list with verdict chips and expandable quotes.
- Spacing rhythm: 4px base; avoid “card inside card inside card” for every row.

## Components

| Pattern | Rule |
|---------|------|
| Reference row | One surface; inline actions; formatted preview via citeproc |
| Verdict chip | `supported` / `weak` / `contradicted` / `not_in_source` / `insufficient_evidence` — color + label i18n |
| Stub worker | Illustration or icon + one sentence + “planned” badge; no fake progress |
| Empty state | Actionable (import, connect LM Studio, paste excerpt) |
| Settings LM slot | Model id hint: `nassila-sanad-e4b`, optional `nassila-sanad-12b` |

## Motion

- Subtle transitions only (panel open, row expand). No bounce/elastic easing on productivity UI.

## RTL

- Mirror nav and table action columns; keep DOI/URL LTR in isolates.
- Worker names: codename in EN UI; Arabic script in AR UI (`BRAND.md` table).

## Accessibility

- Table keyboard navigation; focus rings on interactive cells.
- Verdict chips never color-only — always text label.

## Explicit anti-patterns

- Purple-to-blue gradient headers.
- Rounded-square icon tile above every section title.
- Gray helper text on saturated button or banner backgrounds.
- Hiding dedup/predatory behind a single undifferentiated “References” tab forever.

## Implementation note

Renderer lives under `src/renderer/`; reuse existing i18n JSON (`en` / `ar`). New Sanad module should not import legacy `ManuscriptAudit/` layout wholesale — rebuild against this spec.
