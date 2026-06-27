# Dead code inventory — Nassila

Maintainer backlog of **unmounted**, **unreferenced**, or **noop** code paths.

**Last cleanup:** 2026-06-27 — Tier 1 (legacy UI), Tier 2 (debug), Tier 3 (AppMode IPC) removed.

---

## Removed (2026-06-27)

| Item | Was |
|------|-----|
| Legacy audit UI | `ManuscriptAudit/AuditView.tsx` |
| Pre-reform chrome | `Toolbar.tsx`, `WorkflowStrip.tsx`, `Sidebar.tsx` |
| Hydra stub panel | `StubWorkerPanel.tsx`, `worker-registry.ts`, `worker-registry.test.ts` |
| LLM presets location | Moved to `src/renderer/settings/llm-presets.ts` |
| AppMode IPC | `app-mode.ts`, `setAppMode` preload/IPC, noop menu mode state |
| Unused menu i18n | `importManuscript`, `switchMode`, `modeReferences`, `modeManuscriptAudit` |
| No-op npm scripts | `docs:placeholders`, `docs:images` |

---

## Tier 4 — Engine live, UI missing (remaining)

Logic runs in `use-manuscript-audit.ts` but users cannot change settings in the loop UI (only via prefs file / defaults).

| Feature | Store / prefs | Notes |
|---------|---------------|--------|
| Structure template picker | `selectedTemplateId`, `templateStrict`, `templates` | Defaults: `imrad`, non-strict |
| Source format badge | `manuscriptSourceFormat` | Set on import; no UI display in loop |

**Next step:** Add template controls to loop settings, or drop structure checks from audit.

---

## Tier 5 — Stale docs (remaining)

| Item | Path |
|------|------|
| UI audit (Toolbar-centric, pre-`AppHeader`) | `docs/UI_AUDIT.md` |
| Archive docs | `docs/archive/` — historical only |

---

## Keep — often mistaken for dead

| Item | Why it stays |
|------|----------------|
| `manuscript-audit-store.ts`, `use-manuscript-audit.ts` | Powers Ouroboros loop |
| `SidebarPanel`, `InputPanel`, `OutputPanel`, `IssuePanel` | Bibliography mode |
| `engine/manuscript/*`, `engine/audit/*` | Loop audit pipeline |

---

_See also: [SECURITY-FIX-PLAN.md](./SECURITY-FIX-PLAN.md) (SEC-02b sandbox backlog)._
