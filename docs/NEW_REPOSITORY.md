# Starting a fresh Git repository (Nassila 1.0.0)

Use this when you want **no shared history** with the old project name or remote. The codebase is already Nassila-only; these steps create a single clean initial commit.

## Before you start

1. Back up anything you need from the old GitHub repo (issues, wiki, release assets).
2. Decide whether to **rename** the existing GitHub repo or create a new one (e.g. `Nassila`).
3. Do **not** commit `node_modules/`, `dist/`, or local env files.

## Option A — New folder + new remote (safest)

```powershell
# From parent directory
Copy-Item -Recurse "citations-style" "nassila"
cd nassila
Remove-Item -Recurse -Force .git
git init
git add -A
git status   # confirm no .venv / node_modules / dist
git commit -m "Initial commit: Nassila 1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USER/Nassila.git
git push -u origin main
```

## Option B — Orphan branch in place (same folder)

```powershell
cd "E:\Cursor Projects\citations-style"
git checkout --orphan nassila-1.0.0
git add -A
git status
git commit -m "Initial commit: Nassila 1.0.0"
git branch -D main   # only if you intend to replace main
git branch -M main
git push -f origin main   # only after you are sure; overwrites remote history
```

## After push

- Create a **1.0.0** GitHub release and attach `Nassila Setup 1.0.0.exe` from `npm run dist`.
- Update `README.md` download link to your new `.../releases/latest` URL.
- Archive or delete the old remote if you no longer need it.

## Versioning from here

| Milestone | Version |
|-----------|---------|
| Initial release | **1.0.0** |
| App L3 repair + retry shipped | 1.1.0 |
| First QLoRA adapter in LM Studio | 1.2.0 (or train pack `nassila-grounding-e4b-v1`) |
