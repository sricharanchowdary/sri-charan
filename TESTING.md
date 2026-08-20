# Testing & Quality Assurance

This project enforces end-to-end quality with **Vitest unit/integration tests**, **Playwright browser end-to-end tests**, and **GitHub Actions automated CI workflows** that run on every pull request.

---

## 1. Automated Test Suites

### Commands to Run Locally

```bash
# Type check TypeScript and Astro files
npm run check

# Run Vitest unit, API, and eval test suites
npm test

# Run Vitest with code coverage
npm run test:coverage

# Run Playwright End-to-End tests in headless Chromium
npm run test:e2e

# View interactive HTML Playwright report
npx playwright show-report
```

---

## 2. Unit & Integration Tests (Vitest)

Our Vitest suite covers **50 automated test cases** across 5 test files:

- **`src/lib/contact.test.ts`**: Validates input sanitize/validation rules (name, email format, message length bounds, honeypot spam detection).
- **`tests/contact.test.ts`**: Tests contact schema behavior, edge cases, and error formatting.
- **`tests/worker.test.ts`**: Tests Cloudflare Worker endpoints (`/api/contact`, `/api/posts`, `/api/weather`, `/api/admin/*`, static asset fallbacks).
- **`tests/security.test.ts`**: 11 adversarial tests validating prompt injection defense, zero-cost edge rejection, and system prompt leakage prevention.
- **`tests/evals.test.ts`**: 20 evaluation test cases scoring accuracy, grounding, tone, and refusal behavior for the AI Résumé Chatbot.

---

## 3. End-to-End Tests (Playwright)

Located in the [`e2e/`](./e2e/) directory, configured in [`playwright.config.ts`](./playwright.config.ts) against the local Astro server (`http://localhost:4321`):

### `e2e/portfolio.spec.ts`
1. **Dark Mode Toggle & State Persistence**:
   - Locates `#theme-toggle` button.
   - Clicks button to switch between light and dark modes.
   - Asserts immediate CSS class change on the `<html>` element.
   - Inspects `localStorage` to confirm `theme` preference is persisted.
   - Reloads the page (`page.reload()`) and verifies the saved theme state persists after reload.

2. **Contact Form Submission & Feedback**:
   - Intercepts `/api/contact` mock response.
   - Fills `#name`, `#email`, `#message` inputs.
   - Clicks `#submit-button`.
   - Asserts that `#form-status` displays a positive success message.
   - Verifies all form fields are automatically cleared upon success.

### `e2e/copy-email.spec.ts` (TDD Implementation)
3. **Copy Email to Clipboard Feature**:
   - Grants browser context permissions for `clipboard-read` and `clipboard-write`.
   - Locates `#copy-email-btn`.
   - Clicks the copy button and verifies immediate feedback text (`Copied!`).
   - Asserts that `navigator.clipboard.readText()` matches the correct email address.

---

## 4. Test-Driven Development (TDD) Workflow

The "Copy Email to Clipboard" button was built strictly following TDD:

1. **RED Phase**: Wrote failing Playwright test in `e2e/copy-email.spec.ts` checking for `#copy-email-btn` and committed:
   `git commit -m "test(e2e): add failing Playwright test for copy email to clipboard button"`
2. **GREEN Phase**: Implemented UI button and clipboard listener in `src/pages/contact.astro` to make the test pass, then committed:
   `git commit -m "feat(contact): implement copy email button and make Playwright test pass"`
3. **REFACTOR Phase**: Integrated into CI pipeline and verified across all browsers and test runs.

---

## 5. CI / CD GitHub Actions Workflow

Configured in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):

- Triggers on every `pull_request` against `main` and `push` to `main`.
- Steps:
  1. `actions/checkout@v4` and `actions/setup-node@v4` (Node 22 with npm cache).
  2. `npm ci` (clean dependency installation).
  3. `npm run check` (Astro type diagnostic check).
  4. `npm run test:coverage` (runs all 50 Vitest tests; non-zero exit code on failure).
  5. `npx playwright install --with-deps chromium` (installs browser and Linux OS dependencies).
  6. `npm run test:e2e` (runs all 3 Playwright test suites).
  7. `actions/upload-artifact@v4` (retains `playwright-report/` artifact for 14 days if tests fail).
  8. `npm run build` (production build verification).

**Merge Blocking**: Any failing unit test or E2E test exits with code `1`, immediately failing the PR check and blocking the merge.

---

## 6. What is NOT Covered (and Rationales)

While test coverage is comprehensive across core user journeys, certain external and complex flows are deliberately excluded from automated E2E testing:

1. **Live Cloudflare Workers AI Token Consumption in E2E**:
   - *Rationale*: Invoking live LLM inference (`@cf/meta/llama-3.2-3b-instruct`) in every CI pipeline run causes rate limiting, unmetered token consumption, non-deterministic latency, and potential flaky test failures due to generative text variations. LLM behavior is instead verified via the 20 deterministic evaluation benchmarks in `tests/evals.test.ts` with streaming contract checks.
2. **Third-Party OpenWeatherMap Network Flakiness**:
   - *Rationale*: E2E tests avoid relying on live external weather API uptime. API contract resilience and timeout fallbacks (5-second `AbortController`) are rigorously tested in Vitest isolation (`tests/worker.test.ts`).
3. **Multi-Browser WebKit/Firefox Matrix in PR CI**:
   - *Rationale*: CI execution runs on Chromium to keep pull request build times under 45 seconds while ensuring rapid feedback loops. Full cross-browser matrix testing is reserved for release pipelines.
4. **Production D1 Cloud Database Mutations**:
   - *Rationale*: CI pipelines avoid mutating persistent production databases. Local mock state and test fixtures validate SQL transactions safely.

