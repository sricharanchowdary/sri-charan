-- ============================================================================
-- Migration: 0003_create_sessions.sql
-- Description: D1 SQLite Sessions table for GitHub OAuth and stateful auth
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,                             -- Cryptographic session token hash
    user_id TEXT NOT NULL,                           -- Foreign key to users
    expires_at INTEGER NOT NULL,                     -- Unix epoch in milliseconds
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
