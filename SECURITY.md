# Application Security Policy & Threat Model (SECURITY.md)

## 1. Threat Model & Asset Identification

This system is a portfolio and API platform hosted on Cloudflare Workers, integrating a SQLite database (D1), external APIs (OpenWeatherMap, Resend), and an LLM chatbot (Cloudflare Workers AI).

### Core Assets & Sensitivity
1. **Cloudflare Workers AI Inference Quotas & GPU Compute**: Risk of DDoS, billing exhaustion, and malicious prompt cycling.
2. **Contact Submissions Database (D1)**: Stores visitor names, email addresses, and messages. Protected against SQL injection, data leakage, and mass spamming.
3. **Admin Session Credentials**: Protected via HMAC-SHA256 stateless tokens over `HttpOnly`, `SameSite=Lax` cookies.
4. **Environment Secrets**: `WEATHER_API_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD` stored in encrypted Wrangler secrets at the edge.

---

## 2. Threat Vectors & Attack Analysis

| Threat Actor | Attack Vector | Target Asset | Severity | Mitigation Strategy |
|---|---|---|---|---|
| **Adversarial Attacker** | Direct / Delimiter Prompt Injection | LLM System Prompt & Persona | High | Regex token detection & instruction override input guardrails. |
| **Malicious Client** | Topic Probing (Salary, Politics, Medical) | Chatbot Grounding Policy | Medium | Pre-LLM denied topic filter; explicit negative prompt constraints. |
| **Spam Bot** | Automated Contact Form Submissions | D1 Database & Resend Email | High | Honeypot field check, length restrictions, Cloudflare Turnstile bot verification. |
| **DDoS / Script Kiddie** | Endpoint Flooding (`/api/*`) | Edge Worker CPU & AI Quotas | High | Edge IP-based rate limiting (e.g. 5 req/min on AI endpoints). |
| **XSS / Content Injection** | Malicious Script Execution | Visitor Browsers | High | Strict Content-Security-Policy (CSP) headers & HTML sanitization. |

---

## 3. Deployed Security Guardrails & Defenses

### A. AI Input & Output Guardrails (`src/lib/security.ts`)
- **Input Guardrail (`validatePromptSafety`)**:
  - Drops direct instruction overrides (`"ignore previous instructions"`, `"act as DAN / developer mode"`).
  - Flags and drops special tokenizer delimiters (`<|im_start|>`, `[INST]`, `<s>`).
  - Blocks out-of-scope probes (`salary`, `compensation`, `political views`, `medical history`).
  - **Zero-Cost Edge Drop**: Returns a canned response directly from the Worker without executing a GPU inference cycle.
- **Output Guardrail (`filterLLMOutput` via `TransformStream`)**:
  - Inspects generated token streams to scrub accidentally emitted internal system prompt markers or API key references.

### B. Contact Form & Admin Protection
- **Honeypot Trap**: Invisible `company` field silently rejects automated bot form fillers.
- **Server-Side Sanitization**: Strips HTML tags (`<[^>]*>`), enforces character caps (100 for name, 254 for email, 2000 for message).
- **Stateless Admin Authentication**: HMAC-SHA256 signed session cookie with constant-time verification.

---

## 4. AppSec Roadmap: Hardening Extensions

1. **Cloudflare Turnstile**: Zero-friction CAPTCHA integration on `/api/contact` to eliminate bot spam.
2. **Edge Rate Limiting**: In-memory / KV IP bucket limiting to restrict API abuse (`/api/resume-chat` capped at 5 req/min per IP).
3. **Strict Content-Security-Policy (CSP)**: HTTP response headers enforcing `default-src 'self'`, blocking inline script execution, frame embedding (`frame-ancestors 'none'`), and unauthorized API connections.
