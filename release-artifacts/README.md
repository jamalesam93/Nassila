# Nassila Windows installers (v1.1.0 – v1.5.0)

Built on this machine for [GitHub Releases](https://github.com/jamalesam93/Nassila/releases).

| Version | Codename | Installer | Release notes |
|---------|----------|-----------|---------------|
| **1.5.0** | **Raqim Web** | `Nassila Setup 1.5.0.exe` | [v1.5.0-RELEASE_NOTES.md](./v1.5.0-RELEASE_NOTES.md) |
| **1.4.0** | **Raqim Statute** | `Nassila Setup 1.4.0.exe` | [v1.4.0-RELEASE_NOTES.md](./v1.4.0-RELEASE_NOTES.md) |
| **1.3.1** | **Maktab OCR hardening** | `Nassila Setup 1.3.1.exe` | See [CHANGELOG.md](../CHANGELOG.md) — notes file not archived here |
| **1.3.0** | **Ouroboros train** | `Nassila Setup 1.3.0.exe` | See [CHANGELOG.md](../CHANGELOG.md) — notes file not archived here |
| **1.2.1** | **Masdar UX** | `Nassila Setup 1.2.1.exe` | [v1.2.1-RELEASE_NOTES.md](./v1.2.1-RELEASE_NOTES.md) · **on GitHub** |
| **1.2.0** | **Masdar-lite** | `Nassila Setup 1.2.0.exe` | [v1.2.0-RELEASE_NOTES.md](./v1.2.0-RELEASE_NOTES.md) · **on GitHub** |
| **1.1.3** | **Polish** | `Nassila Setup 1.1.3.exe` | [v1.1.3-RELEASE_NOTES.md](./v1.1.3-RELEASE_NOTES.md) |
| **1.1.2** | **Raqim Bridge** | `Nassila Setup 1.1.2.exe` | [v1.1.2-RELEASE_NOTES.md](./v1.1.2-RELEASE_NOTES.md) |
| **1.1.1** | **Bibliography-first** | `Nassila Setup 1.1.1.exe` | [v1.1.1-RELEASE_NOTES.md](./v1.1.1-RELEASE_NOTES.md) |
| **1.1.0** | **Sanad** | `Nassila Setup 1.1.0.exe` | [v1.1.0-RELEASE_NOTES.md](./v1.1.0-RELEASE_NOTES.md) |

**Planned (see NassilaT [`OUROBOROS_OPERATOR_MAP.md`](https://github.com/jamalesam93/NassilaT/blob/main/training/OUROBOROS_OPERATOR_MAP.md) § App release train):** 1.6.0 Maktab Loop (OCR fixtures, one-upload loop, Masdar chunking) → 1.7.0 Integrity Bundle → 1.8.0 Shahid; ∥ NassilaT field-note/Tier 3 data curation; S15 parked

**Latest:** use **1.5.0**. Older installers are for release history.

## Create GitHub release (1.5.0)

```bash
npm run build:win
gh release create v1.5.0 "dist/Nassila Setup 1.5.0.exe" --title "v1.5.0 — Raqim Web" --latest --notes-file release-notes/v1.5.0-RELEASE_NOTES.md
```

**Note:** This folder is local build output — do not commit `.exe` files to git.

For every published installer, generate and publish its SHA-256 digest alongside the release asset (for example, `Get-FileHash -Algorithm SHA256 "dist\Nassila Setup 1.5.0.exe"` on Windows).
