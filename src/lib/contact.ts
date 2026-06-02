export type ContactInput = {
  name: string;
  email: string;
  message: string;
  company?: string;
};

export type ContactValidationResult =
  | { ok: true; value: ContactInput }
  | { ok: false; errors: Record<string, string> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactInput(input: unknown): ContactValidationResult {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Invalid request body.' } };
  }

  const value = input as Partial<Record<keyof ContactInput, unknown>>;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  const company = typeof value.company === 'string' ? value.company.trim() : '';

  if (company) {
    errors.form = 'Submission rejected.';
  }

  if (name.length < 2) {
    errors.name = 'Please enter at least 2 characters.';
  }

  if (!emailPattern.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (message.length < 10) {
    errors.message = 'Please enter at least 10 characters.';
  }

  if (message.length > 2000) {
    errors.message = 'Please keep the message under 2000 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { name, email, message, company } };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
