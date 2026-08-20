# High-Level Design (HLD) — Automated Testing & CI Pipeline

This document outlines the testing architecture for the Sri Charan Portfolio web application, integrating unit, integration, adversarial, and browser-based end-to-end (E2E) testing with automated GitHub Actions CI/CD gates.

---

## 1. System Architecture & Testing Layers

The testing pyramid is organized into three distinct tiers for speed, reliability, and coverage:

1. **Static Analysis & Type Checking (Astro Check / TypeScript)**:
   - Validates template syntax, TypeScript types, and Astro component props at compile time.
2. **Fast Unit, API & Eval Layer (Vitest)**:
   - Executes 50 test cases covering contact validation, Worker endpoints, adversarial prompt injection defense, and 20 LLM résumé chatbot evals.
   - Runs in-memory with sub-second execution and V8 code coverage analysis.
3. **Browser End-to-End Layer (Playwright)**:
   - Spins up Chromium instances against a local Astro web server (`http://localhost:4321`).
   - Tests user journeys: theme persistence in `localStorage`, contact form submission feedback, and clipboard API copying.

---

## 2. Component Diagram

```mermaid
graph TD
    subgraph CI["GitHub Actions CI Pipeline (.github/workflows/ci.yml)"]
        PR["Pull Request / Push Event"] --> Checkout["1. Checkout & Setup Node 22"]
        Checkout --> DepInstall["2. npm ci (Clean Install)"]
        DepInstall --> TypeCheck["3. npm run check (Astro Check)"]
        TypeCheck --> VitestRun["4. npm run test:coverage (Vitest)"]
        VitestRun --> PWInstall["5. npx playwright install --with-deps chromium"]
        PWInstall --> PWRun["6. npm run test:e2e (Playwright)"]
        PWRun --> Build["7. npm run build (Production Bundle)"]
        Build --> StatusCheck{"All Steps Exit 0?"}
        StatusCheck -->|Yes| CIPass["✅ PR Checks Pass (Merge Allowed)"]
        StatusCheck -->|No| CIFail["❌ PR Checks Fail (Merge Blocked)"]
    end

    subgraph UnitLayer["Unit / Integration Tier (Vitest)"]
        VitestRun --> V1["src/lib/contact.test.ts (Input Validation)"]
        VitestRun --> V2["tests/worker.test.ts (Worker Routing)"]
        VitestRun --> V3["tests/security.test.ts (11 Adversarial Tests)"]
        VitestRun --> V4["tests/evals.test.ts (20 AI Evals)"]
    end

    subgraph E2ELayer["Browser E2E Tier (Playwright)"]
        PWRun --> WebServer["playwright.config.ts (Astro Dev Server on :4321)"]
        WebServer --> E1["e2e/portfolio.spec.ts (Dark Mode & Contact Form)"]
        WebServer --> E2["e2e/copy-email.spec.ts (Clipboard & Visual Feedback)"]
    end
```

---

## 3. Key Components & Responsibilities

| Component | Technology | Primary Responsibility |
| :--- | :--- | :--- |
| **Test Runner (Unit/API)** | [Vitest](https://vitest.dev/) | Ultra-fast unit testing, ESM module execution, mock Workers runtime, and AI eval suite. |
| **Test Runner (E2E)** | [Playwright](https://playwright.dev/) | Real browser DOM testing, clipboard permissions, storage persistence, and form submission flows. |
| **CI Orchestrator** | [GitHub Actions](https://github.com/features/actions) | Enforces quality gates on every Pull Request, runs all test suites, and blocks merges on test failures. |
| **Development WebServer** | Astro CLI (`astro dev`) | Automatically spawned by Playwright's `webServer` config to serve the frontend on `http://localhost:4321`. |
| **Coverage Engine** | `@vitest/coverage-v8` | Generates code coverage metrics (`lcov.info`) to track test completeness across backend libraries. |
