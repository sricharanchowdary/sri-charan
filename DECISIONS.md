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

## External API Integration — Extension 2

### Why OpenWeatherMap?

Free tier with 1,000 calls/day, simple REST interface, and well-documented JSON responses. The weather widget is non-critical to the portfolio — it adds a personal touch (showing Hyderabad weather) without introducing a hard dependency.

### Caching Strategy

**Current: no cache.** The endpoint calls OpenWeatherMap on every request. This is acceptable because:

- The free tier allows ~1 call/second (60/min), far above expected portfolio traffic.
- Weather data is non-essential — if it's slightly stale or absent, the page still works.
- Cloudflare Workers don't include KV or Cache API by default on the free plan. Adding KV just for weather would be over-engineering at this traffic level.

**If traffic grows**, the recommended upgrade path is:

1. Add a KV namespace binding (e.g., `WEATHER_CACHE`)
2. Cache the OWM response with a 10-minute TTL: `await env.WEATHER_CACHE.put('hyderabad', json, { expirationTtl: 600 })`
3. Check KV first, call OWM only on cache miss
4. This reduces external API calls to ~6/hour instead of potentially thousands

### How External Failure Is Handled

The weather endpoint uses a **three-layer defense** so the frontend never breaks:

| Layer | Trigger | Response |
|---|---|---|
| **Missing config** | `env.WEATHER_API_KEY` is undefined | `500` with `fallback: true` and null weather values |
| **Timeout** | OpenWeatherMap doesn't respond within 5 seconds | `AbortController` aborts the fetch → caught in `catch` → `502` with fallback |
| **API error** | OWM returns non-200, network failure, or bad JSON | Caught in `catch` → `502` with fallback |

In all failure cases, the response body **always includes a `weather` object** with the same shape as the success case (but with `null` values and `fallback: true`). This means the frontend can render unconditionally:

```js
const { weather, fallback } = await res.json();
// weather.city is always "Hyderabad", weather.temp is number or null
// fallback is true when data is stale/unavailable
```

The 5-second timeout was chosen because:
- Cloudflare Workers have a 30-second CPU time limit, but users won't wait that long.
- 5 seconds is generous for a simple API call but short enough to avoid blocking the page.
- The `AbortController` pattern is zero-dependency and native to the Workers runtime.

### Secret Management

All API keys are stored as **Wrangler secrets** (`wrangler secret put <KEY>`), which are:

- Encrypted at rest by Cloudflare
- Injected into the Worker environment (`env.*`) at runtime
- Never committed to the repository
- Not visible in `wrangler.jsonc` or any config file

For local development, `.dev.vars` (gitignored) provides the same keys to `wrangler dev`.

## AI Chatbot & Evaluation Suite — Extension 3

### Model Choice: Cloudflare Workers AI (`@cf/meta/llama-3.2-3b-instruct`)

I chose **`@cf/meta/llama-3.2-3b-instruct`** via Cloudflare Workers AI for the résumé chatbot because:
- **Zero Third-Party Latency & Cost**: Runs natively on Cloudflare's GPU edge without sending data to external API providers or requiring third-party API keys.
- **Native Streaming**: Supports Server-Sent Events (`stream: true`), returning a `ReadableStream` directly to the client for immediate visual feedback.
- **Instruction Following**: The 3B parameter Llama 3.2 model provides strong instruction adherence for structured system prompts while maintaining low cold-start latency and small memory overhead.

### Grounding Mechanism

The chatbot is grounded using a **strict negative-constraint system prompt** injected before the user's query:
1. **Full Context Injection**: The complete résumé text (`RESUME_TEXT` in `src/data/resume.ts`) is interpolated directly into `RESUME_SYSTEM_PROMPT`.
2. **Explicit Refusal Clauses**: The system prompt contains explicit negative rules forbidding salary discussion, compensation figures, personal beliefs, health, or age, and commands the model to cite the contact form (`/contact`) whenever information is not in the CV.
3. **First-Person Persona**: The model is instructed to speak as Sri Charan in a concise (2–4 sentence) tone.

### Blind Spots & Limitations of the Evaluation Suite

While the 20-case Vitest suite covers factual recall, salary refusal, hallucination rejection, and API protocol edge cases, several blind spots remain:
- **Semantic Paraphrasing & Phrasing Variance**: The deterministic regex checks in unit tests verify target keywords and refusal phrases, but real-world users might use obscure colloquialisms or typos that bypass simple regex checks.
- **Multilingual / Obfuscated Prompt Injections**: The suite tests direct adversarial prompts, but does not test encoded, translated (e.g., base64, ROT13, foreign languages), or multi-turn jailbreak attempts designed to trick small models into ignoring system prompts.
- **Multi-Turn Conversation Memory**: `/api/resume-chat` is currently stateless (single-turn Q&A). The test suite does not evaluate context retention across consecutive message exchanges.
- **Production Edge Latency & Rate Limits**: Vitest tests evaluate mock streams and endpoint response structure locally, but do not benchmark real Cloudflare Workers AI warm/cold execution times or GPU queue throttling under heavy concurrent load.