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

  it('sends email for valid submissions when Resend is configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'test' }), { status: 200 })));
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
      {
        ASSETS: assets,
        RESEND_API_KEY: 'test_key',
        CONTACT_TO_EMAIL: 'cc6391538@gmail.com',
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: expect.any(String),
    });
  });

  it('serves static assets for non-api routes', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/about'),
      { ASSETS: assets }
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('asset response');
  });

  it('returns 405 for non-POST requests to /api/contact', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'GET',
      }),
      { ASSETS: assets }
    );

    expect(response.status).toBe(405);
  });

  it('handles invalid JSON body gracefully', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        body: 'not-valid-json',
      }),
      { ASSETS: assets }
    );

    expect(response.status).toBe(400);
  });
});