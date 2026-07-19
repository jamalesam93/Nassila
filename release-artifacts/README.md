# Nassila Windows installers (v1.1.0 – v1.2.1)

Built on this machine for [GitHub Releases](https://github.com/jamalesam93/Nassila/releases).

| Version | Codename | Installer | Release notes |
|---------|----------|-----------|---------------|
| **1.2.1** | **Masdar UX** | `Nassila Setup 1.2.1.exe` | [v1.2.1-RELEASE_NOTES.md](./v1.2.1-RELEASE_NOTES.md) · **on GitHub** |
| **1.2.0** | **Masdar-lite** | `Nassila Setup 1.2.0.exe` | [v1.2.0-RELEASE_NOTES.md](./v1.2.0-RELEASE_NOTES.md) · **on GitHub** |
| **1.1.3** | **Polish** | `Nassila Setup 1.1.3.exe` | [v1.1.3-RELEASE_NOTES.md](./v1.1.3-RELEASE_NOTES.md) |
| **1.1.2** | **Raqim Bridge** | `Nassila Setup 1.1.2.exe` | [v1.1.2-RELEASE_NOTES.md](./v1.1.2-RELEASE_NOTES.md) |
| **1.1.1** | **Bibliography-first** | `Nassila Setup 1.1.1.exe` | [v1.1.1-RELEASE_NOTES.md](./v1.1.1-RELEASE_NOTES.md) |
| **1.1.0** | **Sanad** | `Nassila Setup 1.1.0.exe` | [v1.1.0-RELEASE_NOTES.md](./v1.1.0-RELEASE_NOTES.md) |

**Planned (see NassilaT [`OUROBOROS_OPERATOR_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/OUROBOROS_OPERATOR_MAP.md) § App release train):** Phase 0 Trust reset · 1.2.2 Throughput · 1.2.3 Quote chip · 1.2.4 Raqim Repair · 1.2.5 Masdar attach · 1.2.6 Raqim Resolve · 1.2.7 Projects + Help + onboarding · 1.2.8 OCR O2 + a11y · 1.2.9 Preflight + quality ledger · 1.3.0 Sharh-lite · ∥ NassilaT field-note/Tier 3 data curation; S15 parked

**Latest:** use **1.2.1**. Older installers are for release history; upgrading from **1.1.x** / **1.2.0** to **1.2.1** is fine.

## Create GitHub release (1.2.1)

```bash
npm run build:win
gh release create v1.2.1 "dist/Nassila Setup 1.2.1.exe" --title "v1.2.1 — Masdar UX" --latest --notes-file release-notes/v1.2.1-RELEASE_NOTES.md
```

**Note:** This folder is local build output — do not commit `.exe` files to git.

For every published installer, generate and publish its SHA-256 digest alongside the release asset (for example, `Get-FileHash -Algorithm SHA256 "dist\Nassila Setup 1.2.1.exe"` on Windows).
