# Architecture — Code Tour

## How a Request Flows Through the System

Every HTTP request to `sricharanchowdary.workers.dev` hits a single Cloudflare Worker. Cloudflare's edge network receives the request, then invokes the Worker's `fetch` handler defined in `src/worker.ts`. The handler is a linear chain of `if` blocks — first match wins — with a static-assets fallback at the bottom.

```
Browser → Cloudflare Edge → Worker fetch() → route match → response
                                             ↓ (no match)
                                         ASSETS.fetch() → static file
```

## File-by-File Guide

### Configuration

| File | Purpose |
|---|---|
| [`wrangler.jsonc`](./wrangler.jsonc) | Cloudflare Worker config. Declares the entry point (`src/worker.ts`), the assets directory (`./dist`), and all bindings: `ASSETS` (static files), `DB` (D1), `AI` (Workers AI). Secrets (`WEATHER_API_KEY`, `RESEND_API_KEY`, etc.) are added via `wrangler secret put` and never appear here. |
| [`astro.config.mjs`](./astro.config.mjs) | Astro build config. Outputs static HTML/CSS/JS to `./dist`. |
| [`package.json`](./package.json) | Scripts: `dev`, `build`, `test`, `deploy`. Dependencies: Astro, Tailwind, Vitest, Wrangler. |
| [`vitest.config.ts`](./vitest.config.ts) | Test runner config. Node environment, V8 coverage. |
| [`.dev.vars`](./.dev.vars) | Local-only secret overrides (gitignored). Used by `wrangler dev` as env vars. |

### Source Code

| File | Purpose |
|---|---|
| [`src/worker.ts`](./src/worker.ts) | **The core.** Single `export default { fetch() }` handler. Contains all API route logic, auth helpers (`createSessionToken`, `isAuthenticated`), input sanitization, and the external weather API integration. ~315 lines. |
| [`src/lib/contact.ts`](./src/lib/contact.ts) | Shared library. Exports `validateContactInput()` (field-level validation with honeypot check) and `jsonResponse()` (convenience wrapper for JSON responses with correct headers). Used by both the Worker and unit tests. |
| [`src/data/site.ts`](./src/data/site.ts) | Static data module. Exports `site` (metadata), `navItems`, `projects` (3 project objects with slug/title/summary/tech), and `posts` (2 blog post objects). Imported by Worker for the `/api/posts` endpoints and by Astro pages for rendering. |
| [`src/env.d.ts`](./src/env.d.ts) | TypeScript ambient declarations. Extends the Astro `App.Locals` type with the Cloudflare runtime environment. |

### Pages (Astro)

| Directory | Contents |
|---|---|
| `src/pages/` | Astro page components: `index.astro`, `about.astro`, `contact.astro`, `404.astro`, `rss.xml.ts` |
| `src/pages/blog/` | Blog post pages |
| `src/pages/projects/` | Project detail pages |
| `src/pages/admin/` | Admin panel for viewing/deleting contact submissions |
| `src/layouts/` | Shared layout components |
| `src/styles/` | Global CSS (Tailwind v4) |
| `src/assets/` | Images, fonts, static media |

### Tests

| File | Purpose |
|---|---|
| [`tests/worker.test.ts`](./tests/worker.test.ts) | Integration tests for the Worker `fetch` handler. Tests contact validation, email sending, static asset fallback, method enforcement, and JSON parsing. |
| [`tests/contact.test.ts`](./tests/contact.test.ts) | Unit tests for `validateContactInput()`. |
| [`src/lib/contact.test.ts`](./src/lib/contact.test.ts) | Co-located unit tests for the contact library. |

### Infrastructure

| File / Directory | Purpose |
|---|---|
| `migrations/` | D1 SQL migration files (e.g., `0001_contact_submissions.sql`). |
| `scripts/` | Push helpers (`push.sh`, `push.ps1`). |
| `.github/` | GitHub Actions CI/CD workflows. |

## API Route Map

All routes are defined in `src/worker.ts` and evaluated top-to-bottom:

| Method | Path | Auth | Data Source | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/contact` | None | D1 + Resend | 200, 400, 405 |
| `POST` | `/api/admin/login` | Password | Env secret | 200, 400, 401, 405 |
| `POST` | `/api/admin/logout` | None | — | 200 |
| `GET` | `/api/admin/submissions` | Session cookie | D1 | 200, 401 |
| `DELETE` | `/api/admin/submissions/:id` | Session cookie | D1 | 200, 401 |
| `POST` | `/api/chat` | None | Workers AI | 200, 400, 405, 500 |
| `GET` | `/api/posts` | None | In-memory | 200 |
| `GET` | `/api/posts/:slug` | None | In-memory | 200, 400, 404 |
| `GET` | `/api/weather` | None | OpenWeatherMap | 200, 500, 502 |
| `*` | `*` | None | ASSETS binding | Varies |

## Key Design Patterns

1. **Single-file router**: No framework — just `if` statements on `url.pathname`. Simple, auditable, zero dependencies.
2. **Shared `jsonResponse()` helper**: Consistent `Content-Type`, `Cache-Control: no-store`, and status codes across all API routes.
3. **Fail-safe external calls**: The weather endpoint wraps `fetch` in an `AbortController` with a 5-second timeout and always returns a valid JSON shape — even on failure — so the frontend never crashes.
4. **Secrets via Wrangler**: API keys are stored as encrypted Wrangler secrets, surfaced as `env.*` at runtime. `.dev.vars` provides local overrides (gitignored).
5. **Graceful degradation**: Every external dependency (Resend, OpenWeatherMap, Workers AI) is guarded with `if (!env.KEY)` checks. The Worker always returns a response.
