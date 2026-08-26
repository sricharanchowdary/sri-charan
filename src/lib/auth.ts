import type { UserRecord, SessionRecord, AuthSessionValidation } from '../types/academy-db';
import { upsertUser } from './academy-service';

export const SESSION_COOKIE_NAME = 'app_session';
export const OAUTH_STATE_COOKIE = 'github_oauth_state';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 Days

/**
 * Generates a cryptographically secure random token string
 */
export function generateRandomToken(bytes = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates and persists a new session in D1
 */
export async function createSession(
  db: D1Database,
  sessionToken: string,
  userId: string
): Promise<SessionRecord> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(sessionToken, userId, expiresAt, now)
    .run();

  return {
    id: sessionToken,
    user_id: userId,
    expires_at: expiresAt,
    created_at: now,
  };
}

/**
 * Validates a session token and retrieves associated user
 * Extends session if less than 15 days remaining (rolling session)
 */
export async function validateSession(
  db: D1Database,
  sessionToken: string
): Promise<AuthSessionValidation> {
  if (!sessionToken || sessionToken.trim() === '') {
    return { session: null, user: null };
  }

  const row = await db
    .prepare(
      `SELECT
         s.id as session_id,
         s.user_id,
         s.expires_at,
         s.created_at as session_created_at,
         u.id as u_id,
         u.email,
         u.name,
         u.provider,
         u.created_at as u_created_at,
         u.updated_at as u_updated_at
       FROM sessions s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`
    )
    .bind(sessionToken)
    .first<any>();

  if (!row) {
    return { session: null, user: null };
  }

  const session: SessionRecord = {
    id: row.session_id,
    user_id: row.user_id,
    expires_at: row.expires_at,
    created_at: row.session_created_at,
  };

  const user: UserRecord = {
    id: row.u_id,
    email: row.email,
    name: row.name,
    provider: row.provider,
    created_at: row.u_created_at,
    updated_at: row.u_updated_at,
  };

  // Check expiration
  if (Date.now() >= session.expires_at) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionToken).run();
    return { session: null, user: null };
  }

  // Rolling renewal: if < 15 days remaining, extend expiration
  if (session.expires_at - Date.now() < 1000 * 60 * 60 * 24 * 15) {
    session.expires_at = Date.now() + SESSION_DURATION_MS;
    await db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
      .bind(session.expires_at, sessionToken)
      .run();
  }

  return { session, user };
}

/**
 * Invalidates and deletes a session
 */
export async function invalidateSession(db: D1Database, sessionToken: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionToken).run();
}

/**
 * Constructs the GitHub OAuth Authorization URL
 */
export function getGitHubAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('allow_signup', 'true');
  return url.toString();
}

/**
 * Exchanges GitHub authorization code for Access Token
 */
export async function exchangeGitHubCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'SriCharan-Academy-Auth',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`GitHub OAuth error: ${data.error || 'No access token returned'}`);
  }

  return data.access_token;
}

/**
 * Fetches user profile and verified email from GitHub API
 */
export async function fetchGitHubUser(accessToken: string): Promise<{
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}> {
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'SriCharan-Academy-Auth',
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!userRes.ok) {
    throw new Error(`Failed to fetch GitHub profile: ${userRes.statusText}`);
  }

  const profile = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
  };

  let primaryEmail = profile.email;

  // If email is private on profile, query emails endpoint
  if (!primaryEmail) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'SriCharan-Academy-Auth',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const verifiedPrimary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
      if (verifiedPrimary) {
        primaryEmail = verifiedPrimary.email;
      }
    }
  }

  const finalEmail = primaryEmail || `${profile.login}@users.noreply.github.com`;

  return {
    id: `gh_${profile.id}`,
    name: profile.name || profile.login,
    email: finalEmail.toLowerCase(),
    avatar_url: profile.avatar_url,
  };
}

/**
 * Cookie Header Generator Helper
 */
export function buildCookieHeader(
  name: string,
  value: string,
  options: { maxAge?: number; path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None' } = {}
): string {
  const {
    maxAge = 60 * 60 * 24 * 30, // 30 days
    path = '/',
    httpOnly = true,
    secure = true,
    sameSite = 'Lax',
  } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (maxAge !== undefined) cookie += `; Max-Age=${maxAge}`;
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';

  return cookie;
}
