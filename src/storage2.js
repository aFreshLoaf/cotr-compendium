import { supabase, supabaseConfigured } from './supabase.js';

// ============================================================
// STORAGE v2 — per-entry rows (content_entries) + Supabase Auth
// ------------------------------------------------------------
// The compendium is stored as one row per entry in `content_entries`:
//   id, kind, data (public jsonb), dm_data (staff-only jsonb), owner_id, sort_order
// loadContent reassembles these rows into the single content object the app
// expects. saveContent diffs and writes only changed entries to the right columns.
//
// DM content: dmOnly sections + inline `dm` blocks live in dm_data and are only
// fetched for staff (RLS + app-level select). For non-staff, dm_data is never
// requested, so it never reaches the browser.
// ============================================================

// Singleton row ids (non-entry content)
const SINGLETON_META = '__meta';
const SINGLETON_HOME = '__home';
const SINGLETON_CAMPAIGN = '__campaign';
const SINGLETON_CAMPAIGNS = '__campaigns';
const SINGLETON_RACE_ORDER = '__raceOrder';
const SINGLETON_CAMPAIGN_ORDER = '__campaignOrder';
const SINGLETON_PARENT_CLASS_ORDER = '__parentClassOrder';

// ── Auth ────────────────────────────────────────────────────────────────────

// Wrap a promise so it can never hang: resolves to TIMEOUT sentinel after `ms`.
const TIMEOUT = Symbol('timeout');
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), ms)),
  ]);
}

export async function getSession() {
  if (!supabaseConfigured) return null;
  try {
    const result = await withTimeout(supabase.auth.getSession(), 4000);
    if (result === TIMEOUT) {
      // The session call jammed (typically an expired token whose refresh hangs).
      // Purge the auth storage so the next load is clean, and continue as public
      // view. The user simply signs in again — an expired/jammed token is
      // worthless anyway. This prevents the overnight-inactivity hang.
      console.warn('[CotR] getSession timed out — clearing auth storage and continuing as public view.');
      try {
        const { clearAuthStorage } = await import('./supabase.js');
        clearAuthStorage();
      } catch {}
      return null;
    }
    return result?.data?.session ?? null;
  } catch (e) {
    console.error('[CotR] getSession error:', e);
    return null;
  }
}

export async function getProfile() {
  if (!supabaseConfigured) return null;
  try {
    const userRes = await withTimeout(supabase.auth.getUser(), 4000);
    if (userRes === TIMEOUT) { console.warn('[CotR] getUser timed out'); return null; }
    const user = userRes?.data?.user;
    if (!user) return null;
    const res = await withTimeout(
      supabase.from('profiles').select('id, role, owned_chars, display_name').eq('id', user.id).maybeSingle(),
      4000
    );
    // On timeout or error we return null ("couldn't determine") rather than a
    // fabricated player profile — fabricating one would silently demote an
    // admin/dm on a transient failure (e.g. token refresh on tab return).
    if (res === TIMEOUT) { console.warn('[CotR] profile query timed out'); return null; }
    if (res.error) { console.error('[CotR] profile load error:', res.error.message); return null; }
    // Query succeeded. If a row exists, use it. If genuinely no row (should not
    // happen — the signup trigger creates one — but handle gracefully), treat as
    // a default player since the query itself worked.
    if (res.data) return res.data;
    return { id: user.id, role: 'player', owned_chars: [], display_name: user.email };
  } catch (e) {
    console.error('[CotR] getProfile exception:', e);
    return null;
  }
}

export async function signInWithDiscord() {
  if (!supabaseConfigured) throw new Error('Supabase not configured.');
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signInWithEmail(email) {
  if (!supabaseConfigured) throw new Error('Supabase not configured.');
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabaseConfigured) return;
  await supabase.auth.signOut();
}

