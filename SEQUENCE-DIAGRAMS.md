# Sequence Diagrams

## 1. Ask My Résumé Chat — Streaming AI Response

```mermaid
sequenceDiagram
    actor U as User / Browser
    participant CF as Cloudflare Edge
    participant W as Worker (src/worker.ts)
    participant R as Resume Context (src/data/resume.ts)
    participant AI as Workers AI (@cf/meta/llama-3.2-3b-instruct)

    U->>CF: POST /api/resume-chat { "question": "What ML projects have you built?" }
    CF->>W: Route to Worker fetch()

    W->>W: Validate Method (POST), JSON parse, Length (<= 500 chars)
    W->>R: Fetch RESUME_SYSTEM_PROMPT (contains full RESUME_TEXT & refusal rules)
    R-->>W: Prompt context string

    W->>AI: env.AI.run(model, { messages: [system, user], stream: true })
    AI-->>W: Returns ReadableStream

    W-->>CF: Response(stream, { headers: { "Content-Type": "text/event-stream" } })
    CF-->>U: HTTP 200 (Stream Established)

    loop Token Generation
        AI->>W: Token chunk (e.g. data: {"response":"I built a "})
        W->>CF: SSE chunk
        CF->>U: Render token chunk in UI in real-time
    end

    AI->>W: data: [DONE]
    W->>CF: Stream Complete
    CF->>U: Final UI state updated
```

## 2. Automated Vitest Evaluation Suite Flow

```mermaid
sequenceDiagram
    participant H as Vitest Test Suite (tests/evals.test.ts)
    participant W as Worker (src/worker.ts)
    participant AI as env.AI (Mock / Live Workers AI)
    participant A as Stream Reader & Assertions

    H->>H: Load 20 Evaluation Test Cases
    
    loop For each test case (1 to 20)
        H->>W: worker.fetch(POST /api/resume-chat, { question: "..." })
        W->>AI: env.AI.run(model, { messages, stream: true })
        AI-->>W: Return SSE Mock/Live Stream
        W-->>H: HTTP Response with ReadableStream

        H->>A: readStreamResponse(response)
        A-->>H: Reassembled response text

        alt Category: Factual (Cases 1-8)
            H->>H: expect(reply).toMatch(factualRegex)
        else Category: Salary Refusal (Cases 9-10)
            H->>H: expect(reply).toMatch(refusalRegex) & not.toMatch(currencyRegex)
        else Category: Hallucination Guard (Cases 11-13)
            H->>H: expect(reply).toMatch(/not covered in the résumé/)
        else Category: Privacy & Safety (Cases 14-15)
            H->>H: expect(reply).toMatch(/not able to share/)
        else Category: Length & Validation (Cases 17-20)
            H->>H: expect(reply.length).toBeLessThan(500) & expect(status).toBe(400/405)
        end
    end

    H-->>H: Output Test Summary: 20 Passed (100%)
```

## 3. Weather API — Happy Path & Failure Path

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as Worker (src/worker.ts)
    participant OWM as OpenWeatherMap API

    B->>W: GET /api/weather
    Note over W: Start 5-second AbortController timeout

    alt API Call Succeeds (<5s)
        W->>OWM: fetch(OWM_URL, { signal })
        OWM-->>W: 200 OK + JSON
        W-->>B: 200 JSON { ok: true, fallback: false, weather: { ... } }
    else API Timeout (>5s) or API Error (500)
        W->>OWM: fetch(OWM_URL, { signal })
        OWM-->>W: Timeout / Error
        W->>W: Catch block triggers fallback
        W-->>B: 502 JSON { ok: false, fallback: true, weather: { city: "Hyderabad", temp: null } }
    end
```

## 4. Contact Form Submission Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as Worker (src/worker.ts)
    participant V as validateContactInput()
    participant D1 as D1 Database
    participant R as Resend API

    B->>W: POST /api/contact { name, email, message }
    W->>V: validateContactInput(body)

    alt Validation Failure
        V-->>W: { ok: false, errors }
        W-->>B: 400 JSON { ok: false, errors }
    else Validation Success
        V-->>W: { ok: true, value }
        W->>D1: INSERT INTO contact_submissions
        opt RESEND_API_KEY present
            W->>R: POST /emails (notification)
        end
        W-->>B: 200 JSON { ok: true, message: "Thanks..." }
    end
```
