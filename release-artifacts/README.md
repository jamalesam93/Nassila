# Nassila Windows installers (v1.1.0 – v2.1.1)

Built on this machine for [GitHub Releases](https://github.com/jamalesam93/Nassila/releases).

| Version | Codename | Installer | Release notes |
|---------|----------|-----------|---------------|
| **2.1.1** | **Arabic OCR fidelity** | `Nassila Setup 2.1.1.exe` (cut on publish) | [v2.1.1-RELEASE_NOTES.md](./v2.1.1-RELEASE_NOTES.md) |
| **2.1.0** | **Maktab Arabic** | `Nassila Setup 2.1.0.exe` | [v2.1.0-RELEASE_NOTES.md](./v2.1.0-RELEASE_NOTES.md) |
| **2.0.0** | **MaktabOCR + Shahid** | `Nassila Setup 2.0.0.exe` | [v2.0.0-RELEASE_NOTES.md](./v2.0.0-RELEASE_NOTES.md) |
| **1.10.1** | **Packaged network parity** | `Nassila Setup 1.10.1.exe` | [v1.10.1-RELEASE_NOTES.md](./v1.10.1-RELEASE_NOTES.md) |
| **1.10.0** | **Masdar Papers** | `Nassila Setup 1.10.0.exe` | [v1.10.0-RELEASE_NOTES.md](./v1.10.0-RELEASE_NOTES.md) |
| **1.8.0** | **Sanad 9B** | `Nassila Setup 1.8.0.exe` | [v1.8.0-RELEASE_NOTES.md](./v1.8.0-RELEASE_NOTES.md) |
| **1.7.0** | **Integrity Bundle** | `Nassila Setup 1.7.0.exe` | [v1.7.0-RELEASE_NOTES.md](./v1.7.0-RELEASE_NOTES.md) |
| **1.6.0** | **Maktab Loop** | `Nassila Setup 1.6.0.exe` | [v1.6.0-RELEASE_NOTES.md](./v1.6.0-RELEASE_NOTES.md) |
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

**Next (see [`docs/Nassila-Ouroboros-Future.md`](../docs/Nassila-Ouroboros-Future.md) §5):** 2.2.0 **Sanad Arabic** (paused for budget). Sanad **FT-6** (v119) is the sole published Hub tier (S15/S14 retired).

**Latest:** use **2.1.1**. The 2.1.0 installer remains the last attached binary until `build:win` is run for this patch. Older installers are for release history.

## Create GitHub release (2.1.1)

```bash
npm run build:win
gh release create v2.1.1 "dist/Nassila Setup 2.1.1.exe" --title "v2.1.1 — Arabic OCR fidelity" --latest --notes-file release-artifacts/v2.1.1-RELEASE_NOTES.md
```

**Note:** This folder is local build output — do not commit `.exe` files to git.

For every published installer, generate and publish its SHA-256 digest alongside the release asset (for example, `Get-FileHash -Algorithm SHA256 "dist\Nassila Setup 2.0.0.exe"` on Windows).
