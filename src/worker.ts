import { jsonResponse, validateContactInput } from './lib/contact';

type D1Database = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      run: () => Promise<unknown>;
    };
  };
};

type Env = {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  DB?: D1Database;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, errors: { form: 'Method not allowed.' } }, 405);
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, errors: { form: 'Expected JSON body.' } }, 400);
      }

      const validation = validateContactInput(body);
      if (!validation.ok) {
        return jsonResponse({ ok: false, errors: validation.errors }, 400);
      }

      if (env.DB) {
        await env.DB
          .prepare(
            'INSERT INTO contact_submissions (name, email, message, ip_address, created_at) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(
            validation.value.name,
            validation.value.email,
            validation.value.message,
            request.headers.get('CF-Connecting-IP') ?? 'unknown',
            new Date().toISOString()
          )
          .run();
      } else {
        console.info('Contact submission received without D1 binding configured.', {
          name: validation.value.name,
          email: validation.value.email,
        });
      }

      return jsonResponse({
        ok: true,
        message: 'Thanks. Your message was received.',
      });
    }

    return env.ASSETS.fetch(request);
  },
};
