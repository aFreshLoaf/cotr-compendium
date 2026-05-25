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

// ── Image upload ───────────────────────────────────────────────────────────
const MEDIA_BUCKET = 'compendium-media';

/**
 * Upload an image to Supabase Storage and return the public URL.
 * Path scheme: <category>/<entry-id>-<timestamp>.<ext>
 */
export async function uploadImage(file, category, entryId) {
  if (!isDMAuthenticated()) {
    throw new Error('Not authenticated as DM.');
  }
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase not configured — image uploads require Supabase.');
  }
  if (!file) throw new Error('No file provided.');

  // Derive extension from MIME type, default to png
  const mime = file.type || 'image/png';
  const ext = mime.split('/')[1]?.split(';')[0] || 'png';
  const safeEntry = (entryId || 'misc').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const path = `${category}/${safeEntry}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: mime,
    });

  if (uploadErr) {
    console.error('[CotR] Image upload error:', uploadErr.message);
    throw new Error(uploadErr.message);
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Delete an image from Supabase Storage given its full public URL or storage path.
 * Best-effort — failures are logged but not thrown (orphaned files are harmless).
 */
export async function deleteImage(urlOrPath) {
  if (!isDMAuthenticated()) return;
  if (!supabaseConfigured || !supabase || !urlOrPath) return;

  // Extract path from full URL if needed
  let path = urlOrPath;
  const marker = `/${MEDIA_BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx >= 0) path = urlOrPath.substring(idx + marker.length);

  try {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) console.warn('[CotR] Image delete warning:', error.message);
  } catch (err) {
    console.warn('[CotR] Image delete exception:', err);
  }
}
