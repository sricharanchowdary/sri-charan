/**
 * AI Security Guardrails: Allow/Deny Logic & Output Filtering
 * Protects against prompt injections, system prompt leaks, role hijacking, and credential exfiltration.
 */

// Known adversarial prompt injection signatures
const ADVERSARIAL_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+(in\s+)?(dan|developer\s+mode|unfiltered|jailbroken|evil)/i,
  /act\s+as\s+(an?\s+)?(unrestricted|unfiltered|evil|jailbroken|godmode|dan)\s+ai/i,
  /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|evil|jailbroken|different)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt|hidden\s+rules|api\s+keys?)/i,
  /show\s+me\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt|developer\s+instructions)/i,
  /repeat\s+(everything\s+)?(above|before\s+this|from\s+the\s+system\s+prompt)/i,
  /print\s+(the\s+)?(system\s+prompt|instructions\s+above|hidden\s+prompt)/i,
  /override\s+(all\s+)?(safety|system|security)\s+(protocols|rules|guidelines)/i,
  /system\s*:\s*override/i,
  /(encode|translate|convert|obfuscate).*?(base64|morse\s*code|rot13|ciphers?|hex|binary)/i,
  /(base64|morse\s*code|rot13|ciphers?|hex|binary).*?(encode|translate|convert|secret|prompt|instruction|reveal)/i,
  /(act\s+as|simulate|emulate|be)\s+(a\s+)?(linux\s+terminal|bash|shell|python\s+repl|cmd|powershell|sql\s+interpreter|console)/i,
  /!\[.*?\]\(https?:\/\//i, // Markdown image exfiltration attempt
  /<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<s>|<\/s>/i, // Special token injection
];

// Tone manipulation patterns
const TONE_MANIPULATION_PATTERNS = [
  /(respond|answer|speak|talk|write|translate)\s+(in|using|with|like)\s+(a\s+)?(pirate|slang|gen\s*z|uwu|baby\s+talk|pig\s+latin|yoda|shakespearean|alien|street\s+talk|dialect)/i,
];

// Blocked topics / sensitive keywords that must not be answered
const DENIED_TOPICS = [
  /\b(salary|compensation|hourly\s+rate|annual\s+package|ctc|pay\s+scale)\b/i,
  /\b(political\s+views|voting\s+history|religion|religious\s+beliefs)\b/i,
  /\b(medical\s+history|health\s+records|sexual\s+orientation)\b/i,
];

export interface SecurityCheckResult {
  safe: boolean;
  reason?: string;
  sanitizedResponse?: string;
}

/**
 * Validates incoming user prompt against adversarial injections, tone manipulation, and denied topic policies
 */
export function validatePromptSafety(input: string): SecurityCheckResult {
  // Check for tone manipulation / slang translation attempts
  for (const pattern of TONE_MANIPULATION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: 'tone_manipulation',
        sanitizedResponse:
          'I will maintain a professional, objective, and standard tone at all times in my responses.',
      };
    }
  }

  // Check for adversarial prompt injection / jailbreak attempts
  for (const pattern of ADVERSARIAL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: 'adversarial_injection',
        sanitizedResponse:
          "I am sorry, but I cannot fulfill that request.",
      };
    }
  }

  // Check for policy-denied topics
  for (const pattern of DENIED_TOPICS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: 'denied_topic',
        sanitizedResponse:
          "I'm not able to share that kind of information. The résumé focuses on professional skills, projects, and engineering experience.",
      };
    }
  }

  // Return explicit optional properties to satisfy callers that access them without narrowing
  return { safe: true, reason: undefined, sanitizedResponse: undefined };
}

/**
 * Explicit security checking function matching assignment signature
 */
export function checkSecurity(input: string): SecurityCheckResult {
  return validatePromptSafety(input);
}

/**
 * Alias for prompt validation ensuring explicit return type matching
 */
export function runSecurityCheck(input: string): SecurityCheckResult {
  return validatePromptSafety(input);
}

/**
 * Output post-filter: inspects LLM generated output to ensure no system instructions,
 * API secrets, or jailbreak affirmations leaked through.
 */
export function filterLLMOutput(output: string): string {
  // Check if output attempts to leak internal system prompt keywords
  const promptLeakPatterns = [
    /## RULES — follow these without exception/i,
    /## RÉSUMÉ DATA:/i,
    /Answer the user's question using ONLY the résumé data above/i,
    /ANTHROPIC_API_KEY|RESEND_API_KEY|ADMIN_PASSWORD|WEATHER_API_KEY/i,
  ];

  for (const pattern of promptLeakPatterns) {
    if (pattern.test(output)) {
      return "I can only provide information directly related to Sri Charan's résumé, projects, and skills. For more information, please visit /contact.";
    }
  }

  // Check if output accepted an adversarial persona (e.g. "I am now in Developer Mode")
  if (/(i am now in (developer mode|dan mode|god mode)|as an unrestricted ai)/i.test(output)) {
    return "I can only act as Sri Charan's portfolio assistant and answer questions about his professional background.";
  }

  // Strip any markdown image exfiltration payloads (![alt](url))
  if (/!\[.*?\]\(https?:\/\/[^\)]+\)/i.test(output)) {
    return output.replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/gi, '');
  }

  return output;
}
