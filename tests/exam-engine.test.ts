import { describe, it, expect, vi } from 'vitest';
import {
  EXAM_QUESTION_BANK,
  gradeExamSubmission,
  generateCertificateSerial,
  getPublicExamQuestions,
} from '../src/lib/exam-engine';
import worker from '../src/worker';

describe('Server-Side Exam Scoring & Certificate Engine', () => {
  it('should have a rich, valid server-side question bank', () => {
    expect(EXAM_QUESTION_BANK.length).toBeGreaterThanOrEqual(5);

    EXAM_QUESTION_BANK.forEach((q) => {
      expect(q.id).toBeDefined();
      expect(q.question).toBeTruthy();
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.explanation).toBeTruthy();
      expect(q.topic).toBeTruthy();
    });
  });

  it('should omit correctIndex when providing public question bank to clients', () => {
    const publicQuestions = getPublicExamQuestions();
    expect(publicQuestions).toHaveLength(EXAM_QUESTION_BANK.length);

    publicQuestions.forEach((q: any) => {
      expect(q.correctIndex).toBeUndefined();
      expect(q.question).toBeTruthy();
      expect(q.options).toBeDefined();
    });
  });

  it('should accurately grade a 100% perfect exam submission', () => {
    const perfectAnswers: Record<number, number> = {};
    EXAM_QUESTION_BANK.forEach((q) => {
      perfectAnswers[q.id] = q.correctIndex;
    });

    const result = gradeExamSubmission(perfectAnswers);
    expect(result.scorePercentage).toBe(100);
    expect(result.correctCount).toBe(EXAM_QUESTION_BANK.length);
    expect(result.passed).toBe(true);
  });

  it('should fail an exam submission below 80%', () => {
    // Answer only 1 question correctly
    const failingAnswers: Record<number, number> = {
      1: EXAM_QUESTION_BANK[0].correctIndex,
      2: (EXAM_QUESTION_BANK[1].correctIndex + 1) % 4,
      3: (EXAM_QUESTION_BANK[2].correctIndex + 1) % 4,
      4: (EXAM_QUESTION_BANK[3].correctIndex + 1) % 4,
      5: (EXAM_QUESTION_BANK[4].correctIndex + 1) % 4,
    };

    const result = gradeExamSubmission(failingAnswers);
    expect(result.scorePercentage).toBeLessThan(80);
    expect(result.passed).toBe(false);
  });

  it('should generate properly formatted serial numbers', () => {
    const serial1 = generateCertificateSerial();
    const serial2 = generateCertificateSerial();

    expect(serial1).toMatch(/^IA-SEC-[A-F0-9]{5}$/);
    expect(serial2).toMatch(/^IA-SEC-[A-F0-9]{5}$/);
    expect(serial1).not.toBe(serial2);
  });

  it('should grade and issue certificate via POST /api/exam/submit on Cloudflare Worker', async () => {
    const mockDB = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as any;

    const perfectAnswers: Record<number, number> = {};
    EXAM_QUESTION_BANK.forEach((q) => {
      perfectAnswers[q.id] = q.correctIndex;
    });

    const response = await worker.fetch(
      new Request('https://example.com/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: perfectAnswers,
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
        }),
      }),
      {
        ASSETS: { fetch: vi.fn() },
        AI: {} as any,
        DB: mockDB,
      }
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    expect(data.ok).toBe(true);
    expect(data.passed).toBe(true);
    expect(data.score).toBe(100);
    expect(data.serialNumber).toMatch(/^IA-SEC-[A-F0-9]{5}$/);
    expect(data.shareableUrl).toBe(`/verify?serial=${data.serialNumber}`);
  });
});
