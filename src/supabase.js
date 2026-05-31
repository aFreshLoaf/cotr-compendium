import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Storage key supabase-js uses for the session token: sb-<ref>-auth-token
function authStorageKey() {
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

// Purge a corrupt/unparseable token that would jam getSession() on load.
// Healthy (valid-JSON) tokens are left alone so sessions persist normally.
export function purgeCorruptAuthToken() {
  const key = authStorageKey();
  if (!key) return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    JSON.parse(raw);
    return false;
  } catch {
    try { localStorage.removeItem(key); } catch {}
    return true;
  }
}

// Last-resort self-heal: remove the auth token entirely.
export function clearAuthStorage() {
  const key = authStorageKey();
  if (key) { try { localStorage.removeItem(key); } catch {} }
}

if (supabaseConfigured) purgeCorruptAuthToken();

// No-op lock: bypass the Web Locks API (navigator.locks) that supabase-js uses
// to serialize auth operations across tabs. A stale/never-released lock causes
// getSession()/getUser() to hang forever on reload even with a perfectly valid
// token. For a single-user-per-browser app, cross-tab serialization is
// unnecessary, so we run the callback directly without acquiring any lock.
const noOpLock = async (_name, _acquireTimeout, fn) => fn();

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
        lock: noOpLock,
      },
    })
  : null;
