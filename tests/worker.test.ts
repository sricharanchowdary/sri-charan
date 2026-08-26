import { describe, expect, it, vi } from 'vitest';
import worker from '../src/worker';

const assets = {
  fetch: vi.fn(async () => new Response('asset response', { status: 200 })),
};

// Mock D1 database — chains prepare().bind().run() and prepare().all()
const mockDB = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      run: vi.fn(async () => ({})),
      all: vi.fn(async () => ({ results: [] })),
    })),
    all: vi.fn(async () => ({ results: [] })),
    run: vi.fn(async () => ({})),
  })),
} as any;

const mockAI = {} as any;

const baseEnv = {
  ASSETS: assets,
  DB: mockDB,
  AI: mockAI,
};

describe('worker contact route', () => {
  it('returns validation errors for bad contact payloads', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name: 'S', email: 'bad', message: 'short' }),
      }),
      { ...baseEnv }
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
        ...baseEnv,
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
      { ...baseEnv }
    );
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('asset response');
  });

  it('returns 405 for non-POST requests to /api/contact', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', { method: 'GET' }),
      { ...baseEnv }
    );
    expect(response.status).toBe(405);
  });

  it('handles invalid JSON body gracefully', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        body: 'not-valid-json',
      }),
      { ...baseEnv }
    );
    expect(response.status).toBe(400);
  });

  it('returns weather data when OpenWeatherMap succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      name: 'Hyderabad',
      main: { temp: 28.5, feels_like: 31.0, humidity: 65 },
      weather: [{ description: 'clear sky', icon: '01d' }],
    }), { status: 200 })));

    const response = await worker.fetch(
      new Request('https://example.com/api/weather', { method: 'GET' }),
      { ...baseEnv, WEATHER_API_KEY: 'test_weather_key' }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      ok: true,
      fallback: false,
      weather: { city: 'Hyderabad', temp: 28.5 },
    });
  });

  it('returns fallback response when WEATHER_API_KEY is not configured', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/weather', { method: 'GET' }),
      { ...baseEnv }
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toMatchObject({
      ok: false,
      fallback: true,
      weather: { city: 'Hyderabad' },
    });
  });

  it('handles /api/academy/certificate/:serial lookup', async () => {
    const certDB = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => ({
            id: 'cert_123',
            user_id: 'usr_123',
            serial_number: 'SEC-2026-A1B2C',
            issued_at: '2026-08-24T00:00:00Z',
            track_name: 'AI Security Engineering',
            metadata: JSON.stringify({ score_percentage: 98.5, verification_hash: 'hash123', issuer: 'Academy' }),
          })),
        })),
      })),
    } as any;

    const response = await worker.fetch(
      new Request('https://example.com/api/academy/certificate/SEC-2026-A1B2C', { method: 'GET' }),
      { ...baseEnv, DB: certDB }
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    expect(data.ok).toBe(true);
    expect(data.certificate.serial_number).toBe('SEC-2026-A1B2C');
    expect(data.certificate.metadata.score_percentage).toBe(98.5);
  });

  it('returns 404 for non-existent certificate serial', async () => {
    const emptyDB = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => null),
        })),
      })),
    } as any;

    const response = await worker.fetch(
      new Request('https://example.com/api/academy/certificate/NONEXISTENT', { method: 'GET' }),
      { ...baseEnv, DB: emptyDB }
    );

    expect(response.status).toBe(404);
  });

  it('returns lab challenges list from /api/academy/labs', async () => {
    const labsDB = {
      prepare: vi.fn(() => ({
        all: vi.fn(async () => ({
          results: [
            { challenge_id: 'lab-01', title: 'Prompt Injection Defense', difficulty: 'beginner', created_at: '2026-08-24' },
          ],
        })),
      })),
    } as any;

    const response = await worker.fetch(
      new Request('https://example.com/api/academy/labs', { method: 'GET' }),
      { ...baseEnv, DB: labsDB }
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    expect(data.ok).toBe(true);
    expect(data.labs).toHaveLength(1);
    expect(data.labs[0].challenge_id).toBe('lab-01');
  });
});