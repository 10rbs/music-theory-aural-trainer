---
name: ship-milestone
description: End-to-end workflow for shipping a feature/milestone in this repo — branch, build core-first, test, browser-verify, update docs, open a PR. Use when starting or finishing a milestone, or when asked to "ship" a change.
---

# Ship a milestone

Follow this sequence. Don't skip verification steps — every merged PR so far has been browser-verified before push.

## 1. Start clean

```bash
git checkout main && git pull --ff-only
git checkout -b <milestone-branch>   # e.g. m5-dictation
```

Confirm the previous PR actually merged before branching (`gh pr list`) — branching
off a stale main has bitten us before (PR #5).

## 2. Build core-first (non-negotiable order)

1. Pure logic in `src/core/` — no React/DOM/Web Audio/IndexedDB/`Date.now()` imports.
   Dates, "now", and randomness are passed in (seeded RNG from `core/exercises/random.ts`).
2. Vitest tests for that logic BEFORE any UI. Colocate as `*.test.ts`.
3. Thin side-effect adapters in `src/shell/` only if a new effect is needed.
4. React UI in `src/features/` + route wiring in `src/routes/`.

## 3. Gate before commit

```bash
npm run test     # all green, no skips
npm run lint
npm run build    # vite build && tsc -b (order matters: build generates routeTree.gen.ts)
```

Node comes from nvm: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"` in non-login shells.

## 4. Browser-verify

Start the dev server via `.claude/launch.json` ("dev", port 5173) and exercise the
actual feature at `http://localhost:5173/music-theory-aural-trainer/...`:
- happy path AND failure path (wrong answer, denied permission, etc.)
- persistence across reload where relevant
- zero console errors

Things the sandbox cannot verify — list them in the PR for Brian: audible audio
quality, real-microphone input, mobile/iOS behavior.

## 5. Docs + PR

- Update the milestone row in `docs/ROADMAP.md` (⬜ → ✅, adjust contents to what shipped).
- Commit with a body listing what changed; push; `gh pr create` with a **Test plan**
  section separating verified items ([x]) from items left for Brian ([ ]).
- Brian merges PRs himself unless he says otherwise. After merge: confirm the
  Pages deploy workflow succeeded and spot-check the live URL
  (https://10rbs.github.io/music-theory-aural-trainer/).
