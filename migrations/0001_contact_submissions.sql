CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  ip_address TEXT,
  created_at TEXT NOT NULL
);
