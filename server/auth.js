/**
 * auth.js — human admin sessions.
 *
 * Two ways to be an admin:
 *   1. ADMIN_KEY header (machines: curl, scripts). Unchanged.
 *   2. Username + password at POST /api/auth/login (humans) -> opaque session
 *      token, held in memory. The token goes into localStorage on the client
 *      and is sent as `x-admin-token` / socket auth. Restarting the server
 *      logs everyone out — acceptable for one host, zero persistence risk.
 *
 * Credentials come ONLY from env (ADMIN_USER / ADMIN_PASSWORD). They are never
 * hardcoded: the repository is public.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { ADMIN_LOGIN_ENABLED, ADMIN_PASSWORD, ADMIN_SESSION_TTL_MS, ADMIN_USER } from './config.js';

/** token -> { createdAt, expiresAt } */
const sessions = new Map();

/** ip -> { fails, lockedUntil } — slows brute force to a crawl. */
const attempts = new Map();
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

/** Constant-time compare of two strings of any length. */
function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function login(username, password, ip) {
  if (!ADMIN_LOGIN_ENABLED) return { ok: false, reason: 'LOGIN_DISABLED' };

  const gate = attempts.get(ip) ?? { fails: 0, lockedUntil: 0 };
  if (Date.now() < gate.lockedUntil) return { ok: false, reason: 'LOCKED' };

  // & not && — both comparisons must always run, or the timing reveals which
  // field was wrong.
  const userOk = safeEqual(username ?? '', ADMIN_USER);
  const passOk = safeEqual(password ?? '', ADMIN_PASSWORD);
  if (!(userOk & passOk)) {
    gate.fails += 1;
    if (gate.fails >= MAX_FAILS) {
      gate.lockedUntil = Date.now() + LOCK_MS;
      gate.fails = 0;
    }
    attempts.set(ip, gate);
    return { ok: false, reason: 'BAD_CREDENTIALS' };
  }

  attempts.delete(ip);
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { createdAt: Date.now(), expiresAt: Date.now() + ADMIN_SESSION_TTL_MS });
  return { ok: true, token, expiresAt: sessions.get(token).expiresAt };
}

export function validateToken(token) {
  if (typeof token !== 'string' || !token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function logout(token) {
  sessions.delete(token);
}

// Expired sessions are also purged lazily on validate; this sweep just keeps the
// Map from accumulating tokens nobody ever presents again.
setInterval(
  () => {
    const now = Date.now();
    for (const [token, session] of sessions) {
      if (now > session.expiresAt) sessions.delete(token);
    }
  },
  10 * 60 * 1000,
).unref();
