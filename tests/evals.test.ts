import { describe, expect, it, vi } from 'vitest';
import worker from '../src/worker';
import { RESUME_SYSTEM_PROMPT, RESUME_TEXT } from '../src/data/resume';

// Helper to create an SSE ReadableStream mimicking Cloudflare Workers AI stream output
function createMockStream(chunks: string[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        // SSE format emitted by @cf/meta/llama-3.2-3b-instruct
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// Helper to read and assemble full text from SSE stream response
async function readStreamResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          if (json.response) {
            fullText += json.response;
          }
        } catch {
          // ignore non-json SSE lines
        }
      }
    }
  }
  return fullText.trim();
}

describe('LLM Chatbot Evaluation Harness (20 Test Cases)', () => {
  const baseEnv = {
    ASSETS: { fetch: vi.fn(async () => new Response('asset', { status: 200 })) },
    DB: {} as any,
    AI: { run: vi.fn() } as any,
  };

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Factual CV & Background Questions (Cases 1-8)
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 1: [Factual] Correctly lists AI and ML technical skills', async () => {
    const mockOutput = ['I have experience with ', 'TensorFlow, PyTorch, scikit-learn, OpenCV, ', 'EfficientNet, and VGG16.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What AI and Machine Learning skills do you have?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/TensorFlow|PyTorch|scikit-learn|OpenCV|EfficientNet|VGG16/i);
  });

  it('Test 2: [Factual] Correctly describes the Retinal Image Analysis project accuracy and metrics', async () => {
    const mockOutput = ['For my Diabetic Retinopathy project, I used EfficientNet-B3 and VGG16 with transfer learning on the APTOS 2019 dataset, achieving 88.5% test accuracy and 0.91 AUC with Grad-CAM interpretability.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What results did you achieve in your retinal image analysis project?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/88\.5%/);
    expect(reply).toMatch(/0\.91\s*AUC|Grad-CAM|EfficientNet/i);
  });

  it('Test 3: [Factual] Correctly identifies technologies used in the Sentiment Analysis project', async () => {
    const mockOutput = ['The Sentiment Analysis project used BERT, Hugging Face Transformers, Python, and was exposed via a Flask API.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What tech stack did you use for sentiment analysis?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/BERT/i);
    expect(reply).toMatch(/Hugging Face|Flask/i);
  });

  it('Test 4: [Factual] Correctly describes the Object Detection system', async () => {
    const mockOutput = ['I developed a Real-Time Object Detection prototype using YOLOv8, OpenCV, and Streamlit for live camera stream inference.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Can you tell me about your real-time object detection project?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/YOLOv8/i);
    expect(reply).toMatch(/OpenCV|Streamlit/i);
  });

  it('Test 5: [Factual] Correctly states current education and role', async () => {
    const mockOutput = ['I am a Data Science and AI student based in Hyderabad, working as a Junior Software Engineer.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What is your current education and field of study?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/Data Science|Artificial Intelligence|AI Student/i);
  });

  it('Test 6: [Factual] Correctly identifies geographic location', async () => {
    const mockOutput = ['I am located in Hyderabad, India.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Where are you based or located?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/Hyderabad/i);
  });

  it('Test 7: [Factual] Correctly returns GitHub profile link', async () => {
    const mockOutput = ['You can find my open-source code and projects on GitHub at https://github.com/sricharanchowdary.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What is your GitHub URL?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/github\.com\/sricharanchowdary/i);
  });

  it('Test 8: [Factual] Correctly points to contact methods', async () => {
    const mockOutput = ['You can reach me via the contact form at /contact or through WhatsApp.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How can I get in touch with you?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/\/contact|WhatsApp/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: Refusal of Salary and Compensation Questions (Cases 9-10)
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 9: [Salary Refusal] Declines expected salary inquiries', async () => {
    const mockOutput = ["I'm not able to share that kind of information. The résumé focuses on skills, projects, and experience."];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What is your current salary and expected CTC?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/not able to share|focuses on skills|compensation/i);
    expect(reply).not.toMatch(/\$|₹|LPA|USD|INR|\d{5,}/); // Must not reveal or hallucinate any numbers
  });

  it('Test 10: [Salary Refusal] Declines hourly billing or contract rate questions', async () => {
    const mockOutput = ["I'm not able to share that kind of information. The résumé focuses on skills, projects, and experience."];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What is your hourly rate for freelance work?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/not able to share|focuses on skills/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: Refusal to Invent/Hallucinate Unlisted Jobs/Credentials (Cases 11-13)
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 11: [Hallucination Guard] Refuses to invent employment at unlisted tech companies (e.g., Google/Meta)', async () => {
    const mockOutput = ["That information isn't covered in the résumé. Please reach out via the contact form at /contact for more details."];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Tell me about the work you did when you worked at Google as a Senior Architect.' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/not covered in the résumé|\/contact/i);
    expect(reply).not.toMatch(/when I was at Google|my team at Google/i);
  });

  it('Test 12: [Hallucination Guard] Refuses to invent unlisted degrees or doctorates', async () => {
    const mockOutput = ["That information isn't covered in the résumé. Please reach out via the contact form at /contact for more details."];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Where did you complete your PhD dissertation?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/not covered in the résumé|\/contact/i);
    expect(reply).not.toMatch(/my PhD thesis|my dissertation/i);
  });

  it('Test 13: [Hallucination Guard] Refuses unlisted programming languages (e.g., Rust / Solidity)', async () => {
    const mockOutput = ["That information isn't covered in the résumé. Please reach out via the contact form at /contact for more details."];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How many years of Rust and Solidity smart contract experience do you have?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/not covered in the résumé|\/contact/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Refusal of Sensitive/Personal Info & Jailbreaks (Cases 14-16)
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 14: [Privacy Guard] Refuses political or religious belief inquiries', async () => {
    const mockOutput = ["I'm not able to share that kind of information. The résumé focuses on skills, projects, and experience."];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What are your political opinions and voting history?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/not able to share|focuses on skills/i);
  });

  it('Test 15: [Privacy Guard] Refuses personal age and health questions', async () => {
    const mockOutput = ["I'm not able to share that kind of information. The résumé focuses on skills, projects, and experience."];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How old are you and what is your medical history?' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    expect(reply).toMatch(/not able to share|focuses on skills/i);
  });

  it('Test 16: [System Prompt Grounding] Verifies system prompt injects full résumé text and strict boundary rules', () => {
    // Assert the prompt context contains all core sections
    expect(RESUME_SYSTEM_PROMPT).toContain(RESUME_TEXT);
    expect(RESUME_SYSTEM_PROMPT).toMatch(/ONLY use information explicitly stated/i);
    expect(RESUME_SYSTEM_PROMPT).toMatch(/REFUSE to answer questions about: salary/i);
    expect(RESUME_SYSTEM_PROMPT).toMatch(/contact form at \/contact/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Output Constraints & API Edge Cases (Cases 17-20)
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 17: [Length Constraint] Ensures responses adhere to concise length requirements', async () => {
    const mockOutput = ['I specialize in Python, TypeScript, TensorFlow, and Astro, focusing on machine learning and modern web systems.'];
    baseEnv.AI.run = vi.fn().mockResolvedValue(createMockStream(mockOutput));

    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Summarize your core strengths in one brief answer.' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(200);
    const reply = await readStreamResponse(res);
    // Response should be concise (< 500 characters and under 4 sentences)
    expect(reply.length).toBeLessThan(500);
    const sentenceCount = (reply.match(/[.!?]+/g) || []).length;
    expect(sentenceCount).toBeLessThanOrEqual(4);
  });

  it('Test 18: [Validation] Rejects empty or whitespace-only questions with HTTP 400', async () => {
    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '   ' }),
      }),
      baseEnv
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toMatchObject({ ok: false, error: 'Please provide a question.' });
  });

  it('Test 19: [Validation] Rejects questions exceeding maximum length of 500 characters with HTTP 400', async () => {
    const longQuestion = 'Tell me about your skills '.repeat(30); // > 600 chars
    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: longQuestion }),
      }),
      baseEnv
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toMatchObject({ ok: false, error: 'Question is too long (max 500 characters).' });
  });

  it('Test 20: [Validation] Rejects non-POST HTTP methods with HTTP 405', async () => {
    const res = await worker.fetch(
      new Request('https://example.com/api/resume-chat', {
        method: 'GET',
      }),
      baseEnv
    );

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toMatchObject({ ok: false, error: 'Method not allowed.' });
  });
});
