// ============================================================
// COTR — Class importer: upsert `class` entries into content_entries
// ------------------------------------------------------------
// Reads class definitions from classes-data.mjs (a sibling file that exports an
// array `CLASSES`) and upserts each as a `class` row, mirroring the structure of
// the hand-built Artificer entry (top-level fields + a `sections` array).
//
// USAGE (run locally in your project folder):
//   set SUPABASE_URL=https://dtqmaubptslkoyvqryma.supabase.co        (CMD)
//   set SUPABASE_SERVICE_ROLE_KEY=<sb_secret_... key>
//   node import-classes.mjs                            # uses classes-data.mjs
//   node import-classes.mjs --file=classes-data-blanks.mjs  # use a different data file
//   node import-classes.mjs --dry-run                  # show plan, write nothing
//   node import-classes.mjs --skip-existing            # only insert new, never overwrite
//
// SAFETY:
//   • Esper, Ranger, and Artificer are PROTECTED — never written, even if present
//     in the data file. This guards your hand-built entries.
//   • Default behavior OVERWRITES existing classes that appear in the data file.
//     Classes NOT in the data file are left untouched (no deletion here), so
//     importing the blanks file won't disturb your filled base classes.
//   • Use --skip-existing to only insert new ones; --dry-run to preview.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_EXISTING = args.includes('--skip-existing');
const fileArg = args.find((a) => a.startsWith('--file='));
const DATA_FILE = fileArg ? fileArg.slice('--file='.length) : './classes-data.mjs';
const { CLASSES } = await import(DATA_FILE.startsWith('.') ? DATA_FILE : `./${DATA_FILE}`);

// Hand-built classes that must never be touched by this importer.
const PROTECTED = new Set(['esper', 'ranger', 'artificer']);

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error('ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

async function main() {
  // Pull existing class rows so we know what's insert vs overwrite, and to find
  // a sort_order baseline (append new classes after the current max).
  const { data: existingRows, error: fetchErr } = await supabase
    .from('content_entries')
    .select('id, kind, sort_order')
    .eq('kind', 'class');
  if (fetchErr) { console.error('Fetch failed:', fetchErr.message); process.exit(1); }

  const existingIds = new Set((existingRows || []).map((r) => r.id));
  let maxSort = (existingRows || []).reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0);

  const toUpsert = [];
  const plan = [];

  for (const cls of CLASSES) {
    if (!cls.id || !cls.name) { plan.push(`SKIP (no id/name): ${JSON.stringify(cls).slice(0, 40)}`); continue; }
    if (PROTECTED.has(cls.id)) { plan.push(`PROTECTED — skipped: ${cls.id}`); continue; }

    const exists = existingIds.has(cls.id);
    if (exists && SKIP_EXISTING) { plan.push(`exists, --skip-existing → skip: ${cls.id}`); continue; }

    // Preserve sort_order for existing; append new ones after the max.
    let sort_order;
    if (exists) {
      sort_order = (existingRows.find((r) => r.id === cls.id)?.sort_order) ?? (++maxSort);
    } else {
      sort_order = ++maxSort;
    }

    toUpsert.push({
      id: cls.id,
      kind: 'class',
      data: cls,            // the whole class object IS the public data (no DM split for classes)
      dm_data: {},
      sort_order,
      updated_at: new Date().toISOString(),
    });
    plan.push(`${exists ? 'OVERWRITE' : 'INSERT'}: ${cls.id} (${cls.name}) [sort ${sort_order}]`);
  }

  console.log('--- Plan ---');
  plan.forEach((p) => console.log('  ' + p));
  console.log(`--- ${toUpsert.length} row(s) to write${DRY_RUN ? ' (DRY RUN — nothing written)' : ''} ---`);

  if (DRY_RUN || toUpsert.length === 0) return;

  // Upsert in one batch (on conflict by id).
  const { error: upErr } = await supabase
    .from('content_entries')
    .upsert(toUpsert, { onConflict: 'id' });
  if (upErr) { console.error('Upsert failed:', upErr.message); process.exit(1); }

  // Register any new class NAMES in the __parentClassOrder singleton. The sidebar
  // iterates this array to decide what to display, so a class whose name isn't in
  // it stays invisible even though its row exists. (The sidebar sorts these
  // alphabetically at render time, so append order doesn't matter.)
  try {
    const { data: orderRow, error: ordErr } = await supabase
      .from('content_entries')
      .select('data, sort_order')
      .eq('id', '__parentClassOrder')
      .maybeSingle();
    if (ordErr) {
      console.warn('[CotR] could not read __parentClassOrder; add new class names manually:', ordErr.message);
    } else {
      const current = (orderRow?.data?.parentClassOrder) || [];
      const names = toUpsert.map((r) => r.data.name);
      const missing = names.filter((n) => !current.includes(n));
      if (missing.length > 0) {
        const updated = [...current, ...missing];
        const { error: writeErr } = await supabase
          .from('content_entries')
          .upsert({
            id: '__parentClassOrder',
            kind: 'meta',
            data: { parentClassOrder: updated },
            dm_data: {},
            sort_order: orderRow?.sort_order ?? 10006,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        if (writeErr) {
          console.warn('[CotR] failed to update __parentClassOrder; add these manually:', missing.join(', '), '|', writeErr.message);
        } else {
          console.log(`  Registered in sidebar: ${missing.join(', ')}`);
        }
      }
    }
  } catch (e) {
    console.warn('[CotR] parentClassOrder registration skipped:', e.message);
  }

  console.log(`✓ Wrote ${toUpsert.length} class row(s).`);
  console.log('  Refresh the compendium to see them. Fill in homebrew subclass links in edit mode.');
}

main().catch((e) => { console.error(e); process.exit(1); });
