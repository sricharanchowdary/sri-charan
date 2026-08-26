import { defineMiddleware } from 'astro:middleware';
import { validateSession, SESSION_COOKIE_NAME } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals } = context;

  // Initialize locals
  locals.user = null;
  locals.session = null;

  // Read session cookie
  const sessionCookie = cookies.get(SESSION_COOKIE_NAME)?.value;

  // Obtain D1 database reference from Cloudflare runtime env if available
  const db = (context as any).locals?.runtime?.env?.DB;

  if (sessionCookie && db) {
    try {
      const { user, session } = await validateSession(db, sessionCookie);
      locals.user = user;
      locals.session = session;
    } catch (err) {
      console.error('Session validation error in middleware:', err);
    }
  }

  return next();
});
