# Architecture — Code Tour

## How a Request Flows Through the System

Every HTTP request to `sricharanchowdary.workers.dev` hits a single Cloudflare Worker. Cloudflare's edge network receives the request, then invokes the Worker's `fetch` handler defined in `src/worker.ts`. The handler matches routes in sequence, with fallback to Astro's pre-rendered static assets:

```
Browser → Cloudflare Edge → Worker fetch()
                               │
                               ├── POST /api/resume-chat ──► Workers AI (Llama 3.2 3B Streaming)
                               ├── POST /api/contact    ──► D1 Database + Resend Email
                               ├── GET  /api/weather    ──► OpenWeatherMap (5s timeout + fallback)
                               ├── GET  /api/posts/*    ──► In-memory site data
                               └── (all other routes)   ──► env.ASSETS (Static HTML/CSS/JS)
```

## File-by-File Guide

### AI & Data Grounding

| File | Purpose |
|---|---|
| [`src/data/resume.ts`](./src/data/resume.ts) | Canonical source of truth for the AI chatbot. Contains `RESUME_TEXT` (markdown CV text) and `RESUME_SYSTEM_PROMPT` with strict grounding rules (refusing salary/personal queries, hallucination prevention, length limits). |
| [`src/data/posts.ts`](./src/data/posts.ts) | Standalone array of blog post definitions. Decoupled from `import.meta.env` so it safely loads in the Worker runtime. |
| [`src/data/site.ts`](./src/data/site.ts) | Site metadata, navigation items, and project summaries used by Astro pages and layouts. |

### Core Worker & Logic

| File | Purpose |
|---|---|
| [`src/worker.ts`](./src/worker.ts) | Single entry point (`export default { fetch }`). Implements route matching, SSE streaming for `/api/resume-chat`, admin authentication via HMAC session cookies, D1 persistence, and graceful error handling. |
| [`src/lib/contact.ts`](./src/lib/contact.ts) | Shared validation logic (`validateContactInput`) with honeypot spam protection, and `jsonResponse()` utility helper. |
| [`wrangler.jsonc`](./wrangler.jsonc) | Worker deployment configuration, defining the `AI`, `DB`, and `ASSETS` bindings and compatibility flags. |

### Testing & Evaluation Harness

| File | Purpose |
|---|---|
| [`tests/evals.test.ts`](./tests/evals.test.ts) | **LLM Evaluation Harness.** Runs 20 automated tests validating factual accuracy, refusal of salary inquiries, hallucination prevention, privacy constraints, and API boundaries. |
| [`tests/worker.test.ts`](./tests/worker.test.ts) | Integration tests for the Worker's contact endpoint, admin routes, and static asset fallback. |
| [`tests/contact.test.ts`](./tests/contact.test.ts) | Unit tests for form input validation rules and edge cases. |

### Frontend & Static Pages (Astro)

| Directory | Purpose |
|---|---|
| `src/pages/` | Pre-rendered pages (`index.astro`, `about.astro`, `contact.astro`, `404.astro`, `rss.xml.ts`). |
| `src/pages/admin/` | Admin panel (`login.astro`, `index.astro`) to review and soft-delete contact submissions. |
| `src/pages/blog/` | Blog post markdown articles and listing. |
| `src/pages/projects/` | Project deep dives and case studies. |

## Complete API Route Map

| Method | Path | Auth | Backend / Source | Status Codes | Description |
|---|---|---|---|---|---|
| `POST` | `/api/resume-chat` | None | Workers AI (`llama-3.2-3b`) | 200 (SSE), 400, 405, 502 | Streams AI answers grounded strictly in resume context. |
| `POST` | `/api/contact` | None | D1 DB + Resend | 200, 400, 405 | Validates & stores contact submissions; sends email. |
| `POST` | `/api/admin/login` | Password | HMAC Session Cookie | 200, 400, 401, 405 | Issues signed session cookie for admin dashboard. |
| `POST` | `/api/admin/logout` | None | Set-Cookie Clear | 200 | Clears session cookie. |
| `GET` | `/api/admin/submissions` | Cookie | D1 DB | 200, 401 | Fetches active submissions (soft-delete filtered). |
| `DELETE` | `/api/admin/submissions/:id` | Cookie | D1 DB | 200, 401 | Soft deletes submission (`is_deleted = 1`). |
| `GET` | `/api/posts` | None | In-memory (`posts.ts`) | 200 | Returns JSON list of all blog posts. |
| `GET` | `/api/posts/:slug` | None | In-memory (`posts.ts`) | 200, 400, 404 | Returns single post by slug identifier. |
| `GET` | `/api/weather` | None | OpenWeatherMap | 200, 500, 502 | Returns Hyderabad weather with 5s timeout & fallback. |
| `*` | `*` | None | Workers Assets (`./dist`) | 200 / 404 | Serves static site assets. |

## Key Design Patterns

1. **Prompt-Grounded LLM Streaming**: The `/api/resume-chat` handler streams tokens via Server-Sent Events (`text/event-stream`), cutting latency while strictly bounding model output via a comprehensive system prompt.
2. **Automated Evaluation Harness**: Standard Vitest assertions and regex patterns provide continuous regression testing for AI behavior without requiring external LLM evaluation APIs.
3. **Decoupled Data Modules**: Isomorphic files (like `posts.ts` and `resume.ts`) contain zero environment-specific globals, allowing clean execution across both Astro static build-time and the Cloudflare Worker runtime.
