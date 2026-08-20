# Architecture & Testing Code Tour

This document provides a concise tour of the automated testing structure, configuration files, and design patterns used across the portfolio codebase.

---

## 1. Directory Layout & Organization

The codebase cleanly separates fast unit/API contracts from real-browser end-to-end tests:

```text
my-portfolio/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI gate (Vitest + Playwright + Build)
├── e2e/                         # Playwright Browser End-to-End Tests
│   ├── copy-email.spec.ts       # TDD test: Clipboard permissions, button click & feedback
│   └── portfolio.spec.ts        # Dark mode persistence & Contact form submission
├── src/
│   └── lib/
│       ├── contact.ts           # Pure validation logic for contact submissions
│       ├── contact.test.ts      # Unit tests for contact.ts validation rules
│       ├── security.ts          # AI input/output guardrails & streaming filters
│       └── ...
├── tests/                       # Vitest Integration, Security & Eval Suites
│   ├── contact.test.ts          # Schema & honeypot tests
│   ├── worker.test.ts           # Cloudflare Worker API routing & static fallback tests
│   ├── security.test.ts         # 11 adversarial tests (prompt injection & data leakage)
│   └── evals.test.ts            # 20 LLM evaluation benchmarks (factuality, refusal, tone)
├── playwright.config.ts         # Playwright runner config & local dev webServer definition
└── vitest.config.ts             # Vitest runner config & V8 coverage settings
```

---

## 2. Testing Configuration Tour

### `playwright.config.ts`
- **`baseURL`**: Set to `http://localhost:4321` so tests use clean relative paths (e.g. `page.goto('/contact')`).
- **`webServer`**: Automatically starts `npm run dev` before executing tests and reuses existing servers in local dev to save time.
- **`projects`**: Runs against Chromium with deterministic viewport sizes.
- **`reporter`**: Generates interactive HTML test reports (`playwright-report/`).

### `vitest.config.ts`
- Runs in native TypeScript ESM mode with fast in-memory execution.
- Integrates `@vitest/coverage-v8` for granular line/branch coverage reporting.

---

## 3. Key Testing Patterns & Design Principles

### A. Test-Driven Development (TDD)
- Demonstrated in [`e2e/copy-email.spec.ts`](./e2e/copy-email.spec.ts):
  - **Red Phase**: Playwright test written first asserting `#copy-email-btn` presence and clipboard behavior.
  - **Green Phase**: Astro UI component markup and clipboard event handler added in [`src/pages/contact.astro`](./src/pages/contact.astro) to satisfy the test.

### B. Browser API Interception (`page.route`)
- In [`e2e/portfolio.spec.ts`](./e2e/portfolio.spec.ts), network calls to `/api/contact` are intercepted with `page.route` to mock backend responses. This keeps E2E tests fully deterministic and fast without depending on live third-party network APIs.

### C. Permissions Granting
- In [`e2e/copy-email.spec.ts`](./e2e/copy-email.spec.ts), `context.grantPermissions(['clipboard-read', 'clipboard-write'])` simulates real browser clipboard access without security dialog blocks.

### D. Edge Runtime & Streaming Mocks
- In [`tests/evals.test.ts`](./tests/evals.test.ts) and [`tests/security.test.ts`](./tests/security.test.ts), mock streaming readers reassemble SSE chunks from `TransformStream` pipelines to test LLM output safety in millisecond runtimes.
