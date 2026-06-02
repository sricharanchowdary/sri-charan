import { describe, it, expect } from 'vitest';
import worker from './worker';

describe('Worker /api/contact', () => {
  it('returns 405 for GET', async () => {
    const req = new Request('https://example.com/api/contact', { method: 'GET' });
    const resp = await worker.fetch(req as unknown as Request, { ASSETS: { fetch: async () => new Response('ok') } } as any);
    expect(resp.status).toBe(405);
  });

  it('accepts valid POST and returns ok true', async () => {
    const payload = { name: 'Alice', email: 'alice@example.com', message: 'This is a test message long enough.' };
    const req = new Request('https://example.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const resp = await worker.fetch(req as unknown as Request, { ASSETS: { fetch: async () => new Response('ok') } } as any);
    const json = await resp.json();
    expect(resp.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
