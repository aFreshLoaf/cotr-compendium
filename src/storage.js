import { supabase, supabaseConfigured } from './supabase.js';

const ROW_ID = 1;
const DM_PASSWORD = import.meta.env.VITE_DM_PASSWORD || '';
const SESSION_KEY = 'cotr_dm_session';

// ── Auth helpers ───────────────────────────────────────────────────────────
export function isDMAuthenticated() {
  if (!DM_PASSWORD) return true;
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
export async function loadFromSupabase() {
  if (!supabaseConfigured || !supabase) {
    console.warn('[CotR] Supabase not configured — running in local-only mode.');
    return null;
  }
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
export async function saveToSupabase(content) {
  if (!isDMAuthenticated()) {
    throw new Error('Not authenticated as DM.');
  }
  if (!supabaseConfigured || !supabase) {
    console.warn('[CotR] Supabase not configured — save skipped.');
    return;
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
export function subscribeToUpdates(onUpdate) {
  if (!supabaseConfigured || !supabase) {
    return () => {}; // no-op unsubscribe
  }
  const channel = supabase
    .channel('compendium_content_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'compendium_content',
        filter: `id=eq.${ROW_ID}`,
      },
      (payload) => {
        if (payload.new?.content) {
          onUpdate(payload.new.content);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
