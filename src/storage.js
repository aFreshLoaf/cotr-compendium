import { supabase } from './supabase.js';

// The single row id used in compendium_content table.
const ROW_ID = 1;

// DM password — set via env var at build time.
// This is NOT a real auth system — it's a simple write guard.
// Anyone with the URL can read. Only someone with the password can write.
// Phase 3 will replace this with Supabase Auth + RLS.
const DM_PASSWORD = import.meta.env.VITE_DM_PASSWORD || '';

// ── Session password cache ─────────────────────────────────────────────────
// We store the verified password in sessionStorage so the DM doesn't have to
// re-enter it on every save within the same browser session.
const SESSION_KEY = 'cotr_dm_session';

export function isDMAuthenticated() {
  if (!DM_PASSWORD) return true; // No password configured — open write (dev mode)
  return sessionStorage.getItem(SESSION_KEY) === DM_PASSWORD;
}

export function authenticateDM(password) {
  if (!DM_PASSWORD) return true;
  if (password === DM_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, password);
    return true;
  }
  return false;
}

export function clearDMSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Load ───────────────────────────────────────────────────────────────────
// Returns the stored content JSON, or null if the row doesn't exist yet.
export async function loadFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('compendium_content')
      .select('content')
      .eq('id', ROW_ID)
      .maybeSingle();

    if (error) {
      console.error('[CotR] Supabase load error:', error.message);
      return null;
    }
    return data?.content ?? null;
  } catch (err) {
    console.error('[CotR] Supabase load exception:', err);
    return null;
  }
}

// ── Save ───────────────────────────────────────────────────────────────────
// Upserts the full content object. Throws if not DM-authenticated.
export async function saveToSupabase(content) {
  if (!isDMAuthenticated()) {
    throw new Error('Not authenticated as DM.');
  }
  try {
    const { error } = await supabase
      .from('compendium_content')
      .upsert({ id: ROW_ID, content, updated_at: new Date().toISOString() });

    if (error) {
      console.error('[CotR] Supabase save error:', error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('[CotR] Supabase save exception:', err);
    throw err;
  }
}

// ── Real-time subscription ─────────────────────────────────────────────────
// Call this to receive live updates when another client saves.
// Returns an unsubscribe function — call it on component unmount.
export function subscribeToUpdates(onUpdate) {
  const channel = supabase
    .channel('compendium_content_changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'compendium_content', filter: `id=eq.${ROW_ID}` },
      (payload) => {
        if (payload.new?.content) {
          onUpdate(payload.new.content);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
