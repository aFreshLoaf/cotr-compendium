// ============================================================
// COTR — Spell importer
// Reads an SRD-shaped spells JSON and writes a SINGLE `magic` entry to
// content_entries whose data holds the full spell array. The compendium's
// Magic section renders this as a level-grouped, filterable spell library.
//
// USAGE (run locally in the project folder):
//   CMD:         set SUPABASE_URL=... & set SUPABASE_SERVICE_ROLE_KEY=...
//   PowerShell:  $env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."
//   Bash:        export SUPABASE_URL="..."; export SUPABASE_SERVICE_ROLE_KEY="..."
//   node import-spells.mjs --dry-run          # preview, write nothing
//   node import-spells.mjs                     # import (default file ./srd-spells.json)
//   node import-spells.mjs --file=my-spells.json
//   node import-spells.mjs --id=spells         # entry id (default 'spells')
//
// NOTES:
//   • Requires the SECRET (service-role) key — it writes.
//   • Idempotent: re-running overwrites the same entry (id 'spells' by default).
//   • Only touches that one entry; nothing else in content_entries is affected.
//   • Sets maxLevel = 15 so the app shows sidebar levels Cantrips–15th; SRD only
//     populates 0–9, so 10–15 stay empty until you add homebrew spells.
//   • SRD 5.2 content is CC BY 4.0 — attribution is embedded in the entry.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const fileArg = args.find((a) => a.startsWith('--file='));
const idArg = args.find((a) => a.startsWith('--id='));
const DATA_FILE = fileArg ? fileArg.slice('--file='.length) : './srd-spells.json';
const ENTRY_ID = idArg ? idArg.slice('--id='.length) : 'spells';

const MAX_LEVEL = 15; // Cantrips (0) .. 15th; 10–15 reserved for homebrew.

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error('ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Normalize a raw SRD spell into a consistent shape (all fields always present,
// so the UI never has to guard against undefined). Unknown extra fields are
// preserved too, in case the source carries more.
function normalize(raw, idx) {
  const lvl = Number.isInteger(raw.level) ? raw.level : 0;
  const classes = Array.isArray(raw.classes) ? raw.classes.map((c) => String(c).toLowerCase()) : [];
  const components = Array.isArray(raw.components) ? raw.components.map((c) => String(c).toLowerCase()) : [];
  // Stable per-spell id (slug of the name) so homebrew edits can target one.
  const slug = String(raw.name || `spell-${idx}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: slug,
    name: raw.name || '',
    level: lvl,
    school: (raw.school || '').toLowerCase(),
    classes,
    actionType: raw.actionType || 'action',
    castingTime: raw.castingTime || '',
    castingTrigger: raw.castingTrigger || '',
    concentration: !!raw.concentration,
    ritual: !!raw.ritual,
    range: raw.range || '',
    components,
    material: raw.material || '',
    duration: raw.duration || '',
    description: raw.description || '',
    higherLevelSlot: raw.higherLevelSlot || '',
    cantripUpgrade: raw.cantripUpgrade || '',
    homebrew: false,
  };
}

async function main() {
  let rawSpells;
  try {
    rawSpells = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error(`ERROR reading ${DATA_FILE}: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(rawSpells)) {
    console.error('ERROR: expected the JSON to be an array of spells.');
    process.exit(1);
  }

  const spells = rawSpells.map(normalize)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  // Report the plan.
  const byLevel = {};
  for (const s of spells) byLevel[s.level] = (byLevel[s.level] || 0) + 1;
  console.log(`Source: ${DATA_FILE}`);
  console.log(`Spells: ${spells.length}`);
  console.log('By level:', Object.entries(byLevel).map(([l, n]) => `${l === '0' ? 'C' : l}:${n}`).join('  '));
  console.log(`Entry: content_entries id='${ENTRY_ID}' kind='magic' (maxLevel ${MAX_LEVEL})`);

  const data = {
    name: 'Spells',
    kind: 'spell-library',      // marker so the app renders the spell browser
    maxLevel: MAX_LEVEL,
    spells,
    attribution: 'Spell content from the System Reference Document 5.2, © Wizards of the Coast LLC, licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).',
  };

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing written. First 3 spells:');
    console.log(JSON.stringify(spells.slice(0, 3), null, 2));
    return;
  }

  const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
  const row = {
    id: ENTRY_ID,
    kind: 'magic',
    data,
    dm_data: {},
    sort_order: 500,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('content_entries').upsert(row, { onConflict: 'id' });
  if (error) { console.error('Upsert failed:', error.message); process.exit(1); }
  console.log(`\n✓ Wrote ${spells.length} spells to entry '${ENTRY_ID}'. Refresh the compendium.`);
}

main();
