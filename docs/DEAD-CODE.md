# Dead code inventory — Nassila

Maintainer backlog of **unmounted**, **unreferenced**, or **noop** code paths. Generated 2026-06-27 from static import analysis + product docs.

**Not listed here:** intentional stubs (Maktab/Masdar/Shahid in `PRODUCT.md`), live loop/bibliography UI, or engine code used by `use-manuscript-audit.ts`.

**How to use:** Remove Tier 1–2 first (low risk). Tier 3–4 need product decisions or UI replacement before deletion.

---

## Tier 1 — Unmounted / unreferenced (safe to delete)

No production import chain; tree-shaken from builds today.

| Item | Path | Notes |
|------|------|--------|
| Legacy manuscript audit UI | `src/renderer/components/ManuscriptAudit/AuditView.tsx` (~685 lines) | Replaced by `OuroborosLoopWorkspace`. **Keep** `llm-presets.ts` in same folder (or move first). |
| Pre-reform toolbar | `src/renderer/components/Toolbar.tsx` | Superseded by `shell/AppHeader.tsx`. Not imported anywhere in `src/`. |
| Pipeline pills | `src/renderer/components/WorkflowStrip.tsx` | Only imported by dead `Toolbar.tsx`. |
| Sidebar re-export | `src/renderer/components/Sidebar.tsx` | Re-exports `SidebarPanel`; nothing imports `Sidebar.tsx`. Live path uses `SidebarPanel` via `BibliographyDrawer`. |
| Hydra worker stub panel | `src/renderer/components/workers/StubWorkerPanel.tsx` | Never mounted. Only consumer of `worker-registry` in app code. |
| Worker registry (app) | `src/renderer/workers/worker-registry.ts` | Used by `StubWorkerPanel` + `tests/unit/worker-registry.test.ts`. Safe to delete panel + registry together, or keep registry for future nav. |

**Suggested delete order:** `AuditView.tsx` → move `llm-presets.ts` → `Toolbar.tsx` + `WorkflowStrip.tsx` + `Sidebar.tsx` → `StubWorkerPanel.tsx` (+ optionally `worker-registry.ts`).

---

## Tier 2 — Temporary debug instrumentation — **removed in v1.1.0**

Former About-crash debug session (SEC-02). Deleted before 1.1.0 ship commit.

---

## Tier 3 — Legacy plumbing (noop / unused state)

Still called but does not affect behavior; creates confusion for agents.

| Item | Path | Why it's dead |
|------|------|----------------|
| `AppMode` IPC | `src/shared/app-mode.ts`, `app:set-app-mode` | Type is only `'references'`. `validateAppMode()` in `ipc-handlers.ts` ignores input and always returns `'references'`. |
| Menu mode variable | `currentAppMode` in `src/main/app-menu.ts` | Assigned via IPC then `void currentAppMode` — never changes menu items. |
| `setAppMode` calls | `src/renderer/stores/shell-store.ts` | Always passes `'references'`. |
| Menu i18n `importManuscript` | `src/main/menu-i18n.ts` | String defined but no menu entry uses it (import is via `AppHeader` / loop UI). |

**Cleanup options:** Remove `AppMode` + `setAppMode` IPC entirely, or wire it to real Manuscript/Bibliography menu differences if you want native menu parity.

---

## Tier 4 — Engine live, UI dead (no shipping controls)

Logic runs in `use-manuscript-audit.ts` but users cannot change settings in the loop UI (only via prefs file / defaults).

| Feature | Store / prefs | UI was only in |
|---------|---------------|----------------|
| Structure template picker | `selectedTemplateId`, `templateStrict`, `templates` | `AuditView.tsx` settings tab |
| Source format badge | `manuscriptSourceFormat` | `AuditView.tsx` manuscript tab |
| Template list bootstrap (duplicate) | `useEffect` loading templates | `AuditView.tsx` (loop uses `use-ouroboros-loop-bootstrap.ts` instead) |

Audit still applies template checks using defaults (`imrad`, `templateStrict: false`) and hydrated prefs. **Not safe to delete engine paths** until loop UI exposes templates or you drop structure checks.

---

## Tier 5 — Stale docs / scripts (reference dead UI)

| Item | Path |
|------|------|
| UI audit (Toolbar-centric) | `docs/UI_AUDIT.md` — describes `Toolbar.tsx` as live |
| How-to toolbar row | `docs/HOW_TO_GUIDE.md` — "**Toolbar**" as primary chrome (now `AppHeader`) |
| No-op npm scripts | `package.json` — `docs:placeholders`, `docs:images` print `(removed)` |
| Archive docs | `docs/archive/` — historical only |

---

## Keep — often mistaken for dead

| Item | Why it stays |
|------|----------------|
| `src/renderer/components/ManuscriptAudit/llm-presets.ts` | Used by settings, Sanad, tests |
| `manuscript-audit-store.ts`, `use-manuscript-audit.ts` | Powers Ouroboros loop |
| `SidebarPanel`, `InputPanel`, `OutputPanel`, `IssuePanel`, etc. | Bibliography mode (`RaqimWorkspace`) |
| `engine/manuscript/*`, `engine/audit/*` | Loop audit pipeline |
| `ui/tabs.tsx` | `SettingsModal`, `SidebarPanel` (not only `AuditView`) |

---

## Suggested cleanup PRs

1. **Debug removal** — Tier 2 only; run `npm test` + manual About/menu smoke.
2. **Legacy UI deletion** — Tier 1; move `llm-presets.ts` → `src/renderer/settings/llm-presets.ts`; update imports.
3. **AppMode simplification** — Tier 3; remove IPC + preload `setAppMode` if menu never branches.
4. **Template UX** — Tier 4; add template controls to loop settings or remove structure check from audit.

---

_See also: [SECURITY-FIX-PLAN.md](./SECURITY-FIX-PLAN.md) (SEC-02b sandbox backlog), [AGENTS.md](../AGENTS.md) (shipping loop vs retired AuditView)._
