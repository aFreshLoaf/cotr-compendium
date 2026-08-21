// ============================================================
// COTR — SRD Items importer: upsert `item` entries into content_entries
// ------------------------------------------------------------
// Reads srd-items.json (or a custom file) and upserts each item as an `item`
// row in content_entries, matching the storage2.js shape. Items are grouped
// in the sidebar by their `group` field (Weapons, Armor, Adventuring Gear,
// Tools, Mounts & Vehicles, Magic Items).
//
// USAGE (run from your project root):
//   set SUPABASE_URL=https://dtqmaubptslkoyvqryma.supabase.co
//   set SUPABASE_SERVICE_ROLE_KEY=<service-role key>
//   node import-items.mjs                        # import all from srd-items.json
//   node import-items.mjs --file=my-items.json   # custom data file
//   node import-items.mjs --dry-run              # show plan, write nothing
//   node import-items.mjs --skip-existing        # only insert new, never overwrite
//   node import-items.mjs --group=Weapons        # only import one group
//
// SAFETY:
//   • Only touches rows whose ids appear in the source file.
//   • Items NOT in the file are left completely untouched.
//   • --skip-existing prevents overwriting hand-edited items.
//   • --dry-run writes nothing and shows a full plan.
//
// SIDEBAR REGISTRATION:
//   The __itemGroupOrder singleton controls which groups appear in the sidebar
//   and in what order. New groups found in the data are appended automatically.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const DRY_RUN      = args.includes('--dry-run');
const SKIP_EXISTING = args.includes('--skip-existing');
const fileArg  = args.find((a) => a.startsWith('--file='));
const groupArg = args.find((a) => a.startsWith('--group='));
const DATA_FILE = fileArg  ? fileArg.slice('--file='.length)   : './srd-items.json';
const ONLY_GROUP = groupArg ? groupArg.slice('--group='.length) : null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error('ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

// ── Normalize a raw item into the shape storage2.js/splitEntryForSave expects ─
function normalize(raw, idx) {
  const slug = String(raw.id || raw.name || `item-${idx}`)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Use pre-built sections if present (magic items, etc.); fall back to
  // building a single text section from the description field.
  let sections = Array.isArray(raw.sections) ? raw.sections : [];
  if (sections.length === 0 && raw.description && raw.description.trim()) {
    sections = [{
      id: `${slug}-desc`,
      type: 'text',
      heading: 'Description',
      body: raw.description.trim(),
    }];
  }
  // Stamp stable ids on any sections that lack them
  sections = sections.map((s, i) => s.id ? s : { ...s, id: `${slug}-s${i}` });

  return {
    id: slug,
    name: raw.name || '',
    // Sidebar grouping fields
    group: raw.group || 'Items',
    subgroup: raw.subgroup || raw.group || 'Items',
    category: raw.category || 'gear',
    // Core stats — kept top-level so the UI can display them without parsing sections
    cost: raw.cost || '',
    weight: raw.weight || '',
    // Category-specific fields (all optional; UI guards against undefined)
    weaponCategory: raw.weaponCategory || '',
    weaponType: raw.weaponType || '',
    damage: raw.damage || '',
    properties: raw.properties || '',
    mastery: raw.mastery || '',
    armorCategory: raw.armorCategory || '',
    armorClass: raw.armorClass || '',
    strengthReq: raw.strengthReq || '',
    stealthDisadvantage: raw.stealthDisadvantage || false,
    rarity: raw.rarity || '',
    requiresAttunement: raw.requiresAttunement || false,
    typeDescription: raw.typeDescription || '',
    ability: raw.ability || '',
    utilize: raw.utilize || '',
    craft: raw.craft || '',
    carryingCapacity: raw.carryingCapacity || '',
    // Full text in sections for the Sections renderer
    sections,
    // Attribution
    source: raw.source || 'SRD 5.2.1',
    homebrew: false,
  };
}

async function main() {
  // Load data
  let rawItems;
  try {
    rawItems = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error(`ERROR reading ${DATA_FILE}: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(rawItems)) {
    console.error('ERROR: data file must export a JSON array.');
    process.exit(1);
  }

  // Optional group filter
  if (ONLY_GROUP) {
    rawItems = rawItems.filter((r) => r.group === ONLY_GROUP);
    console.log(`Filtering to group "${ONLY_GROUP}": ${rawItems.length} item(s)`);
  }

  // Fetch existing item rows
  const { data: existingRows, error: fetchErr } = await supabase
    .from('content_entries')
    .select('id, kind, sort_order')
    .eq('kind', 'item');
  if (fetchErr) { console.error('Fetch failed:', fetchErr.message); process.exit(1); }

  const existingIds = new Set((existingRows || []).map((r) => r.id));
  let maxSort = (existingRows || []).reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0);

  const toUpsert = [];
  const plan = [];
  const newGroups = new Set();

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    const item = normalize(raw, i);
    if (!item.id || !item.name) {
      plan.push(`SKIP (no id/name): ${JSON.stringify(raw).slice(0, 60)}`);
      continue;
    }

    const exists = existingIds.has(item.id);
    if (exists && SKIP_EXISTING) {
      plan.push(`exists, --skip-existing → skip: ${item.id}`);
      continue;
    }

    const sort_order = exists
      ? (existingRows.find((r) => r.id === item.id)?.sort_order ?? ++maxSort)
      : ++maxSort;

    // splitEntryForSave equivalent: no DM content on SRD items
    toUpsert.push({
      id: item.id,
      kind: 'item',
      data: item,
      dm_data: {},
      sort_order,
      updated_at: new Date().toISOString(),
    });

    if (!exists) newGroups.add(item.group);
    plan.push(`${exists ? 'OVERWRITE' : 'INSERT'}: ${item.id} (${item.name}) [${item.group}]`);
  }

  console.log('--- Plan ---');
  plan.forEach((p) => console.log('  ' + p));
  console.log(`--- ${toUpsert.length} row(s) to write${DRY_RUN ? ' (DRY RUN — nothing written)' : ''} ---`);

  if (DRY_RUN || toUpsert.length === 0) return;

  // Upsert in batches of 100
  const BATCH = 100;
  for (let i = 0; i < toUpsert.length; i += BATCH) {
    const chunk = toUpsert.slice(i, i + BATCH);
    const { error: upErr } = await supabase
      .from('content_entries')
      .upsert(chunk, { onConflict: 'id' });
    if (upErr) { console.error(`Upsert failed (batch ${i / BATCH + 1}):`, upErr.message); process.exit(1); }
    console.log(`  Wrote batch ${Math.floor(i / BATCH) + 1} / ${Math.ceil(toUpsert.length / BATCH)} (${chunk.length} rows)`);
  }

  // Register new groups in __itemGroupOrder singleton so the sidebar shows them.
  // Default order if the singleton doesn't exist yet.
  const DEFAULT_ORDER = [
    'Weapons', 'Armor', 'Adventuring Gear', 'Tools', 'Mounts & Vehicles', 'Magic Items',
  ];
  try {
    const { data: orderRow, error: ordErr } = await supabase
      .from('content_entries')
      .select('data, sort_order')
      .eq('id', '__itemGroupOrder')
      .maybeSingle();
    if (ordErr) {
      console.warn('[CotR] could not read __itemGroupOrder; add new group names manually:', ordErr.message);
    } else {
      const current = orderRow?.data?.itemGroupOrder || DEFAULT_ORDER;
      // Collect all groups present across ALL items (not just new ones) to fill in
      // any that were previously imported without being registered.
      const allGroups = [...new Set(toUpsert.map((r) => r.data.group))];
      const missing = allGroups.filter((g) => !current.includes(g));
      if (missing.length > 0) {
        const updated = [...current, ...missing];
        const { error: writeErr } = await supabase
          .from('content_entries')
          .upsert({
            id: '__itemGroupOrder',
            kind: 'meta',
            data: { itemGroupOrder: updated },
            dm_data: {},
            sort_order: orderRow?.sort_order ?? 10007,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        if (writeErr) {
          console.warn('[CotR] failed to update __itemGroupOrder; add these manually:', missing.join(', '), '|', writeErr.message);
        } else {
          console.log(`  Registered new groups in sidebar: ${missing.join(', ')}`);
        }
      } else if (!orderRow) {
        // Write the default order even if no new groups
        await supabase.from('content_entries').upsert({
          id: '__itemGroupOrder',
          kind: 'meta',
          data: { itemGroupOrder: DEFAULT_ORDER },
          dm_data: {},
          sort_order: 10007,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        console.log(`  Initialized __itemGroupOrder: ${DEFAULT_ORDER.join(', ')}`);
      }
    }
  } catch (e) {
    console.warn('[CotR] itemGroupOrder registration skipped:', e.message);
  }

  console.log(`✓ Wrote ${toUpsert.length} item row(s).`);
  console.log('  Refresh the compendium to see them in the Items section.');
}

main().catch((e) => { console.error(e); process.exit(1); });
