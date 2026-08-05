import { jsonResponse, validateContactInput } from './lib/contact';
import { posts } from './data/site';

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  ANTHROPIC_API_KEY?: string;
  AI: Ai;
  DB: D1Database;
  ADMIN_PASSWORD?: string;
};

const SYSTEM_PROMPT = `You are Sri Charan's portfolio assistant. Answer questions about Sri Charan based on this information:

Name: Sri Charan Chowdary
Role: Data Science and AI Student, Junior Software Engineer
Location: Hyderabad, India
GitHub: https://github.com/sricharanchowdary

Skills:
- Languages: Python, TypeScript, JavaScript, SQL
- AI/ML: TensorFlow, PyTorch, scikit-learn, OpenCV, EfficientNet, VGG16
- Web: Astro, Tailwind CSS, HTML, Cloudflare Workers
- Tools: Git, Docker, Wrangler, GitHub Actions

Projects:
1. Retinal Image Analysis for Diabetic Retinopathy - Deep learning pipeline using EfficientNet-B3 and VGG16, 88.5% accuracy, 0.91 AUC
2. Sentiment Analysis on Product Reviews - NLP with BERT and Hugging Face
3. Real-Time Object Detection System - YOLOv8 and OpenCV with Streamlit

Education: Data Science and AI student
Interests: Computer vision, deep learning, deployment workflows, explainable AI

Contact: Use the contact form at /contact or WhatsApp

Keep answers short, friendly and helpful. If asked something you don't know, say you're not sure and suggest visiting the relevant page.`;

// Creates a stateless session token from the admin password using HMAC-SHA256
async function createSessionToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('admin-session'));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Checks if the request carries a valid admin session cookie
async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return false;
  const expected = await createSessionToken(env.ADMIN_PASSWORD);
  return match[1] === expected;
}

// Server-side input validation (strips HTML, enforces length limits)
function sanitize(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/<[^>]*>/g, '');
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // ── GET /api/posts ───────────────────────────────────────────
    if (url.pathname === '/api/posts' && request.method === 'GET') {
      const list = posts.map(({ slug, title, date, description }) => ({
        slug,
        title,
        date,
        description,
      }));
      return jsonResponse({ ok: true, posts: list });
    }

    // ── GET /api/posts/:slug ─────────────────────────────────────
    const postMatch = url.pathname.match(/^\/api\/posts\/([a-z0-9-]+)$/);
    if (postMatch && request.method === 'GET') {
      const slug = postMatch[1];
      const post = posts.find((p) => p.slug === slug);

      if (!post) {
        return jsonResponse({ ok: false, error: 'Post not found.' }, 404);
      }

      return jsonResponse({ ok: true, post });
    }

    // ── POST /api/contact ──────────────────────────────────────────
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

      const { name, email, message } = validation.value;

      // Extra server-side sanitization
      const safeName    = sanitize(name,    100);
      const safeEmail   = sanitize(email,   254);
      const safeMessage = sanitize(message, 2000);

      if (!safeName || !safeEmail || !safeMessage) {
        return jsonResponse({ ok: false, errors: { form: 'Invalid input.' } }, 400);
      }

      // Persist to D1
      await env.DB.prepare(
        `INSERT INTO contact_submissions (name, email, message, submitted_at)
         VALUES (?, ?, ?, ?)`
      ).bind(safeName, safeEmail, safeMessage, new Date().toISOString()).run();

      // Send email via Resend (existing behaviour preserved)
      if (env.RESEND_API_KEY && env.CONTACT_TO_EMAIL) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Portfolio Contact <onboarding@resend.dev>',
            to: env.CONTACT_TO_EMAIL,
            subject: `New message from ${safeName}`,
            html: `<h2>New Contact Form Submission</h2>
                   <p><strong>Name:</strong> ${safeName}</p>
                   <p><strong>Email:</strong> ${safeEmail}</p>
                   <p><strong>Message:</strong></p>
                   <p>${safeMessage}</p>`,
          }),
        });
      }

      return jsonResponse({ ok: true, message: 'Thanks. Your message was received.' });
    }

    // ── POST /api/admin/login ──────────────────────────────────────
    if (url.pathname === '/api/admin/login') {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
      }

      let body: { password?: string };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'Expected JSON body.' }, 400);
      }

      if (!env.ADMIN_PASSWORD || body.password !== env.ADMIN_PASSWORD) {
        return jsonResponse({ ok: false, error: 'Invalid password.' }, 401);
      }

      const token = await createSessionToken(env.ADMIN_PASSWORD);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
        },
      });
    }

    // ── POST /api/admin/logout ─────────────────────────────────────
    if (url.pathname === '/api/admin/logout') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
        },
      });
    }

    // ── GET /api/admin/submissions (protected) ─────────────────────
    if (url.pathname === '/api/admin/submissions' && request.method === 'GET') {
      if (!(await isAuthenticated(request, env))) {
        return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
      }

      const { results } = await env.DB.prepare(
        `SELECT id, name, email, message, submitted_at
         FROM contact_submissions
         WHERE is_deleted = 0
         ORDER BY submitted_at DESC`
      ).all();

      return jsonResponse({ ok: true, submissions: results });
    }

    // ── DELETE /api/admin/submissions/:id (protected, soft delete) ─
    const deleteMatch = url.pathname.match(/^\/api\/admin\/submissions\/(\d+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      if (!(await isAuthenticated(request, env))) {
        return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
      }

      const id = parseInt(deleteMatch[1], 10);
      await env.DB.prepare(
        'UPDATE contact_submissions SET is_deleted = 1 WHERE id = ?'
      ).bind(id).run();

      return jsonResponse({ ok: true, message: 'Submission removed.' });
    }

    // ── POST /api/chat ─────────────────────────────────────────────
    if (url.pathname === '/api/chat') {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
      }

      if (!env.ANTHROPIC_API_KEY) {
        return jsonResponse({ ok: false, error: 'Chat is not configured.' }, 500);
      }

      let body: { messages?: { role: string; content: string }[] };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'Expected JSON body.' }, 400);
      }

      const messages = body.messages ?? [];
      const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      });

      const reply = (aiResponse as any).response ?? "I'm not sure about that. Try visiting the relevant page!";
      return jsonResponse({ ok: true, reply });
    }

    // ── Static assets fallback ─────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};