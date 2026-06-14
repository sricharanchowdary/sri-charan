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