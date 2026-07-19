# Aural Trainer

A local-first music theory / aural skills / daily practice PWA: interval, chord,
and scale recognition drills, with a chromatic tuner, metronome, and daily scale
practice routines on the roadmap.

React + Vite + TypeScript, TanStack Router. No backend — all progress lives in
the browser. Deployed to [GitHub Pages](https://10rbs.github.io/music-theory-aural-trainer/).

> The original dependency-free vanilla-JS version is archived at git tag
> `v0-vanilla`.

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:5173/music-theory-aural-trainer/
npm run test       # vitest
npm run build      # production build (vite build && tsc -b)
npm run lint       # oxlint
```

Or with Docker:

```bash
docker compose up          # dev server on port 5173
docker build -t aural .    # production image (nginx serving static build)
```

## Docs

- [docs/ROADMAP.md](docs/ROADMAP.md) — milestones and status
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — functional core / imperative
  shell rules, exercise contract, storage design
- [docs/PLAN.md](docs/PLAN.md) — the full project plan
