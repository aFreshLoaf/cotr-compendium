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

// ── Concurrency / baseline tracking ──────────────────────────────────────────
// When a session loads content, we record each row's id → updated_at ("the
// version I loaded") and the set of ids that existed at load time. saveContent2
// uses this to (a) refuse to overwrite a row that someone else has saved a NEWER
// version of since we loaded (optimistic concurrency), and (b) only delete rows
// that existed at load AND are gone now (a deletion THIS session made) — never
// rows that simply weren't in our possibly-stale snapshot. This prevents a stale
// tab from clobbering newer edits or deleting entries it never knew about.
let _loadedVersions = {};   // { id: updated_at_string }
let _loadedIds = new Set(); // ids present at load time
let _loadedSnapshot = {};   // { id: stableStringify({data, dm_data}) } — for dirty-tracking

// Deterministic JSON stringify (sorted keys) so logically-equal objects compare
// equal regardless of key insertion order. Used to detect whether a row actually
// changed since load.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

const SINGLETON_HOME = '__home';
const SINGLETON_CAMPAIGN = '__campaign';
const SINGLETON_CAMPAIGNS = '__campaigns';
const SINGLETON_RACE_ORDER = '__raceOrder';
const SINGLETON_CAMPAIGN_ORDER = '__campaignOrder';
const SINGLETON_PARENT_CLASS_ORDER = '__parentClassOrder';
const SINGLETON_ITEM_GROUP_ORDER = '__itemGroupOrder';
const SINGLETON_MAGIC_GROUP_ORDER = '__magicGroupOrder';

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
      // The session call jammed — typically an expired access token whose refresh
      // request hangs (the in-memory client holds a lock and can't recover without
      // a fresh page). We recover in two stages to avoid needlessly logging the
      // user out for a *transient* hang while still bottoming out safely:
      //
      //   Stage 1 (first hang): reload WITHOUT clearing the token. A fresh client
      //     often completes the refresh fine, keeping the user logged in.
      //   Stage 2 (hang again right after reload): the token is genuinely
      //     unrecoverable, so clear it and reload to a clean public state.
      const FLAG = 'cotr-auth-recovery';
      let stage = 0;
      try { stage = parseInt(sessionStorage.getItem(FLAG) || '0', 10) || 0; } catch {}

      if (stage === 0) {
        console.warn('[CotR] getSession timed out — reloading once with token intact to recover.');
        try { sessionStorage.setItem(FLAG, '1'); } catch {}
        try { window.location.reload(); } catch {}
        // Return null while the reload happens; the page is about to be replaced.
        return null;
      }

      // Stage 2: already tried a clean reload and it hung again → clear and reset.
      console.warn('[CotR] getSession timed out again after reload — clearing auth storage and loading public.');
      try {
        const { clearAuthStorage } = await import('./supabase.js');
        clearAuthStorage();
      } catch {}
      try { sessionStorage.removeItem(FLAG); } catch {}
      return null;
    }
    // Success — clear any recovery flag so future hangs start fresh at stage 1.
    try { sessionStorage.removeItem('cotr-auth-recovery'); } catch {}
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
  const dm = dmData || {};
  // Entry-level DM-only: the full entry was stashed in dm_data.entry. Reconstruct
  // it wholesale (staff view) and mark it dmOnly so the UI gates it behind Reveal.
  if (dm.entry) {
    return { ...dm.entry, dmOnly: true };
  }
  const entry = { ...dataObj };
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
  // Entry-level DM-only: the whole entry is hidden from non-staff. Its entire
  // content goes into dm_data; public data is a bare stub that reveals nothing
  // (no name, no sections), so non-staff never see it exist.
  if (entry.dmOnly) {
    return {
      data: { id: entry.id, __dmOnly: true },           // stub only
      dm_data: { entry },                                 // full entry preserved
    };
  }
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
    const columns = isStaff ? 'id, kind, data, dm_data, owner_id, sort_order, updated_at' : 'id, kind, data, owner_id, sort_order, updated_at';
    const { data: rows, error } = await supabase
      .from('content_entries')
      .select(columns)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[CotR] content_entries load error:', error.message);
      return null;
    }
    if (!rows || rows.length === 0) return null;

    // Record the version baseline for this session (for concurrency-safe saves).
    _loadedVersions = {};
    _loadedIds = new Set();
    for (const row of rows) {
      _loadedVersions[row.id] = row.updated_at || null;
      _loadedIds.add(row.id);
    }

    const content = {
      subclasses: [], races: [], classes: [], characters: [], items: [], locations: [], magic: [],
      meta: {}, home: {}, campaign: {}, campaigns: {},
      raceOrder: [], campaignOrder: [], parentClassOrder: [], itemGroupOrder: [], magicGroupOrder: [],
    };

    for (const row of rows) {
      // Entry-level DM-only stub: for non-staff, the public data is just a stub
      // ({id, __dmOnly}). Skip it entirely so the entry never appears for them.
      if (row.data && row.data.__dmOnly && !(isStaff && row.dm_data)) {
        continue;
      }
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
        case 'magic':    content.magic.push(merged); break;
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
          else if (row.id === SINGLETON_ITEM_GROUP_ORDER) content.itemGroupOrder = row.data.itemGroupOrder || [];
          else if (row.id === SINGLETON_MAGIC_GROUP_ORDER) content.magicGroupOrder = row.data.magicGroupOrder || [];
          break;
        default: break;
      }
    }

    // Build the dirty-tracking snapshot by running the freshly-loaded content
    // through the SAME pipeline that save uses (buildRowMap → split). Comparing
    // save output against this guarantees an untouched entry compares equal even
    // if the load→merge→split round-trip isn't byte-identical to the raw DB row.
    _loadedSnapshot = {};
    try {
      for (const r of buildRowMap(content)) {
        _loadedSnapshot[r.id] = stableStringify({ data: r.data ?? {}, dm_data: r.dm_data ?? {} });
      }
    } catch (e) {
      // If snapshotting fails for any reason, leave it empty — save then writes
      // all rows (old behavior), which is safe, just not optimized.
      console.warn('[CotR] dirty-track snapshot skipped:', e?.message);
      _loadedSnapshot = {};
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
  (content.magic || []).forEach((e, i) => {
    const { data, dm_data } = splitEntryForSave(e);
    push(e.id, 'magic', data, { dm_data, sort_order: i });
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
  push(SINGLETON_ITEM_GROUP_ORDER, 'meta', { itemGroupOrder: content.itemGroupOrder || [] }, { sort_order: 10007 });
  push(SINGLETON_MAGIC_GROUP_ORDER, 'meta', { magicGroupOrder: content.magicGroupOrder || [] }, { sort_order: 10008 });

  return rows;
}

// Save (staff). Concurrency-safe:
//  • Refuses to overwrite a row that someone else saved a NEWER version of since
//    this session loaded (prevents a stale tab from clobbering newer edits).
//  • Only deletes rows that existed at load time and were removed THIS session —
//    never rows that merely weren't in a (possibly stale) snapshot.
// Returns { saved, conflicts } so the app can warn about skipped rows.
export async function saveContent2(content, opts = {}) {
  if (!supabaseConfigured || !supabase) return { saved: 0, conflicts: [] };
  // opts.force: if true, override ALL conflicts; if a Set/array of ids, override
  // only those (a deliberate "I've checked — save mine" for chosen entries).
  const forceAll = opts.force === true;
  const forceIds = opts.force instanceof Set ? opts.force
    : Array.isArray(opts.force) ? new Set(opts.force) : new Set();
  const rows = buildRowMap(content).map((r, idx) => ({
    ...r,
    dm_data: r.dm_data ?? {},
    sort_order: (r.sort_order ?? idx),
  }));

  // Read current DB versions so we can detect rows that changed under us.
  const { data: dbRows, error: verErr } = await supabase
    .from('content_entries')
    .select('id, updated_at');
  if (verErr) { console.error('[CotR] version read failed:', verErr.message); throw new Error(verErr.message); }
  const dbVersions = {};
  const dbIds = new Set();
  (dbRows || []).forEach((r) => { dbVersions[r.id] = r.updated_at || null; dbIds.add(r.id); });

  // Partition rows into safe-to-write vs conflicts.
  const conflicts = [];
  const toWrite = [];
  const nowIso = new Date().toISOString();
  // Compare timestamps by parsed epoch millis (tolerant of format/precision
  // drift) rather than raw string equality.
  const sameTime = (a, b) => {
    if (a == null || b == null) return a === b;
    const ta = Date.parse(a), tb = Date.parse(b);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
    return ta === tb;
  };
  for (const r of rows) {
    // ── Dirty-tracking ──────────────────────────────────────────────────
    // Skip rows that are byte-for-byte unchanged from what THIS session loaded.
    // Only changed or brand-new rows are written. This means a save touches just
    // the entries you actually edited — so two staff editing different entries
    // never collide, and unchanged rows don't bump their timestamps. Forced ids
    // and rows with no snapshot (new) always proceed.
    const snap = _loadedSnapshot[r.id];
    if (snap !== undefined && !forceAll && !forceIds.has(r.id)) {
      const current = stableStringify({ data: r.data ?? {}, dm_data: r.dm_data ?? {} });
      if (current === snap) continue; // unchanged — don't write, don't conflict-check
    }
    const loadedV = _loadedVersions[r.id];
    const dbV = dbVersions[r.id];
    const isConflict = dbIds.has(r.id) && loadedV != null && dbV != null && !sameTime(dbV, loadedV);
    // A conflicting row is skipped UNLESS the caller explicitly forces it (the
    // "I've checked — overwrite with mine" escape hatch), scoped to chosen ids.
    if (isConflict && !forceAll && !forceIds.has(r.id)) {
      conflicts.push(r.id);
      continue;
    }
    toWrite.push({ ...r, updated_at: nowIso });
  }

  // Upsert the safe rows. We .select() so we get back the values the DATABASE
  // actually stored (a trigger or default may set updated_at to its own clock,
  // which differs from the string we sent) — we use those real values to refresh
  // our baseline, otherwise the next save would false-conflict on every row.
  const BATCH = 100;
  const writtenVersions = {}; // id -> actual stored updated_at
  for (let i = 0; i < toWrite.length; i += BATCH) {
    const chunk = toWrite.slice(i, i + BATCH);
    const { data: written, error } = await supabase
      .from('content_entries')
      .upsert(chunk, { onConflict: 'id' })
      .select('id, updated_at');
    if (error) { console.error('[CotR] save error:', error.message); throw new Error(error.message); }
    (written || []).forEach((w) => { writtenVersions[w.id] = w.updated_at || null; });
  }

  // Scoped, safe deletes: only ids that existed when WE loaded and are gone from
  // our content now (a deletion this session made). Never delete ids that appeared
  // after we loaded, and never delete singletons.
  try {
    const keepIds = new Set(rows.map((r) => r.id));
    const deletedThisSession = [...keepIds].length
      ? [..._loadedIds].filter((id) => !keepIds.has(id) && !id.startsWith('__') && dbIds.has(id))
      : [];
    for (let i = 0; i < deletedThisSession.length; i += BATCH) {
      const chunk = deletedThisSession.slice(i, i + BATCH);
      const { error: delErr } = await supabase.from('content_entries').delete().in('id', chunk);
      if (delErr) { console.error('[CotR] delete error:', delErr.message); throw new Error(delErr.message); }
    }
    if (deletedThisSession.length) {
      console.info(`[CotR] removed ${deletedThisSession.length} deleted entr${deletedThisSession.length === 1 ? 'y' : 'ies'}.`);
    }
  } catch (err) {
    console.error('[CotR] delete step failed:', err);
    throw err;
  }

  // Refresh our baseline to the values the DATABASE actually stored for the rows
  // we just wrote, so further saves this session don't false-conflict against our
  // own writes. Falls back to the sent value if the select didn't return one.
  for (const r of toWrite) {
    _loadedVersions[r.id] = writtenVersions[r.id] ?? r.updated_at;
    _loadedIds.add(r.id);
    // Refresh the content snapshot to what we just wrote, so a subsequent save
    // this session sees this row as unchanged (and skips it).
    _loadedSnapshot[r.id] = stableStringify({ data: r.data ?? {}, dm_data: r.dm_data ?? {} });
  }
  for (const id of [..._loadedIds]) { if (!rows.find((r) => r.id === id)) { _loadedIds.delete(id); delete _loadedSnapshot[id]; } }

  if (conflicts.length) {
    console.warn(`[CotR] ${conflicts.length} entr${conflicts.length === 1 ? 'y was' : 'ies were'} changed by someone else and were NOT overwritten:`, conflicts);
  }
  return { saved: toWrite.length, conflicts };
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
