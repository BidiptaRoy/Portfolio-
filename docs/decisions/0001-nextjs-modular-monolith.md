# 0001 — Next.js modular monolith, not a split frontend/backend

- **Status:** Accepted
- **Date:** 2026-08-21

## Context

The site must serve a public portfolio and, later, an authenticated admin CMS. The author's
existing experience is React SPA + Express + MongoDB. The project must stay maintainable and
comprehensible for years, largely by one person working with AI assistance.

## Options considered

1. **React (Vite) SPA + separate Express API.** Familiar. But an SPA ships an empty HTML
   shell — bad for the SEO of a page whose entire purpose is being found by recruiters, and
   bad for first paint. A split also costs two deploys, two dependency trees, CORS,
   duplicated types, and an auth token dance — permanently, in exchange for scaling
   properties this project will never need.
2. **Next.js modular monolith.** Server rendering, file-based routing, image optimization,
   metadata generation, and a backend in one tool. Server Actions and Route Handlers are the
   backend; they run on the server, hold secrets, and share types with the UI for free.
3. **Astro or plain static site.** Excellent for the public half, but the admin CMS is a
   core requirement, and Astro would mean adding a separate application to serve it.

## Decision

Next.js 16, App Router, TypeScript strict, as a modular monolith. One application, one
deployment, internally partitioned by domain module.

## Consequences

- Real conceptual learning curve: Server vs. Client Components, and the caching model.
  Accepted — the caching model in particular is worth fighting with once.
- Coupling to Next.js and, to a lesser degree, Vercel. Mitigated by keeping `src/server/`
  as plain TypeScript with no framework dependency; a port would mean rewriting routing and
  rendering, not business logic.
- Next 16 differs meaningfully from most training data. The installed package ships docs at
  `node_modules/next/dist/docs/`; read them rather than writing Next code from memory.
- If a genuine second consumer (e.g. a mobile app) ever appears, `src/server/` is isolated
  enough to expose over HTTP at that point.
