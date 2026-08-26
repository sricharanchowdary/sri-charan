import type {
  UserRecord,
  LessonCompletionRecord,
  ExamAttemptRecord,
  CertificateRecord,
  ParsedCertificate,
  CertificateMetadata,
  LabChallengeRecord,
  ParsedLabChallenge,
} from '../types/academy-db';

/**
 * 1. Users Operations
 */
export async function upsertUser(
  db: D1Database,
  user: { id: string; email: string; name: string; provider: 'github' | 'google' | 'email' }
): Promise<UserRecord> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (id, email, name, provider, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name,
         email = excluded.email,
         updated_at = excluded.updated_at`
    )
    .bind(user.id, user.email.toLowerCase(), user.name, user.provider, now, now)
    .run();

  return {
    id: user.id,
    email: user.email.toLowerCase(),
    name: user.name,
    provider: user.provider,
    created_at: now,
    updated_at: now,
  };
}

export async function getUser(db: D1Database, userId: string): Promise<UserRecord | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRecord>();
  return result ?? null;
}

/**
 * 2. Lesson Completions Operations
 */
export async function recordLessonCompletion(
  db: D1Database,
  userId: string,
  lessonSlug: string,
  track: string
): Promise<LessonCompletionRecord> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO lesson_completions (user_id, lesson_slug, track, completed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, lesson_slug) DO UPDATE SET
         completed_at = excluded.completed_at`
    )
    .bind(userId, lessonSlug, track, now)
    .run();

  return {
    user_id: userId,
    lesson_slug: lessonSlug,
    track,
    completed_at: now,
  };
}

export async function getUserCompletions(
  db: D1Database,
  userId: string
): Promise<LessonCompletionRecord[]> {
  const { results } = await db
    .prepare('SELECT * FROM lesson_completions WHERE user_id = ? ORDER BY completed_at DESC')
    .bind(userId)
    .all<LessonCompletionRecord>();
  return results ?? [];
}

/**
 * 3. Exam Attempts Operations
 */
export async function recordExamAttempt(
  db: D1Database,
  attempt: {
    id: string;
    userId: string;
    scorePercentage: number;
    passed: boolean;
    attemptNumber?: number;
  }
): Promise<ExamAttemptRecord> {
  const now = new Date().toISOString();
  const passedInt = attempt.passed ? 1 : 0;
  const attemptNum = attempt.attemptNumber ?? 1;

  await db
    .prepare(
      `INSERT INTO exam_attempts (id, user_id, score_percentage, passed, attempt_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(attempt.id, attempt.userId, attempt.scorePercentage, passedInt, attemptNum, now)
    .run();

  return {
    id: attempt.id,
    user_id: attempt.userId,
    score_percentage: attempt.scorePercentage,
    passed: passedInt as 0 | 1,
    attempt_number: attemptNum,
    created_at: now,
  };
}

/**
 * 4. Certificates Operations
 */
export async function generateVerificationHash(
  userId: string,
  serialNumber: string,
  score: number,
  issuedAt: string
): Promise<string> {
  const data = `${userId}:${serialNumber}:${score}:${issuedAt}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function issueCertificate(
  db: D1Database,
  cert: {
    id: string;
    userId: string;
    serialNumber: string;
    trackName: string;
    scorePercentage: number;
    skills?: string[];
  }
): Promise<ParsedCertificate> {
  const now = new Date().toISOString();
  const hash = await generateVerificationHash(cert.userId, cert.serialNumber, cert.scorePercentage, now);

  const metadataObj: CertificateMetadata = {
    score_percentage: cert.scorePercentage,
    verification_hash: hash,
    issuer: "Sri Charan Chowdary - Security Academy",
    skills: cert.skills ?? ['AI Security', 'Prompt Guardrails', 'OAuth 2.0 PKCE', 'Cloudflare Workers'],
  };

  const metadataJson = JSON.stringify(metadataObj);

  await db
    .prepare(
      `INSERT INTO certificates (id, user_id, serial_number, issued_at, track_name, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(cert.id, cert.userId, cert.serialNumber, now, cert.trackName, metadataJson)
    .run();

  return {
    id: cert.id,
    user_id: cert.userId,
    serial_number: cert.serialNumber,
    issued_at: now,
    track_name: cert.trackName,
    metadata: metadataObj,
  };
}

export async function getCertificateBySerial(
  db: D1Database,
  serialNumber: string
): Promise<ParsedCertificate | null> {
  const row = await db
    .prepare('SELECT * FROM certificates WHERE serial_number = ?')
    .bind(serialNumber)
    .first<CertificateRecord>();

  if (!row) return null;

  let parsedMeta: CertificateMetadata;
  try {
    parsedMeta = JSON.parse(row.metadata);
  } catch {
    parsedMeta = { score_percentage: 0, verification_hash: '', issuer: '' };
  }

  return {
    id: row.id,
    user_id: row.user_id,
    serial_number: row.serial_number,
    issued_at: row.issued_at,
    track_name: row.track_name,
    metadata: parsedMeta,
  };
}

/**
 * 5. Lab Challenges Operations
 */
export async function getLabChallenge(
  db: D1Database,
  challengeId: string
): Promise<ParsedLabChallenge | null> {
  const row = await db
    .prepare('SELECT * FROM lab_challenges WHERE challenge_id = ?')
    .bind(challengeId)
    .first<LabChallengeRecord>();

  if (!row) return null;

  return {
    challenge_id: row.challenge_id,
    title: row.title,
    difficulty: row.difficulty,
    created_at: row.created_at,
    validation_rule: JSON.parse(row.validation_rule),
  };
}

export async function listLabChallenges(
  db: D1Database
): Promise<Array<Omit<ParsedLabChallenge, 'validation_rule'>>> {
  const { results } = await db
    .prepare('SELECT challenge_id, title, difficulty, created_at FROM lab_challenges ORDER BY difficulty ASC')
    .all<Omit<LabChallengeRecord, 'validation_rule'>>();

  return results ?? [];
}
