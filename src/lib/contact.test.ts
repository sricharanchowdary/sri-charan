import { describe, it, expect } from 'vitest';
import { validateContactInput } from './contact';

describe('validateContactInput', () => {
  it('accepts valid input', () => {
    const res = validateContactInput({
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Hello world, this is a valid message.',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.name).toBe('Alice');
      expect(res.value.email).toBe('alice@example.com');
    }
  });

  it('rejects short name', () => {
    const res = validateContactInput({ name: 'A', email: 'a@b.com', message: 'Long enough message' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toHaveProperty('name');
  });

  it('rejects invalid email', () => {
    const res = validateContactInput({ name: 'Alice', email: 'not-an-email', message: 'Long enough message' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toHaveProperty('email');
  });

  it('rejects short message', () => {
    const res = validateContactInput({ name: 'Alice', email: 'a@b.com', message: 'short' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toHaveProperty('message');
  });

  it('rejects honeypot company field', () => {
    const res = validateContactInput({ name: 'Alice', email: 'a@b.com', message: 'Long enough message', company: 'Acme' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toHaveProperty('form');
  });
});
