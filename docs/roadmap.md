# Development Roadmap

Eleven phases. Each is independently reviewable, mergeable, and deployable. **One phase per
working block, with a stop-and-review checkpoint at the end.** No phase is attempted in a
single operation.

**Current phase: 2 — Design system.**

Live: https://portfolio-ten-theta-d09qbq67e8.vercel.app

The ordering is deliberate: **a live, deployed public site exists at the end of Phase 5**,
before the database, authentication, or CMS. The read façade (`src/server/queries/`) is what
makes that safe rather than throwaway — Phase 6 swaps its internals to Prisma without
touching a single component.

---

## Phase 1 — Foundation

Repository that builds, deploys, and explains itself. No features.

- [x] Git identity configured
- [x] `.gitattributes` (LF normalization) committed before anything else
- [x] Next.js scaffold — TypeScript, Tailwind, App Router, ESLint, `src/`, `@/*` alias
- [x] Strict TypeScript (`noUncheckedIndexedAccess`), Prettier, npm scripts
- [x] `.gitignore` fixed so `.env.example` is committed
- [x] Directory skeleton
- [x] `CLAUDE.md`, `README.md`, `docs/`, ADRs 0001–0004
- [x] `.env.example`
- [x] Verify: typecheck, lint, build all clean
- [x] First commit and push to `origin/main`
- [x] Connect Vercel, confirm live URL

**Phase 1 complete.** Two findings worth carrying forward: this is Next.js **16**, not 15
(the caching model changed — re-check assumptions in Phase 6), and `npm run typecheck` must
run `next typegen` first or it fails on a fresh clone. Both are documented in `CLAUDE.md`.

## Phase 2 — Design system

Visual identity and layout shell. **Timeboxed** — this is where portfolio projects stall.

- [ ] Design tokens as CSS custom properties: color, type scale, spacing, radii
- [ ] Typeface selection (one pair, restrained)
- [ ] Dark mode via tokens
- [ ] `components/ui/` primitives: Button, Card, Badge, Link
- [ ] `components/layout/`: Header, Footer, Container, SkipLink
- [ ] Responsive breakpoints, accessibility baseline (focus states, contrast)

## Phase 3 — Content contracts

Types and real content. Still no database.

- [ ] TypeScript types for every entity in `src/types/`
- [ ] Zod schemas in `src/lib/validation/`
- [ ] Typed content modules in `src/content/` with **real** data
- [ ] `src/server/queries/` façade ← **the seam Phase 6 depends on**

## Phase 4 — Public portfolio

- [ ] Home
- [ ] About (includes the services pointer)
- [ ] Experience — technical / professional split driven by `Experience.kind`
- [ ] Projects index with tag filtering
- [ ] Project detail `[slug]` — the pages that actually earn interviews
- [ ] Resume
- [ ] Contact (static; form arrives in Phase 9)

## Phase 5 — SEO, accessibility, performance

- [ ] Per-page metadata; Open Graph image generation
- [ ] `sitemap.ts`, `robots.ts`, JSON-LD Person schema
- [ ] `next/image` throughout
- [ ] Lighthouse ≥ 95; axe audit; full keyboard navigation pass

> **Milestone: live portfolio deployed.** Everything after this point is the CMS. If
> momentum ever stops here, the result is still a finished, deployed portfolio.

## Phase 6 — Database

- [ ] Neon project; pooled + direct connection strings
- [ ] `prisma/schema.prisma` mirroring the Phase 3 types
- [ ] First migration
- [ ] `prisma/seed.ts` importing `src/content/*`
- [ ] **Swap query façade internals to Prisma — components untouched**
- [ ] Prisma singleton (`lib/db.ts`), hot-reload safe
- [ ] Cache invalidation strategy (this is Next 16; read the bundled docs first)

## Phase 7 — Authentication

- [ ] Auth.js v5, Credentials provider, argon2id
- [ ] `scripts/create-admin.ts` — no HTTP registration route, ever
- [ ] `/login` page
- [ ] Three enforcement layers: middleware, page/layout `auth()`, **and inside every action**
- [ ] Verify each layer independently

## Phase 8 — Admin CMS

- [ ] Admin shell and navigation
- [ ] CRUD for Project, Experience, Education, Skill, Profile
- [ ] Server Actions: auth check → Zod parse → mutate
- [ ] Draft/publish toggle; sort ordering
- [ ] Revalidation on save

## Phase 9 — Media and contact

- [ ] Vercel Blob; project image upload
- [ ] Resume upload and `ResumeVersion`
- [ ] Contact form → Resend + `ContactMessage`
- [ ] Spam protection and rate limiting

## Phase 10 — Testing and hardening

- [ ] Vitest units (validation, query façade)
- [ ] Playwright e2e: login, and create → publish → appears publicly
- [ ] GitHub Actions CI; branch protection on `main`
- [ ] Rate limiting, security headers, CSP
- [ ] Dependency audit

## Phase 11 — Production

- [ ] Production environment variables and database
- [ ] Migration flow in the build step
- [ ] Error monitoring, analytics
- [ ] Custom domain and DNS — **low priority, genuinely last**

## Phase 12+ — Services and referral _(future, separate planning session)_

- [ ] `(services)` route group and pages
- [ ] Services CMS module
- [ ] `/r/[slug]` redirect
- [ ] Referral links as data
- [ ] Optional click tracking (hashed IP, no cookies)

---

## Checkpoint protocol

After every meaningful task: verify the result → run typecheck, lint, build, tests →
inspect for errors → summarize what changed → explain notable decisions → state the next
task → **stop at phase boundaries for approval**.
