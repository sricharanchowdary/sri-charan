import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateRandomToken,
  createSession,
  validateSession,
  invalidateSession,
  getGitHubAuthorizationUrl,
  buildCookieHeader,
  SESSION_COOKIE_NAME,
  OAUTH_STATE_COOKIE,
  SESSION_DURATION_MS,
} from '../src/lib/auth';

describe('Auth & Session Management with Cloudflare D1', () => {
  let mockDb: any;
  let mockStmt: any;

  beforeEach(() => {
    mockStmt = {
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true }),
      first: vi.fn(),
      all: vi.fn(),
    };

    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStmt),
    };
  });

  it('should generate secure random hex tokens', () => {
    const token1 = generateRandomToken(16);
    const token2 = generateRandomToken(16);
    expect(token1).toHaveLength(32);
    expect(token2).toHaveLength(32);
    expect(token1).not.toBe(token2);
  });

  it('should create and insert a new session in D1 with 30-day expiration', async () => {
    const token = 'test_session_token_123';
    const userId = 'usr_abc456';

    const session = await createSession(mockDb, token, userId);

    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sessions'));
    expect(mockStmt.bind).toHaveBeenCalledWith(
      token,
      userId,
      expect.any(Number),
      expect.any(String)
    );
    expect(session.id).toBe(token);
    expect(session.user_id).toBe(userId);
    expect(session.expires_at).toBeGreaterThan(Date.now() + SESSION_DURATION_MS - 5000);
  });

  it('should return null for empty or invalid session tokens', async () => {
    const res = await validateSession(mockDb, '');
    expect(res.user).toBeNull();
    expect(res.session).toBeNull();
  });

  it('should validate and return user and session for active session', async () => {
    const futureExpiry = Date.now() + 1000 * 60 * 60 * 24 * 25; // 25 days in future

    mockStmt.first.mockResolvedValueOnce({
      session_id: 'active_token_123',
      user_id: 'usr_789',
      expires_at: futureExpiry,
      session_created_at: '2026-08-24T00:00:00Z',
      u_id: 'usr_789',
      email: 'student@example.com',
      name: 'Alice Dev',
      provider: 'github',
      u_created_at: '2026-08-24T00:00:00Z',
      u_updated_at: '2026-08-24T00:00:00Z',
    });

    const { session, user } = await validateSession(mockDb, 'active_token_123');

    expect(session).not.toBeNull();
    expect(user).not.toBeNull();
    expect(user?.email).toBe('student@example.com');
    expect(user?.provider).toBe('github');
    expect(session?.id).toBe('active_token_123');
  });

  it('should delete expired sessions and return null', async () => {
    const pastExpiry = Date.now() - 10000; // expired

    mockStmt.first.mockResolvedValueOnce({
      session_id: 'expired_token',
      user_id: 'usr_789',
      expires_at: pastExpiry,
      session_created_at: '2026-07-01T00:00:00Z',
      u_id: 'usr_789',
      email: 'student@example.com',
      name: 'Alice Dev',
      provider: 'github',
      u_created_at: '2026-07-01T00:00:00Z',
      u_updated_at: '2026-07-01T00:00:00Z',
    });

    const { session, user } = await validateSession(mockDb, 'expired_token');

    expect(session).toBeNull();
    expect(user).toBeNull();
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM sessions WHERE id = ?'));
  });

  it('should invalidate and delete session on logout', async () => {
    await invalidateSession(mockDb, 'token_to_delete');
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM sessions WHERE id = ?'));
    expect(mockStmt.bind).toHaveBeenCalledWith('token_to_delete');
  });

  it('should construct GitHub authorization URL with required scopes and state', () => {
    const urlStr = getGitHubAuthorizationUrl(
      'client_id_123',
      'https://example.com/api/auth/github/callback',
      'state_token_xyz'
    );
    const url = new URL(urlStr);

    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client_id_123');
    expect(url.searchParams.get('state')).toBe('state_token_xyz');
    expect(url.searchParams.get('scope')).toContain('read:user');
  });

  it('should format HttpOnly secure cookie headers properly', () => {
    const cookie = buildCookieHeader(SESSION_COOKIE_NAME, 'sample_token_value', {
      maxAge: 3600,
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    });

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=sample_token_value`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=3600');
  });
});
