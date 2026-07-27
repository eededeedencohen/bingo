import { useCallback, useEffect, useMemo, useState } from 'react';

import { SERVER_URL } from '../lib/socket';

const TOKEN_KEY = 'bingo:adminToken';

/**
 * Admin session state for the /admin page.
 *
 * Two credentials can unlock the panel:
 *   - a session token from the username/password login (stored in localStorage)
 *   - a legacy `?admin=<ADMIN_KEY>` URL parameter, kept working for tooling
 *
 * `credential` is what the rest of the app passes onward: { token } or { key }.
 */
export function useAdminAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  // null = still checking, false = show login, true = in
  const [authorized, setAuthorized] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const urlKey = useMemo(() => new URLSearchParams(window.location.search).get('admin'), []);

  // Validate the stored token once on mount; a dead token falls back to login.
  useEffect(() => {
    if (urlKey) {
      setAuthorized(true);
      return;
    }
    if (!token) {
      setAuthorized(false);
      return;
    }
    fetch(`${SERVER_URL}/api/auth/session`, { headers: { 'x-admin-token': token } })
      .then((r) => r.json())
      .then(({ ok }) => {
        if (!ok) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
        setAuthorized(ok);
      })
      .catch(() => setAuthorized(false));
  }, [token, urlKey]);

  const loginWith = useCallback(async (username, password) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(data.reason ?? 'BAD_CREDENTIALS');
        return false;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setAuthorized(true);
      return true;
    } catch {
      setError('NETWORK');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(() => {
    if (token) {
      fetch(`${SERVER_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAuthorized(false);
  }, [token]);

  /**
   * MEMOIZED on purpose: this object flows into useEffect dependencies (the
   * paper-board fetch, the socket admin_auth). A fresh object every render
   * would re-fire those effects on every render — each setState from them
   * triggers another render, and the admin panel strobes. Identity must only
   * change when the underlying credential actually does.
   */
  const credential = useMemo(
    () => (urlKey ? { key: urlKey } : token ? { token } : null),
    [urlKey, token],
  );

  return { authorized, busy, error, loginWith, signOut, credential };
}
