# Portfolio — Bidipta Roy

The personal portfolio and professional site of Bidipta Roy, Computer Science at Boston
University.

Built as a full-stack application rather than a static site, so that portfolio content —
projects, experience, education, skills — can eventually be managed as **data through an
admin dashboard** instead of by editing source files.

**Live:** https://bidiptaroy.com

**Status:** Phase 2 of 11 — design system. See [`docs/roadmap.md`](docs/roadmap.md).

## Stack

|           |                                                         |
| --------- | ------------------------------------------------------- |
| Framework | Next.js 16 (App Router, React 19, TypeScript strict)    |
| Styling   | Tailwind CSS v4, design tokens as CSS custom properties |
| Database  | Postgres (Neon) via Prisma — _Phase 6_                  |
| Auth      | Auth.js v5, single admin — _Phase 7_                    |
| Testing   | Vitest + Playwright — _Phase 10_                        |
| Hosting   | Vercel                                                  |

Why each of these was chosen, and what was rejected, is in
[`docs/architecture.md`](docs/architecture.md) and [`docs/decisions/`](docs/decisions/).

## Getting started

```bash
npm install
cp .env.example .env.local     # PowerShell: Copy-Item .env.example .env.local
npm run dev                    # http://localhost:3000
```

Node 20+ required (developed on Node 24).

## Scripts

```bash
npm run dev           # dev server (Turbopack)
npm run build         # production build
npm start             # serve a production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run format        # Prettier
```

## Project documentation

- [`CLAUDE.md`](CLAUDE.md) — engineering instructions and conventions (for humans and AI agents)
- [`docs/architecture.md`](docs/architecture.md) — architecture and rationale
- [`docs/content-model.md`](docs/content-model.md) — content entities
- [`docs/roadmap.md`](docs/roadmap.md) — phased development plan and current status
- [`docs/decisions/`](docs/decisions/) — architecture decision records

## License

All rights reserved. This is a personal site; the content is not for reuse.
