-- ============================================================================
-- Migration: 0002_create_academy_and_labs.sql
-- Description: Database schema for Academy & Lab platform in Cloudflare D1 (SQLite)
-- Features: Strict foreign keys, JSON constraints, B-Tree indexes, and ISO-8601 UTC timestamps
-- ============================================================================

-- Enforce Foreign Key constraints for serverless SQLite connections
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                             -- UUID / KSUID string (e.g. 'usr_01HZX8...')
    email TEXT NOT NULL COLLATE NOCASE,              -- Unique case-insensitive email
    name TEXT NOT NULL,                              -- User's display name
    provider TEXT NOT NULL CHECK (provider IN ('github', 'google', 'email')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- ----------------------------------------------------------------------------
-- 2. Lesson Completions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_completions (
    user_id TEXT NOT NULL,
    lesson_slug TEXT NOT NULL,                       -- e.g. 'prompt-injection-defense'
    track TEXT NOT NULL,                             -- e.g. 'ai-security', 'appsec'
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (user_id, lesson_slug),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_track ON lesson_completions(track, completed_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Exam Attempts Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_attempts (
    id TEXT PRIMARY KEY,                             -- UUID string
    user_id TEXT NOT NULL,
    score_percentage REAL NOT NULL CHECK (score_percentage >= 0.0 AND score_percentage <= 100.0),
    passed INTEGER NOT NULL CHECK (passed IN (0, 1)), -- Boolean: 1 = passed, 0 = failed
    attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_created ON exam_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_passed ON exam_attempts(passed, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Certificates Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,                             -- UUID string
    user_id TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,              -- e.g. 'SEC-2026-A89F2'
    issued_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    track_name TEXT NOT NULL,                        -- e.g. 'AI Security & Guardrails Engineering'
    metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)), -- JSON payload (score, sha256 hash, signature)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_serial_number ON certificates(serial_number);
CREATE INDEX IF NOT EXISTS idx_certificates_user_issued ON certificates(user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_track ON certificates(track_name);

-- ----------------------------------------------------------------------------
-- 5. Lab Challenges Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_challenges (
    challenge_id TEXT PRIMARY KEY,                   -- e.g. 'lab-prompt-injection-01'
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    validation_rule TEXT NOT NULL CHECK (json_valid(validation_rule)), -- JSON payload defining automated grader regex/heuristics
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_lab_challenges_difficulty ON lab_challenges(difficulty);
