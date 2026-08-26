import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  upsertUser,
  recordLessonCompletion,
  recordExamAttempt,
  issueCertificate,
  getCertificateBySerial,
  generateVerificationHash,
} from '../src/lib/academy-service';

describe('Academy & Labs D1 Database Service', () => {
  let mockDb: any;
  let mockStmt: any;

  beforeEach(() => {
    mockStmt = {
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true }),
      first: vi.fn(),
      all: vi.fn(),
    };

    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStmt),
    };
  });

  it('should upsert a user record correctly', async () => {
    const user = await upsertUser(mockDb, {
      id: 'usr_123',
      email: 'STUDENT@EXAMPLE.COM',
      name: 'Alice Smith',
      provider: 'github',
    });

    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'));
    expect(mockStmt.bind).toHaveBeenCalledWith(
      'usr_123',
      'student@example.com',
      'Alice Smith',
      'github',
      expect.any(String),
      expect.any(String)
    );
    expect(user.email).toBe('student@example.com');
  });

  it('should record lesson completion with compound primary key safety', async () => {
    const completion = await recordLessonCompletion(
      mockDb,
      'usr_123',
      'prompt-injection-defense',
      'ai-security'
    );

    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO lesson_completions')
    );
    expect(completion.user_id).toBe('usr_123');
    expect(completion.lesson_slug).toBe('prompt-injection-defense');
    expect(completion.track).toBe('ai-security');
  });

  it('should record an exam attempt and format passed boolean', async () => {
    const attempt = await recordExamAttempt(mockDb, {
      id: 'atm_999',
      userId: 'usr_123',
      scorePercentage: 95.5,
      passed: true,
      attemptNumber: 1,
    });

    expect(mockStmt.bind).toHaveBeenCalledWith(
      'atm_999',
      'usr_123',
      95.5,
      1,
      1,
      expect.any(String)
    );
    expect(attempt.passed).toBe(1);
    expect(attempt.score_percentage).toBe(95.5);
  });

  it('should generate SHA-256 integrity hash and issue verifiable certificate', async () => {
    const hash = await generateVerificationHash('usr_123', 'SEC-2026-X892', 96.0, '2026-08-24T00:00:00Z');
    expect(hash).toHaveLength(64); // 64 hex characters for SHA-256

    const cert = await issueCertificate(mockDb, {
      id: 'cert_777',
      userId: 'usr_123',
      serialNumber: 'SEC-2026-X892',
      trackName: 'AI Security Engineering',
      scorePercentage: 96.0,
    });

    expect(cert.serial_number).toBe('SEC-2026-X892');
    expect(cert.metadata.verification_hash).toBeDefined();
    expect(cert.metadata.score_percentage).toBe(96.0);
  });

  it('should retrieve and parse certificate metadata by serial number', async () => {
    mockStmt.first.mockResolvedValueOnce({
      id: 'cert_777',
      user_id: 'usr_123',
      serial_number: 'SEC-2026-X892',
      issued_at: '2026-08-24T12:00:00Z',
      track_name: 'AI Security Engineering',
      metadata: JSON.stringify({
        score_percentage: 96.0,
        verification_hash: 'abc123hash',
        issuer: 'Sri Charan Chowdary',
      }),
    });

    const cert = await getCertificateBySerial(mockDb, 'SEC-2026-X892');
    expect(cert).not.toBeNull();
    expect(cert?.metadata.score_percentage).toBe(96.0);
    expect(cert?.metadata.verification_hash).toBe('abc123hash');
  });
});
