import { describe, it, expect } from 'vitest';
import {
  OAUTH_PKCE_FLOW,
  PROMPT_INJECTION_DEFENSE_FLOW,
  WEBAUTHN_PASSKEY_FLOW,
  type FlowStep,
} from '../src/data/flows';

describe('FlowExplorer Data and Flow Logic', () => {
  it('should validate OAuth PKCE flow schema and sequential ordering', () => {
    expect(OAUTH_PKCE_FLOW.length).toBeGreaterThanOrEqual(4);

    OAUTH_PKCE_FLOW.forEach((step, index) => {
      expect(step.stepNumber).toBe(index + 1);
      expect(step.title).toBeTruthy();
      expect(step.sender).toBeTruthy();
      expect(step.receiver).toBeTruthy();
      expect(step.action).toBeTruthy();
      expect(step.explanation).toBeTruthy();
    });
  });

  it('should correctly extract unique participants in appearance order', () => {
    const extractParticipants = (steps: FlowStep[]) => {
      const participants: string[] = [];
      steps.forEach((s) => {
        if (s.sender && !participants.includes(s.sender)) participants.push(s.sender);
        if (s.receiver && !participants.includes(s.receiver)) participants.push(s.receiver);
      });
      return participants;
    };

    const oauthParticipants = extractParticipants(OAUTH_PKCE_FLOW);
    expect(oauthParticipants).toContain('Browser');
    expect(oauthParticipants).toContain('Identity Provider');
    expect(oauthParticipants).toContain('Actor');
    expect(oauthParticipants).toContain('API Server');
    expect(oauthParticipants[0]).toBe('Browser');
  });

  it('should calculate lane center coordinates accurately', () => {
    const participants = ['Browser', 'Identity Provider', 'Actor', 'API Server'];
    const getParticipantPercent = (name: string, list: string[]): number => {
      const idx = list.indexOf(name);
      if (idx === -1) return 50;
      if (list.length <= 1) return 50;
      return ((idx + 0.5) / list.length) * 100;
    };

    // 4 participants: 12.5%, 37.5%, 62.5%, 87.5%
    expect(getParticipantPercent('Browser', participants)).toBe(12.5);
    expect(getParticipantPercent('Identity Provider', participants)).toBe(37.5);
    expect(getParticipantPercent('Actor', participants)).toBe(62.5);
    expect(getParticipantPercent('API Server', participants)).toBe(87.5);
    expect(getParticipantPercent('Unknown', participants)).toBe(50);
  });

  it('should handle single-participant self loops gracefully', () => {
    const selfStep = OAUTH_PKCE_FLOW.find((s) => s.sender === s.receiver);
    expect(selfStep).toBeDefined();
    expect(selfStep?.sender).toBe(selfStep?.receiver);
  });

  it('should validate Prompt Injection flow with guardrails', () => {
    expect(PROMPT_INJECTION_DEFENSE_FLOW.length).toBe(5);
    const interceptStep = PROMPT_INJECTION_DEFENSE_FLOW.find((s) => s.sender === 'Guardrail Engine');
    expect(interceptStep).toBeDefined();
    expect(interceptStep?.codeSnippet).toContain('safe": false');
  });

  it('should validate WebAuthn Passkey registration flow', () => {
    expect(WEBAUTHN_PASSKEY_FLOW.length).toBe(5);
    expect(WEBAUTHN_PASSKEY_FLOW[0].sender).toBe('Browser');
    expect(WEBAUTHN_PASSKEY_FLOW[WEBAUTHN_PASSKEY_FLOW.length - 1].receiver).toBe('Database');
  });
});