export function onAuthChange(cb) {
  if (!supabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data?.subscription?.unsubscribe();
}

function isStaffRole(role) {
  return role === 'admin' || role === 'dm';
}

// ── DM data reassembly (staff only) ──────────────────────────────────────────
// Mirror of the migration's split: dm_data.sections holds whole dmOnly sections
// plus inline-fragment records ({__inlineFor, fragments:[{at, block}]}). For staff
// we merge these back into the entry's sections so the app sees the full content.

function reinsertBlock(section, at, block) {
  const m = at.match(/^(\w+)(?:\[(\d+)\]\.(\w+))?\[(\d+)\]$/);
  if (!m) return;
  const [, field1, fIdx, field2, blockIdx] = m;
  if (field2 === undefined) {
    if (!Array.isArray(section[field1])) section[field1] = [];
    section[field1].splice(Number(blockIdx), 0, block);
  } else {
    const arr = section[field1];
    if (!arr || !arr[Number(fIdx)]) return;
    const sub = arr[Number(fIdx)];
    if (!Array.isArray(sub[field2])) sub[field2] = [];
    sub[field2].splice(Number(blockIdx), 0, block);
  }
}

function mergeDmIntoEntry(dataObj, dmData) {
  const entry = { ...dataObj };
  const dm = dmData || {};
  if (!Array.isArray(dm.sections)) return entry;
  const sections = [...(entry.sections || [])];
  const whole = dm.sections.filter((s) => !s.__inlineFor);
  const inline = dm.sections.filter((s) => s.__inlineFor);
  for (const frag of inline) {
    const target = sections.find((s) => s.id === frag.__inlineFor);
    if (!target) continue;
    for (const f of frag.fragments) reinsertBlock(target, f.at, f.block);
  }
  for (const s of whole) sections.push(s);
  entry.sections = sections;
  return entry;
}

// Split an entry (full, staff-edited) back into {data, dm_data} for saving.
// (Same algorithm as migrate.mjs.)
const ENC_PREFIX = 'enc::v1::';
function scrubInlineDmBlocks(sec) {
  const dmFragments = [];
  const publicSec = { ...sec };
  const scrubBlocks = (blocks, locator) => {
    if (!Array.isArray(blocks)) return blocks;
    const kept = [];
    blocks.forEach((b, idx) => {
      if (b.type === 'dm') {
        if (typeof b.body === 'string' && b.body.startsWith(ENC_PREFIX)) return; // drop stale ciphertext
        dmFragments.push({ at: `${locator}[${idx}]`, block: b });
        return;
      }
      kept.push(b);
    });
    return kept;
  };
  if (Array.isArray(publicSec.body)) publicSec.body = scrubBlocks(publicSec.body, 'body');
  if (Array.isArray(publicSec.features)) publicSec.features = publicSec.features.map((f, fi) =>
    Array.isArray(f.text) ? { ...f, text: scrubBlocks(f.text, `features[${fi}].text`) } : f);
  if (Array.isArray(publicSec.entries)) publicSec.entries = publicSec.entries.map((e, ei) => {
    const eo = { ...e };
    if (Array.isArray(eo.description)) eo.description = scrubBlocks(eo.description, `entries[${ei}].description`);
    if (Array.isArray(eo.features)) eo.features = eo.features.map((f, fi) =>
      Array.isArray(f.body) ? { ...f, body: scrubBlocks(f.body, `entries[${ei}].features[${fi}].body`) } : f);
    return eo;
  });
  return { publicSec, dmFragments };
}

function splitEntryForSave(entry) {
  const publicSections = [];
  const dmSections = [];
  for (const sec of (entry.sections || [])) {
    if (sec.dmOnly) { dmSections.push(sec); continue; }
    const { publicSec, dmFragments } = scrubInlineDmBlocks(sec);
    publicSections.push(publicSec);
    if (dmFragments.length) dmSections.push({ __inlineFor: sec.id, fragments: dmFragments });
  }
  const data = { ...entry, sections: publicSections };
  const dm_data = dmSections.length ? { sections: dmSections } : {};
  return { data, dm_data };
}

// ── Load ──────────────────────────────────────────────────────────────────
// Reassembles all rows into the content object. `isStaff` controls whether
// dm_data is fetched and merged. Non-staff never request dm_data.

export async function loadContent2(isStaff) {
  if (!supabaseConfigured || !supabase) {
    console.warn('[CotR] Supabase not configured — running in local-only mode.');
    return null;
  }
  try {
    const columns = isStaff ? 'id, kind, data, dm_data, owner_id, sort_order' : 'id, kind, data, owner_id, sort_order';
    const { data: rows, error } = await supabase
      .from('content_entries')
      .select(columns)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[CotR] content_entries load error:', error.message);
      return null;
    }
    if (!rows || rows.length === 0) return null;

    const content = {
      subclasses: [], races: [], classes: [], characters: [], items: [], locations: [],
      meta: {}, home: {}, campaign: {}, campaigns: {},
      raceOrder: [], campaignOrder: [], parentClassOrder: [],
    };

    for (const row of rows) {
      const merged = (isStaff && row.dm_data)
        ? mergeDmIntoEntry(row.data, row.dm_data)
        : row.data;
      // attach owner_id onto character entries so the app can gate editing
      switch (row.kind) {
        case 'subclass': content.subclasses.push(merged); break;
        case 'race':     content.races.push(merged); break;
        case 'class':    content.classes.push(merged); break;
        case 'item':     content.items.push(merged); break;
        case 'location': content.locations.push(merged); break;
        case 'character':
          content.characters.push({ ...merged, owner_id: row.owner_id ?? null });
          break;
        case 'home': content.home = row.data; break;
        case 'campaign': content.campaign = row.data; break;
        case 'meta':
          if (row.id === SINGLETON_META) content.meta = row.data;
          else if (row.id === SINGLETON_CAMPAIGNS) content.campaigns = row.data.campaigns || {};
          else if (row.id === SINGLETON_RACE_ORDER) content.raceOrder = row.data.raceOrder || [];
          else if (row.id === SINGLETON_CAMPAIGN_ORDER) content.campaignOrder = row.data.campaignOrder || [];
          else if (row.id === SINGLETON_PARENT_CLASS_ORDER) content.parentClassOrder = row.data.parentClassOrder || [];
          break;
        default: break;
      }
    }
    return content;
  } catch (err) {
    console.error('[CotR] content_entries load exception:', err);
    return null;
  }
}

