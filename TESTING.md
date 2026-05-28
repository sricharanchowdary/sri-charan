# Testing

This project includes automated tests for the contact validation and worker endpoint. The CI workflow runs these tests on pull requests.

Automated tests

- Run locally:

```bash
npm ci
npm test
```

- Unit tests:
  - `src/lib/contact.test.ts` — unit tests for `validateContactInput` (happy path and failure cases).
  - `src/worker.test.ts` — basic checks that the Worker returns expected status codes and JSON for `/api/contact`.

Manual tests

1. Start dev server:

```bash
npm run dev
```

2. Open `/contact` and try:
   - Submit a valid message; verify success message.
   - Submit invalid email; verify field-level error shown.
   - Submit a short message; verify field-level error shown.
   - Inspect network request to `/api/contact` to ensure JSON body is sent and responses are returned.

3. With D1 unbound, the Worker logs submissions to console; with D1 bound, check the `contact_submissions` table.

CI expectations

- `npm test` must pass on pull requests (see `.github/workflows/ci.yml`).
# Testing

## Automated

Commands run locally:

```sh
npm run check
npm test
npm run build
```

Current result: all pass.

Vitest covers:

- Valid contact form submissions.
- Invalid name, email, and message values.
- Honeypot spam rejection.
- Worker API error response shape.
- Worker API success response shape.
- D1 persistence call for valid submissions.
- Static asset fallback for non-API routes.

## Manual Checklist

Run before final deploy:

- Home, About, Projects, Blog, Contact, and 404 render at 320px, 768px, and 1024px+.
- Theme follows OS preference on first visit.
- Manual dark-mode toggle persists across reloads.
- Contact form shows field errors for invalid input.
- Contact form posts successfully to `/api/contact` through Wrangler local dev.
- RSS feed loads at `/rss.xml`.
- Keyboard tab order is logical.
- Skip-to-content link appears on focus.
- Lighthouse mobile scores are at least 90 for Performance, Accessibility, Best Practices, and SEO.
- axe DevTools has no critical violations.
