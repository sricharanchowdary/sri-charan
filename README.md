# Sri Charan Portfolio

![CI](https://github.com/sricharanchowdary/sri-charan/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/sricharanchowdary/sri-charan/actions/workflows/deploy.yml/badge.svg)

Live site: https://sricharanchowdary.sricharanchowdary2005.workers.dev
Repository: [sricharanchowdary/sri-charan](https://github.com/sricharanchowdary/sri-charan)
## Stack

- Astro for static pages and Markdown blog posts.
- Tailwind CSS v4 through PostCSS for styling.
- Cloudflare Workers Static Assets for hosting.
- A single Worker in `src/worker.ts` for `/api/contact` and static asset serving.
- Vitest for contact validation tests.
- GitHub Actions for CI and deployment.

## Local Setup

```sh
npm install
npm run dev
```

Quick push helper

Two helper scripts are included to initialize, commit, and push to GitHub:

- POSIX (macOS / Linux / WSL):

```bash
sh ./scripts/push.sh "commit message"
```

- PowerShell (Windows):

```powershell
pwsh ./scripts/push.ps1 -Message "commit message"
```

These scripts will create a `main` branch, add `origin` if missing, and push the repo.

Production build:

```sh
npm run check
npm test
npm run build
```

Cloudflare local preview after building:

```sh
npx wrangler dev --local --port 8787
```

## Contact Form

The form posts JSON to `/api/contact`. The Worker validates name, email, message length, and a hidden honeypot field. If a D1 binding named `DB` exists, submissions are stored in `contact_submissions`; otherwise the Worker still returns success and logs a safe summary.

Create the D1 database:

```sh
wrangler d1 create portfolio
wrangler d1 execute portfolio --file migrations/0001_contact_submissions.sql
```

Then add the returned `database_id` to `wrangler.jsonc`.

## Cloudflare Web Analytics

Set `PUBLIC_CF_WEB_ANALYTICS_TOKEN` in the deployment environment to enable the Cloudflare Web Analytics beacon. The layout only renders the script when the token exists, so local development does not use a fake token.

## Public Environment Values

Copy `.env.example` to `.env` for local testing, then replace the values after you know the final URLs:

```sh
PUBLIC_SITE_URL=https://sri-charan-portfolio.sricharanchowdary2005.workers.dev
PUBLIC_REPO_URL=https://github.com/sricharanchowdary/sri-charan
PUBLIC_CONTACT_EMAIL=you@example.com
PUBLIC_CF_WEB_ANALYTICS_TOKEN=your-cloudflare-web-analytics-token
```

## Extensions

- **Extension 1: Backend Data & Storage**: D1 database for contact form submissions with soft-deletion and admin dashboard.
- **Extension 2: External API Integration**: Weather service using OpenWeatherMap API with 5s `AbortController` timeout and guaranteed fallback.
- **Extension 3: AI Résumé Chatbot & Evals**: Streaming Workers AI chatbot powered by `@cf/meta/llama-3.2-3b-instruct` with 20 evaluation test cases.
- **Extension 4: AI AppSec & Adversarial Defense**:
  - Input allow/deny logic for adversarial prompt injection detection and zero-cost edge rejection.
  - Streaming output safety filter using `TransformStream` to prevent system instruction leakage.
  - 11 adversarial test cases in `tests/security.test.ts`.
  - Comprehensive threat modeling and attack documentation in `SECURITY.md` and `ADVERSARIAL.md`.
- **Extension 5: Automated Testing & TDD (Playwright & Vitest)**:
  - Playwright E2E test suite for dark mode toggle persistence, contact form submission, and TDD copy-email button.
  - 50 Vitest unit/integration tests with code coverage reporting.
  - GitHub Actions CI workflow running on all Pull Requests with automatic merge blocking on test failure.
  - Full details in [TESTING.md](./TESTING.md).

## Required Files

- [PLAN.md](./PLAN.md)
- [DESIGN.md](./DESIGN.md)
- [DECISIONS.md](./DECISIONS.md)
- [TESTING.md](./TESTING.md)
- [SECURITY.md](./SECURITY.md)
- [ADVERSARIAL.md](./ADVERSARIAL.md)
- [SEQUENCE-DIAGRAMS.md](./SEQUENCE-DIAGRAMS.md)
- [EVALS.md](./EVALS.md)
- [design/](./design/)
- [QUESTIONS.md](./QUESTIONS.md)
- [LINKS.md](./LINKS.md)

## Deployment

Add `CLOUDFLARE_API_TOKEN` to GitHub Actions secrets. Push to `main` to run the deploy workflow. The workflow installs dependencies, runs type-check, tests, build, then deploys with `cloudflare/wrangler-action`.

Before final submission, add the real deployed URL, GitHub URL, email, and project links. See [LINKS.md](./LINKS.md) for the current link audit.
