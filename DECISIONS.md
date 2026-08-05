# Decisions and Reflection

## Key Decisions

I kept the project as an Astro static site instead of using a heavier app framework. The content does not need client-side routing or server rendering, and Astro makes Markdown posts, static pages, and fast builds straightforward.

For Cloudflare, I used Workers Static Assets with a custom Worker in `src/worker.ts`. This keeps the assignment requirement of one Worker project serving both static files and dynamic `/api/*` routes, while avoiding unnecessary server-rendering complexity. The contact form is the only dynamic feature.

The contact backend validates input on both sides. The browser gives immediate feedback, and the Worker performs the real validation before storing data. D1 support is included through a `DB` binding and a migration file; until the real Cloudflare database ID is available, the config documents the binding that must be added.

## What I Cut

I cut search, comments, authentication, a CMS, a guestbook, and automatic OG image generation. Those features would add complexity but not much value for a two-post portfolio. I focused on the required lifecycle: plan, design, build, test, deploy automation, and documentation.

## AI Usage

AI helped interpret the assignment document, identify missing requirements, scaffold implementation details, write validation tests, and clean documentation. Personal content, project claims, repository links, and public contact details still need Sri Charan's review so the final submission is accurate and in his voice.

## Accessibility Check

I verified the code for semantic structure, labels, keyboard-focus styles, skip link, dark-mode behavior, and contrast-oriented colors. A final pass with Lighthouse or axe should be run against the deployed URL before submission.

## What's Next

Before final submission, add the final public URLs and email address, create and bind the D1 database, add the Cloudflare Web Analytics token, and deploy through GitHub Actions. In v2, I would add automatic OG image generation per post, post-deploy smoke tests, and a small analytics or contact-submission monitoring workflow.
## Auth Mechanism — Extension 1

Chose a **session cookie** (HMAC-SHA256 signed, HttpOnly) over JWT because:
- Single admin user — no need for stateless multi-client tokens
- Simpler to implement and audit
- HttpOnly prevents JS access, reducing XSS risk

## At 10,000+ entries

Would switch from `SELECT *` with `is_deleted = 0` to:
- Add pagination (`LIMIT`/`OFFSET` or cursor-based)
- Add an index on `submitted_at` for faster sorting
- Consider archiving old soft-deleted rows to a separate tables
## Extension 1 — Auth Mechanism

Chose **session cookie (HMAC-SHA256)** over JWT because:
- Single admin user — no need for stateless multi-client tokens
- Simpler to implement and audit
- HttpOnly flag prevents JS access, reducing XSS risk

## Extension 1 — Scaling to 10,000+ entries

Current approach works fine at low volume. At scale would:
- Add `LIMIT`/`OFFSET` pagination on the admin list
- Add an index on `submitted_at` for faster sorting
- Archive soft-deleted rows to a separate table periodically