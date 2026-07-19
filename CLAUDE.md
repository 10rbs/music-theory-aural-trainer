# Aural Trainer

Music theory / aural skills / daily practice PWA. React + Vite + TS, TanStack
Router, local-first (no backend), deployed to GitHub Pages.

**Read before making changes:**

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — functional core / imperative
  shell rules (the `core/` purity rule is enforced, not aspirational), exercise
  contract, storage schema, audio patterns, base-path trifecta.
- [docs/ROADMAP.md](docs/ROADMAP.md) — milestone status and what's rubric-gated.
- [docs/PLAN.md](docs/PLAN.md) — the full approved plan (context for why).

## Commands

```bash
npm run dev        # dev server (port 5173)
npm run build      # vite build && tsc -b  (order matters: build generates routeTree.gen.ts first)
npm run test       # vitest
npm run lint       # oxlint
```

Node is installed via nvm — in non-login shells run
`export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"` first.

## Project skills (.claude/skills/)

- `/ship-milestone` — branch → core-first build → gates → browser-verify → PR.
  Use for any feature work.
- `/add-exercise` — adding drill types to the exercise registry (the M5+ path).
- `/change-storage` — REQUIRED reading before touching persisted data or
  src/shell/storage; covers schema migrations and backup compatibility.
- `/verify` — per-surface verification checklist + what only Brian can test.

## Conventions

- Domain logic goes in `src/core/` as pure functions with Vitest tests *before*
  any UI is written. Core never imports React/DOM/shell.
- "Today"/"now"/randomness are passed into core as arguments (seeded RNG).
- Attempts are append-only; never mutate stored aggregates.
- Runtime dependencies are minimal by policy — justify additions in
  docs/ARCHITECTURE.md.
- The old vanilla app is archived at git tag `v0-vanilla`.
