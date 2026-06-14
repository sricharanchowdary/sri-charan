import { jsonResponse, validateContactInput } from './lib/contact';

type Env = {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  ANTHROPIC_API_KEY?: string;
  AI: Ai;
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
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ],
});

const reply = (aiResponse as any).response || "I'm not sure about that. Try visiting the relevant page!";

      return jsonResponse({ ok: true, reply });
    }

    return env.ASSETS.fetch(request);
  },
};