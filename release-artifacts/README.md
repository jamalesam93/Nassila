# Nassila Windows installers (v1.1.0 – v1.1.2)

Built on this machine for [GitHub Releases](https://github.com/jamalesam93/Nassila/releases).

| Version | Installer | Commit | Release notes |
|---------|-----------|--------|---------------|
| **1.1.0** | `Nassila Setup 1.1.0.exe` | `f9c4ff5` | [v1.1.0-RELEASE_NOTES.md](./v1.1.0-RELEASE_NOTES.md) |
| **1.1.1** | `Nassila Setup 1.1.1.exe` | `977442a` | [v1.1.1-RELEASE_NOTES.md](./v1.1.1-RELEASE_NOTES.md) |
| **1.1.2** | `Nassila Setup 1.1.2.exe` | `3a7af75`+ | [v1.1.2-RELEASE_NOTES.md](./v1.1.2-RELEASE_NOTES.md) · **on GitHub** |

**Latest:** use **1.1.2**. Older installers are for release history and documentation; upgrading from **1.0.1** directly to **1.1.2** is fine.

## Create GitHub releases

1. Push tags (once): `git push origin v1.1.0 v1.1.1 v1.1.2`
2. On GitHub → **Releases** → **Draft a new release** for each tag.
3. Attach the matching `.exe` and paste the corresponding `RELEASE_NOTES.md` body.

Or with [GitHub CLI](https://cli.github.com/) after `gh auth login`:

```bash
gh release create v1.1.0 "release-artifacts/Nassila Setup 1.1.0.exe" --title "v1.1.0" --notes-file release-artifacts/v1.1.0-RELEASE_NOTES.md
gh release create v1.1.1 "release-artifacts/Nassila Setup 1.1.1.exe" --title "v1.1.1" --notes-file release-artifacts/v1.1.1-RELEASE_NOTES.md
gh release create v1.1.2 "release-artifacts/Nassila Setup 1.1.2.exe" --title "v1.1.2" --latest --notes-file release-artifacts/v1.1.2-RELEASE_NOTES.md
```

**Note:** This folder is local build output — do not commit `.exe` files to git.
