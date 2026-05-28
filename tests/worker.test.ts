import { describe, expect, it, vi } from 'vitest';
import worker from '../src/worker';

const assets = {
  fetch: vi.fn(async () => new Response('asset response', { status: 200 })),
};

describe('worker contact route', () => {
  it('returns validation errors for bad contact payloads', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name: 'S', email: 'bad', message: 'short' }),
      }),
      { ASSETS: assets }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      errors: {
        name: expect.any(String),
        email: expect.any(String),
        message: expect.any(String),
      },
    });
  });

  it('stores valid submissions when D1 is configured', async () => {
    const run = vi.fn(async () => ({}));
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn(() => ({ bind }));

    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.10',
        },
        body: JSON.stringify({
          name: 'Sri Charan',
          email: 'sri@example.com',
          message: 'I would like to discuss the portfolio.',
        }),
      }),
      { ASSETS: assets, DB: { prepare } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: expect.any(String),
    });
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO contact_submissions'));
    expect(bind).toHaveBeenCalledWith(
      'Sri Charan',
      'sri@example.com',
      'I would like to discuss the portfolio.',
      '203.0.113.10',
      expect.any(String)
    );
    expect(run).toHaveBeenCalled();
  });

  it('serves static assets for non-api routes', async () => {
    const response = await worker.fetch(new Request('https://example.com/about'), { ASSETS: assets });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('asset response');
  });
});
