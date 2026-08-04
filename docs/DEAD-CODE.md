# Dead code inventory — Nassila

Maintainer backlog of **unmounted**, **unreferenced**, or **noop** code paths.

**Last cleanup:** 2026-08-03 — Tier 4 (structure template picker & source format badge UI wired), Tier 5 (UI_AUDIT.md archived).

---

## Resolved & Cleaned Up

| Item | Action / Resolution | Date |
|------|--------------------|------|
| Legacy audit UI | `ManuscriptAudit/AuditView.tsx` removed | 2026-06-27 |
| Pre-reform chrome | `Toolbar.tsx`, `WorkflowStrip.tsx`, `Sidebar.tsx` removed | 2026-06-27 |
| Hydra stub panel | `StubWorkerPanel.tsx`, `worker-registry.ts` removed | 2026-06-27 |
| AppMode IPC | `app-mode.ts`, `setAppMode` preload/IPC removed | 2026-06-27 |
| Unused npm scripts | `docs:placeholders`, `docs:images`, `gen-icon-png.ps1` removed | 2026-08-03 |
| Legacy PRESETS_DIR | Migrated `~/.citations-style` → `~/.nassila` with backward fallback | 2026-08-03 |
| Structure template UI | Wired `selectedTemplateId`, `templateStrict`, `templates` to loop UI | 2026-08-03 |
| Source format badge | Wired `manuscriptSourceFormat` (`[DOCX]`, `[PDF]`, `[Text]`) to loop UI | 2026-08-03 |
| UI Audit doc rot | Archived `docs/UI_AUDIT.md`; refreshed `.cursor/rules/cursor-rules-ouroboros.md` | 2026-08-03 |

---

## Keep — often mistaken for dead

| Item | Why it stays |
|------|----------------|
| `manuscript-audit-store.ts`, `use-manuscript-audit.ts` | Powers Ouroboros loop |
| `SidebarPanel`, `InputPanel`, `OutputPanel`, `IssuePanel` | Bibliography mode (Raqim) |
| `engine/manuscript/*`, `engine/audit/*` | Loop audit pipeline |

---

_See also: [SECURITY-FIX-PLAN.md](./SECURITY-FIX-PLAN.md) (SEC-02b sandbox backlog)._
