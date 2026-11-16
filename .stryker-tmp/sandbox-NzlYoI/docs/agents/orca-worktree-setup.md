# Orca worktree setup — detail

Skeleton lives in `AGENTS.md`. Orca runs the repo's setup script with `cmd.exe` on Windows, one line at a time, and stops at the first line that exits non-zero. The script installs packages, restores `public/mockServiceWorker.js` (msw's install script rewrites its line endings), and copies the untracked `.env.local` from the main clone; skills are global (`~/.agents/skills`, `~/.claude/skills`), so nothing else is copied:

```bat
pnpm install --frozen-lockfile
git checkout -- public/mockServiceWorker.js
copy /Y "%ORCA_ROOT_PATH%\.env.local" .env.local
```

Orca sets `ORCA_ROOT_PATH` (the main clone) and `ORCA_WORKTREE_PATH` while the setup script runs, so the script has no machine-specific path.

The install takes about 4 minutes per worktree on Windows, even when every package comes from pnpm's store.
