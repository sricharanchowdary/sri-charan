/**
 * TypeScript Data Models matching Cloudflare D1 SQLite schema (migrations/0002_create_academy_and_labs.sql)
 */

export type AuthProvider = 'github' | 'google' | 'email';
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * 1. Users Table Model
 */
export interface UserRecord {
  id: string; // UUID string
  email: string;
  name: string;
  provider: AuthProvider;
  created_at: string; // ISO 8601 UTC timestamp
  updated_at: string;
}

/**
 * Sessions Table Model
 */
export interface SessionRecord {
  id: string; // Cryptographic session token
  user_id: string;
  expires_at: number; // Milliseconds Unix epoch
  created_at: string;
}

export interface AuthSessionValidation {
  user: UserRecord | null;
  session: SessionRecord | null;
}

/**
 * 2. Lesson Completions Table Model
 */
export interface LessonCompletionRecord {
  user_id: string;
  lesson_slug: string;
  track: string;
  completed_at: string; // ISO 8601 UTC timestamp
}

/**
 * 3. Exam Attempts Table Model
 */
export interface ExamAttemptRecord {
  id: string; // UUID string
  user_id: string;
  score_percentage: number; // 0.0 - 100.0
  passed: 0 | 1; // SQLite boolean
  attempt_number: number;
  created_at: string; // ISO 8601 UTC timestamp
}

/**
 * Certificate Metadata JSON payload schema
 */
export interface CertificateMetadata {
  score_percentage: number;
  verification_hash: string; // SHA-256 integrity hash
  issuer: string;
  signature?: string;
  criteria?: string[];
  skills?: string[];
}

/**
 * 4. Certificates Table Model
 */
export interface CertificateRecord {
  id: string; // UUID string
  user_id: string;
  serial_number: string; // e.g. 'SEC-2026-A89F2'
  issued_at: string; // ISO 8601 UTC timestamp
  track_name: string;
  metadata: string; // JSON string encoded CertificateMetadata
}

/**
 * Parsed Certificate object for application code
 */
export interface ParsedCertificate extends Omit<CertificateRecord, 'metadata'> {
  metadata: CertificateMetadata;
}

/**
 * Lab Challenge automated grader validation rule schema
 */
export interface LabValidationRule {
  expected_output_pattern?: string; // Regex pattern
  forbidden_patterns?: string[];
  required_headers?: Record<string, string>;
  max_execution_time_ms?: number;
  test_cases?: Array<{
    input: string;
    expected_output: string;
  }>;
}

/**
 * 5. Lab Challenges Table Model
 */
export interface LabChallengeRecord {
  challenge_id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  validation_rule: string; // JSON string encoded LabValidationRule
  created_at: string; // ISO 8601 UTC timestamp
}

/**
 * Parsed Lab Challenge object for application code
 */
export interface ParsedLabChallenge extends Omit<LabChallengeRecord, 'validation_rule'> {
  validation_rule: LabValidationRule;
}

/**
 * Cloudflare Worker Environment Interface with D1 Database Binding
 */
export interface AcademyEnv {
  DB: D1Database;
  AI?: any;
}
