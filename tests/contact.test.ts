import { describe, expect, it } from 'vitest';
import { validateContactInput } from '../src/lib/contact';

describe('validateContactInput', () => {
  it('accepts a valid contact submission', () => {
    const result = validateContactInput({
      name: 'Sri Charan',
      email: 'Sri@example.com',
      message: 'This is a useful project message.',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('sri@example.com');
    }
  });

  it('rejects missing and malformed fields', () => {
    const result = validateContactInput({
      name: 'S',
      email: 'not-an-email',
      message: 'short',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.email).toBeTruthy();
      expect(result.errors.message).toBeTruthy();
    }
  });

  it('rejects honeypot submissions', () => {
    const result = validateContactInput({
      name: 'Test User',
      email: 'test@example.com',
      message: 'A normal looking message.',
      company: 'spam',
    });

    expect(result.ok).toBe(false);
  });
  it('rejects empty input', () => {
    const result = validateContactInput({
      name: '',
      email: '',
      message: '',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects name with only spaces', () => {
    const result = validateContactInput({
      name: '   ',
      email: 'valid@example.com',
      message: 'This is a valid message for testing.',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects malformed email formats', () => {
    const emails = ['test@', '@gmail.com', 'plaintext'];
    emails.forEach((email) => {
      const result = validateContactInput({
        name: 'Sri Charan',
        email,
        message: 'This is a valid message for testing.',
      });
      expect(result.ok).toBe(false);
    });
  });

  it('rejects message that is too long', () => {
    const result = validateContactInput({
      name: 'Sri Charan',
      email: 'sri@example.com',
      message: 'a'.repeat(10001),
    });
    expect(result.ok).toBe(false);
  });
});
