# Sequence Diagrams

## 1. Weather API — Happy Path (External API succeeds)

```mermaid
sequenceDiagram
    participant B as Browser
    participant CF as Cloudflare Edge
    participant W as Worker (fetch handler)
    participant OWM as OpenWeatherMap API

    B->>CF: GET /api/weather
    CF->>W: Route to Worker (main: src/worker.ts)
    W->>W: Check env.WEATHER_API_KEY exists

    Note over W: Start 5-second AbortController timeout

    W->>OWM: fetch(OWM_URL, { signal: controller.signal })
    OWM-->>W: 200 OK + JSON weather data

    W->>W: clearTimeout(timeoutId)
    W->>W: Parse response, extract temp/humidity/description/icon

    W-->>CF: 200 JSON { ok: true, fallback: false, weather: { ... } }
    CF-->>B: 200 JSON response

    Note over B: Frontend renders live weather widget
```

## 2. Weather API — Failure Path (External API slow/down)

```mermaid
sequenceDiagram
    participant B as Browser
    participant CF as Cloudflare Edge
    participant W as Worker (fetch handler)
    participant OWM as OpenWeatherMap API

    B->>CF: GET /api/weather
    CF->>W: Route to Worker (main: src/worker.ts)
    W->>W: Check env.WEATHER_API_KEY exists

    Note over W: Start 5-second AbortController timeout

    alt External API is slow (>5s)
        W->>OWM: fetch(OWM_URL, { signal: controller.signal })
        Note over OWM: No response within 5 seconds...
        W->>W: AbortController fires → AbortError thrown
    else External API returns error
        W->>OWM: fetch(OWM_URL, { signal: controller.signal })
        OWM-->>W: 500 / 503 / network error
        W->>W: apiRes.ok === false → throw Error
    else API key missing
        W->>W: env.WEATHER_API_KEY is undefined
        W-->>CF: 500 JSON { ok: false, fallback: true, weather: { city: "Hyderabad", ... } }
        CF-->>B: 500 JSON (missing config)
    end

    W->>W: catch block builds fallback response

    W-->>CF: 502 JSON { ok: false, fallback: true, weather: { city: "Hyderabad", temp: null, description: "Temporarily unavailable" } }
    CF-->>B: 502 JSON response

    Note over B: Frontend checks fallback: true → shows "Weather unavailable" gracefully
```

## 3. Posts API — Slug Lookup

```mermaid
sequenceDiagram
    participant B as Browser
    participant CF as Cloudflare Edge
    participant W as Worker (fetch handler)
    participant Data as src/data/site.ts

    B->>CF: GET /api/posts/medical-image-pipeline
    CF->>W: Route to Worker

    W->>W: Regex match /api/posts/([a-z0-9-]+)
    W->>Data: posts.find(p => p.slug === "medical-image-pipeline")

    alt Post found
        Data-->>W: { slug, title, date, description }
        W-->>CF: 200 JSON { ok: true, post: { ... } }
    else Post not found
        Data-->>W: undefined
        W-->>CF: 404 JSON { ok: false, error: "Post not found: ..." }
    end

    CF-->>B: JSON response
```

## 4. Contact Submission — Full Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant CF as Cloudflare Edge
    participant W as Worker (fetch handler)
    participant V as validateContactInput()
    participant D1 as D1 Database
    participant R as Resend API

    B->>CF: POST /api/contact { name, email, message }
    CF->>W: Route to Worker

    W->>W: Parse JSON body
    W->>V: validateContactInput(body)

    alt Validation fails
        V-->>W: { ok: false, errors: { ... } }
        W-->>CF: 400 JSON { ok: false, errors }
        CF-->>B: 400 with field-level errors
    else Validation passes
        V-->>W: { ok: true, value: { name, email, message } }
        W->>W: sanitize(name, email, message)
        W->>D1: INSERT INTO contact_submissions
        D1-->>W: Success

        opt RESEND_API_KEY configured
            W->>R: POST /emails (send notification)
            R-->>W: 200 OK
        end

        W-->>CF: 200 JSON { ok: true, message: "Thanks..." }
        CF-->>B: 200 success
    end
```