// ── Save ────────────────────────────────────────────────────────────────────
// Diffs the new content against a snapshot of what was loaded, and upserts only
// the entries that changed. Each collection entry is one row; singletons are rows.
// RLS enforces who can write what (staff: anything; player: own character).

function buildRowMap(content) {
  const rows = [];
  const push = (id, kind, data, extra = {}) => rows.push({ id, kind, data, ...extra });

  (content.subclasses || []).forEach((e, i) => {
    const { data, dm_data } = splitEntryForSave(e);
    push(e.id, 'subclass', data, { dm_data, sort_order: i });
  });
  (content.races || []).forEach((e, i) => {
    const { data, dm_data } = splitEntryForSave(e);
    push(e.id, 'race', data, { dm_data, sort_order: i });
  });
  (content.classes || []).forEach((e, i) => {
    const { data, dm_data } = splitEntryForSave(e);
    push(e.id, 'class', data, { dm_data, sort_order: i });
  });
  (content.characters || []).forEach((e, i) => {
    const { owner_id, ...rest } = e;
    const { data, dm_data } = splitEntryForSave(rest);
    push(e.id, 'character', data, { dm_data, sort_order: i });
  });
  (content.items || []).forEach((e, i) => {
    const { data, dm_data } = splitEntryForSave(e);
    push(e.id, 'item', data, { dm_data, sort_order: i });
  });
  (content.locations || []).forEach((e, i) => {
    const { data, dm_data } = splitEntryForSave(e);
    push(e.id, 'location', data, { dm_data, sort_order: i });
  });

  push(SINGLETON_META, 'meta', content.meta || {}, { sort_order: 10000 });
  push(SINGLETON_HOME, 'home', content.home || {}, { sort_order: 10001 });
  push(SINGLETON_CAMPAIGN, 'campaign', content.campaign || {}, { sort_order: 10002 });
  push(SINGLETON_CAMPAIGNS, 'meta', { campaigns: content.campaigns || {} }, { sort_order: 10003 });
  push(SINGLETON_RACE_ORDER, 'meta', { raceOrder: content.raceOrder || [] }, { sort_order: 10004 });
  push(SINGLETON_CAMPAIGN_ORDER, 'meta', { campaignOrder: content.campaignOrder || [] }, { sort_order: 10005 });
  push(SINGLETON_PARENT_CLASS_ORDER, 'meta', { parentClassOrder: content.parentClassOrder || [] }, { sort_order: 10006 });

  return rows;
}

// Save everything (staff). Upserts all rows. Used by staff editors.
export async function saveContent2(content) {
  if (!supabaseConfigured || !supabase) return;
  const rows = buildRowMap(content).map((r, idx) => ({
    ...r,
    dm_data: r.dm_data ?? {},
    sort_order: (r.sort_order ?? idx),
    updated_at: new Date().toISOString(),
  }));
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('content_entries').upsert(chunk, { onConflict: 'id' });
    if (error) { console.error('[CotR] save error:', error.message); throw new Error(error.message); }
  }
}

// Save a single character entry (player editing their own). RLS verifies ownership.
export async function saveCharacter2(character) {
  if (!supabaseConfigured || !supabase) return;
  const { owner_id, ...rest } = character;
  const { data, dm_data } = splitEntryForSave(rest);
  const { error } = await supabase.from('content_entries')
    .update({ data, dm_data: dm_data ?? {}, updated_at: new Date().toISOString() })
    .eq('id', character.id);
  if (error) { console.error('[CotR] character save error:', error.message); throw new Error(error.message); }
}

// ── Realtime ──────────────────────────────────────────────────────────────
export function subscribeToUpdates2(onUpdate) {
  if (!supabaseConfigured || !supabase) return () => {};
  const channel = supabase
    .channel('content_entries_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_entries' },
      () => onUpdate())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ── Image upload (now gated by auth session, not DM password) ────────────────
const MEDIA_BUCKET = 'compendium-media';

export async function uploadImage(file, category, entryId) {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase not configured.');
  if (!file) throw new Error('No file provided.');
  const mime = file.type || 'image/png';
  const ext = mime.split('/')[1]?.split(';')[0] || 'png';
  const safeEntry = (entryId || 'misc').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const path = `${category}/${safeEntry}-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: mime });
  if (uploadErr) { console.error('[CotR] upload error:', uploadErr.message); throw new Error(uploadErr.message); }
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteImage(urlOrPath) {
  if (!supabaseConfigured || !supabase || !urlOrPath) return;
  let path = urlOrPath;
  const marker = `/${MEDIA_BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx >= 0) path = urlOrPath.substring(idx + marker.length);
  try {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) console.warn('[CotR] image delete warning:', error.message);
  } catch (err) {
    console.warn('[CotR] image delete exception:', err);
  }
}
