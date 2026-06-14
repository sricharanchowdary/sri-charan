CREATE TABLE IF NOT EXISTS contact_submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  message      TEXT    NOT NULL,
  submitted_at TEXT    NOT NULL,
  is_deleted   INTEGER NOT NULL DEFAULT 0
);