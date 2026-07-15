# Nassila Windows installers (v1.1.0 – v1.2.0)

Built on this machine for [GitHub Releases](https://github.com/jamalesam93/Nassila/releases).

| Version | Codename | Installer | Release notes |
|---------|----------|-----------|---------------|
| **1.2.0** | **Masdar-lite** | `Nassila Setup 1.2.0.exe` | [v1.2.0-RELEASE_NOTES.md](./v1.2.0-RELEASE_NOTES.md) · **on GitHub** |
| **1.1.3** | **Polish** | `Nassila Setup 1.1.3.exe` | [v1.1.3-RELEASE_NOTES.md](./v1.1.3-RELEASE_NOTES.md) |
| **1.1.2** | **Raqim Bridge** | `Nassila Setup 1.1.2.exe` | [v1.1.2-RELEASE_NOTES.md](./v1.1.2-RELEASE_NOTES.md) |
| **1.1.1** | **Bibliography-first** | `Nassila Setup 1.1.1.exe` | [v1.1.1-RELEASE_NOTES.md](./v1.1.1-RELEASE_NOTES.md) |
| **1.1.0** | **Sanad** | `Nassila Setup 1.1.0.exe` | [v1.1.0-RELEASE_NOTES.md](./v1.1.0-RELEASE_NOTES.md) |

**Planned (see NassilaT [`OUROBOROS_OPERATOR_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/OUROBOROS_OPERATOR_MAP.md) § App release train):** 1.2.1 Masdar UX · 1.2.2 Throughput · 1.2.3 Raqim Repair · 1.2.4 Raqim Resolve · 1.3.0 Sharh-lite

**Latest:** use **1.2.0**. Older installers are for release history; upgrading from **1.1.x** directly to **1.2.0** is fine.

## Create GitHub release (1.2.0)

```bash
npm run build:win
gh release create v1.2.0 "dist/Nassila Setup 1.2.0.exe" --title "v1.2.0 — Masdar-lite" --latest --notes-file release-artifacts/v1.2.0-RELEASE_NOTES.md
```

**Note:** This folder is local build output — do not commit `.exe` files to git.
