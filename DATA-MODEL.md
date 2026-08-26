# Data Model

## Table: contact_submissions

Stores all contact form submissions made by visitors.

| Column       | Type    | Constraints              | Description                        |
|--------------|---------|--------------------------|------------------------------------|
| id           | INTEGER | PRIMARY KEY AUTOINCREMENT| Unique row identifier              |
| name         | TEXT    | NOT NULL                 | Submitter's full name              |
| email        | TEXT    | NOT NULL                 | Submitter's email address          |
| message      | TEXT    | NOT NULL                 | Message body                       |
| submitted_at | TEXT    | NOT NULL                 | ISO 8601 UTC timestamp             |
| is_deleted   | INTEGER | DEFAULT 0                | Soft delete flag (0=active, 1=deleted) |

## Validation Rules

- `name`: must not be empty, max 100 characters
- `email`: must match basic email format, max 254 characters
- `message`: must not be empty, max 2000 characters
- All fields are validated server-side in the Worker, not just in the browser

## Why soft delete?

Instead of permanently deleting rows, `is_deleted` flags them as removed.
This preserves history and allows recovery if something is deleted by mistake.

## Concurrency

If two people submit the form at the same instant, D1 (SQLite) handles this
safely via its built-in write serialization. Each INSERT gets its own row with
a unique auto-incremented id. No data is lost or overwritten.

---

# Academy & Lab Platform Data Model

Designed for **Cloudflare D1** (Serverless SQLite at edge) with strict foreign keys (`ON DELETE CASCADE`), B-Tree indexes, JSON payload validity checks, and ISO 8601 UTC timestamps.

## 1. Table: `users`

Stores registered students and engineers authenticated via OAuth or magic link.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID / KSUID identifier (e.g. `usr_...`) |
| `email` | TEXT | NOT NULL UNIQUE COLLATE NOCASE | Student's verified email address |
| `name` | TEXT | NOT NULL | Display name |
| `provider` | TEXT | NOT NULL CHECK (in `'github'`, `'google'`, `'email'`) | Authentication identity provider |
| `created_at` | TEXT | NOT NULL DEFAULT `strftime(...)` | ISO 8601 UTC creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT `strftime(...)` | ISO 8601 UTC update timestamp |

## 2. Table: `lesson_completions`

Tracks individual lesson progress across curriculum learning tracks.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Associated student user ID |
| `lesson_slug` | TEXT | NOT NULL | Unique lesson identifier |
| `track` | TEXT | NOT NULL | Course track name (e.g. `ai-security`) |
| `completed_at` | TEXT | NOT NULL DEFAULT `strftime(...)` | ISO 8601 UTC completion timestamp |
| **PRIMARY KEY** | `(user_id, lesson_slug)` | Compound primary key | Prevents duplicate completion entries |

## 3. Table: `exam_attempts`

Records graded final assessment submissions and score percentages.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique UUID identifier |
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Associated student user ID |
| `score_percentage` | REAL | NOT NULL CHECK (0.0 to 100.0) | Numerical test score |
| `passed` | INTEGER | NOT NULL CHECK (in 0, 1) | Boolean passing flag (1=Pass, 0=Fail) |
| `attempt_number` | INTEGER | NOT NULL DEFAULT 1 CHECK (>= 1) | Attempt counter |
| `created_at` | TEXT | NOT NULL DEFAULT `strftime(...)` | ISO 8601 UTC test submission timestamp |

## 4. Table: `certificates`

Issued tamper-evident cryptographic credentials upon passing certification tracks.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique UUID identifier |
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Associated student user ID |
| `serial_number` | TEXT | NOT NULL UNIQUE | Verifiable serial (e.g. `SEC-2026-A89F2`) |
| `issued_at` | TEXT | NOT NULL DEFAULT `strftime(...)` | ISO 8601 UTC issuance timestamp |
| `track_name` | TEXT | NOT NULL | Name of accredited learning track |
| `metadata` | TEXT | NOT NULL DEFAULT `'{}'` CHECK `json_valid(...)` | JSON object (score, SHA-256 hash, signature) |

## 5. Table: `lab_challenges`

Interactive CTF and guardrail security laboratory challenges with automated grading heuristics.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `challenge_id` | TEXT | PRIMARY KEY | Unique slug (e.g. `lab-prompt-injection-01`) |
| `title` | TEXT | NOT NULL | Challenge display name |
| `difficulty` | TEXT | NOT NULL CHECK (in `'beginner'`, `'intermediate'`, `'advanced'`, `'expert'`) | Challenge skill tier |
| `validation_rule` | TEXT | NOT NULL CHECK `json_valid(...)` | JSON configuration for automated grader regex/tests |
| `created_at` | TEXT | NOT NULL DEFAULT `strftime(...)` | ISO 8601 UTC creation timestamp |