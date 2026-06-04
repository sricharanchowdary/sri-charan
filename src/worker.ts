import { jsonResponse, validateContactInput } from './lib/contact';

type Env = {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
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

      if (env.RESEND_API_KEY && env.CONTACT_TO_EMAIL) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Portfolio Contact <onboarding@resend.dev>',
            to: env.CONTACT_TO_EMAIL,
            subject: `New message from ${validation.value.name}`,
            html: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${validation.value.name}</p>
              <p><strong>Email:</strong> ${validation.value.email}</p>
              <p><strong>Message:</strong></p>
              <p>${validation.value.message}</p>
            `,
          }),
        });
      } else {
        console.info('Contact submission received without Resend configured.', {
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