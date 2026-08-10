// ============================================================
// COTR — Canon exporter: content_entries -> readable Markdown
// ------------------------------------------------------------
// Produces a clean, dated Markdown snapshot of the compendium for use as
// "true north" reference when generating creative documents.
//
// USAGE (run locally in your project folder):
//   export SUPABASE_URL="https://dtqmaubptslkoyvqryma.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<sb_secret_... key>"   # only needed with --include-dm
//   # OR for public-only export you can use the anon/publishable key:
//   export SUPABASE_ANON_KEY="<sb_publishable_... key>"
//
//   node export-canon.mjs                          # everything, public only
//   node export-canon.mjs --include-dm             # everything, including DM content
//   node export-canon.mjs --kinds race,character   # only certain kinds
//   node export-canon.mjs --characters nexus,glass-of-dusk-newdawn
//   node export-canon.mjs --locations silva-vekken # a location and its descendants
//   node export-canon.mjs --out canon.md           # custom output filename
//
// DM content (dmOnly sections + inline dm blocks) is EXCLUDED by default. Pass
// --include-dm to include it; that requires the service-role/secret key (RLS
// otherwise won't return dm_data) and produces a SPOILER-INCLUSIVE file — handle
// it accordingly.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name) { return args.includes(`--${name}`); }
function opt(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}
const INCLUDE_DM = flag('include-dm');
const KINDS_FILTER = opt('kinds')?.split(',').map((s) => s.trim()).filter(Boolean) || null;
const CHARS_FILTER = opt('characters')?.split(',').map((s) => s.trim()).filter(Boolean) || null;
const LOCS_FILTER = opt('locations')?.split(',').map((s) => s.trim()).filter(Boolean) || null;
const OUT = opt('out') || `cotr-canon-${new Date().toISOString().slice(0, 10)}.md`;

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = INCLUDE_DM
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !KEY) {
  console.error('ERROR: set SUPABASE_URL and a key.');
  console.error('  Public export: SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  console.error('  --include-dm : requires SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (INCLUDE_DM && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: --include-dm requires SUPABASE_SERVICE_ROLE_KEY (service/secret key).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const ENC_PREFIX = 'enc::v1::';

// ── DM merge (only used with --include-dm) ─────────────────────────────────────
function reinsertBlock(section, at, block) {
  const m = at.match(/^(\w+)(?:\[(\d+)\]\.(\w+))?\[(\d+)\]$/);
  if (!m) return;
  const [, f1, fi, f2, bi] = m;
  if (f2 === undefined) {
    if (!Array.isArray(section[f1])) section[f1] = [];
    section[f1].splice(Number(bi), 0, block);
  } else {
    const arr = section[f1]; if (!arr || !arr[Number(fi)]) return;
    const sub = arr[Number(fi)];
    if (!Array.isArray(sub[f2])) sub[f2] = [];
    sub[f2].splice(Number(bi), 0, block);
  }
}
function mergeDm(dataObj, dmData) {
  const entry = { ...dataObj };
  const dm = (dmData && typeof dmData === 'object') ? dmData : {};
  // Handle entry-level dm_data.entry (whole-entry DM-only, same as storage2.js)
  if (dm.entry) return { ...dm.entry, dmOnly: true };
  const dmSections = Array.isArray(dm.sections) ? dm.sections : [];
  if (!dmSections.length) return entry;
  const sections = (entry.sections || []).map((s) => ({ ...s }));
  const whole  = dmSections.filter((s) => !s.__inlineFor);
  const inline = dmSections.filter((s) =>  s.__inlineFor);
  for (const frag of inline) {
    const t = sections.find((s) => s.id === frag.__inlineFor);
    if (!t) {
      whole.push({ ...frag, heading: (frag.heading || 'DM Notes') + ' [orphaned inline]', dmOnly: true });
      continue;
    }
    for (const f of (frag.fragments || [])) reinsertBlock(t, f.at, f.block);
  }
  for (const s of whole) sections.push(s);
  entry.sections = sections;
  return entry;
}

// ── Markdown rendering ─────────────────────────────────────────────────────────
function isCiphertext(v) { return typeof v === 'string' && v.startsWith(ENC_PREFIX); }

// Render a BlockBody (string or array of blocks) to markdown.
function renderBody(body) {
  if (typeof body === 'string') return isCiphertext(body) ? '' : body.trim();
  if (!Array.isArray(body)) return '';
  const out = [];
  for (const b of body) {
    if (b.type === 'dm' && !INCLUDE_DM) continue;
    if (b.type === 'text' || b.type === 'dm') {
      if (typeof b.body === 'string' && !isCiphertext(b.body) && b.body.trim()) {
        out.push((b.type === 'dm' ? '**[DM]** ' : '') + b.body.trim());
      }
    } else if (b.type === 'table') {
      out.push(renderTable(b.columns, b.rows));
    } else if (b.type === 'links') {
      const links = (b.items || []).map((it) => {
        if (it.kind === 'external') return `[${it.label || it.url}](${it.url})`;
        return it.label || it.id || '';
      }).filter(Boolean);
      if (links.length) out.push('Links: ' + links.join(', '));
    }
  }
  return out.join('\n\n');
}

function renderTable(columns, rows) {
  const cols = columns || [];
  const rws = rows || [];
  if (!cols.length && !rws.length) return '';
  const header = `| ${cols.join(' | ')} |`;
  const sep = `| ${cols.map(() => '---').join(' | ')} |`;
  const body = rws.map((r) => `| ${(r || []).map((c) => String(c ?? '').replace(/\n/g, ' ')).join(' | ')} |`).join('\n');
  return [header, sep, body].join('\n');
}

function renderSection(sec, depth) {
  if (sec.dmOnly && !INCLUDE_DM) return '';
  const h = '#'.repeat(Math.min(depth, 6));
  const out = [];
  const heading = (sec.heading || 'Section') + (sec.dmOnly ? ' [DM]' : '');
  out.push(`${h} ${heading}`);
  if (sec.lore && !isCiphertext(sec.lore)) out.push(`> *${sec.lore.trim()}*`);

  if (sec.type === 'text') {
    const body = renderBody(sec.body);
    if (body) out.push(body);
  } else if (sec.type === 'features') {
    for (const f of (sec.features || [])) {
      const name = f.name && !isCiphertext(f.name) ? f.name : '';
      const text = renderBody(f.text);
      if (name) out.push(`**${name}**`);
      if (text) out.push(text);
    }
  } else if (sec.type === 'table') {
    out.push(renderTable(sec.columns, sec.rows));
  } else if (sec.type === 'image') {
    if (sec.caption && !isCiphertext(sec.caption)) out.push(`*(image: ${sec.caption})*`);
  } else if (sec.type === 'subcategory') {
    for (const e of (sec.entries || [])) {
      out.push(`${'#'.repeat(Math.min(depth + 1, 6))} ${e.name || 'Entry'}`);
      if (e.flavor && !isCiphertext(e.flavor)) out.push(`> *${e.flavor.trim()}*`);
      const desc = renderBody(e.description);
      if (desc) out.push(desc);
      for (const f of (e.features || [])) {
        if (f.name && !isCiphertext(f.name)) out.push(`**${f.name}**`);
        const t = renderBody(f.body);
        if (t) out.push(t);
      }
    }
  } else if (sec.type === 'identity') {
    const fields = [];
    if (sec.race) fields.push(`Race: ${sec.race}`);
    if (sec.class) fields.push(`Class: ${sec.class}`);
    if (sec.patron && sec.patron !== '—') fields.push(`Patron: ${sec.patron}`);
    if (sec.status) fields.push(`Status: ${sec.status}`);
    if (sec.category) fields.push(`Category: ${sec.category}`);
    for (const c of (sec.customIdentity || [])) {
      if (c.label || c.value) fields.push(`${c.label || ''}${c.label ? ': ' : ''}${c.value || ''}`);
    }
    if (fields.length) out.push(fields.join('  •  '));
  }
  return out.filter(Boolean).join('\n\n');
}

function renderEntry(entry, titleLevel) {
  const h = '#'.repeat(titleLevel);
  const out = [`${h} ${entry.name || entry.id}${entry.dmOnly ? ' \u2014 **[DM ONLY]**' : ''}`];
  if (entry.dmOnly) out.push('> *This entry is DM-only and hidden from players.*');
  for (const sec of (entry.sections || [])) {
    const md = renderSection(sec, titleLevel + 1);
    if (md) out.push(md);
  }
  return out.join('\n\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const columns = INCLUDE_DM ? 'id, kind, data, dm_data, sort_order' : 'id, kind, data, sort_order';
  const { data: rows, error } = await supabase
    .from('content_entries')
    .select(columns)
    .order('sort_order', { ascending: true });
  if (error) { console.error('Fetch failed:', error.message); process.exit(1); }

  // Reassemble entries (merge dm if requested)
  const SINGLETON_CAMPAIGNS      = '__campaigns';
  const SINGLETON_CAMPAIGN       = '__campaign';
  const SINGLETON_CAMPAIGN_ORDER = '__campaignOrder';
  const byKind = { subclass: [], race: [], class: [], character: [], item: [], location: [] };
  const meta = { campaigns: {}, campaignOrder: [], campaign: {}, home: {} };
  for (const row of rows) {
    const entry = (INCLUDE_DM && row.dm_data) ? mergeDm(row.data, row.dm_data) : row.data;
    if (byKind[row.kind]) {
      byKind[row.kind].push(entry);
    } else if (row.kind === 'campaign' || row.id === SINGLETON_CAMPAIGN) {
      meta.campaign = row.data;
    } else if (row.kind === 'home') {
      meta.home = row.data;
    } else if (row.kind === 'meta') {
      if (row.id === SINGLETON_CAMPAIGNS)      meta.campaigns     = row.data.campaigns     || {};
      if (row.id === SINGLETON_CAMPAIGN_ORDER) meta.campaignOrder = row.data.campaignOrder || [];
    }
  }

  // Apply filters
  let kinds = ['race', 'class', 'subclass', 'character', 'item', 'location'];
  if (KINDS_FILTER) kinds = kinds.filter((k) => KINDS_FILTER.includes(k));
  if (CHARS_FILTER) byKind.character = byKind.character.filter((c) => CHARS_FILTER.includes(c.id));
  if (LOCS_FILTER) {
    // include named locations AND their descendants
    const keep = new Set(LOCS_FILTER);
    let added = true;
    while (added) {
      added = false;
      for (const l of byKind.location) {
        if (l.parentId && keep.has(l.parentId) && !keep.has(l.id)) { keep.add(l.id); added = true; }
      }
    }
    byKind.location = byKind.location.filter((l) => keep.has(l.id));
  }

  // Build the document
  const doc = [];
  doc.push(`# Chronicles of the Realms — Compendium Canon`);
  doc.push(`*Exported ${new Date().toISOString()} — ${INCLUDE_DM ? 'INCLUDES DM CONTENT (spoilers)' : 'public content only'}*`);
  doc.push(`\nThis document is the canonical reference ("true north") for the campaign. Treat its contents as authoritative over any other source.`);

  if (meta.campaign && (!KINDS_FILTER) && (!CHARS_FILTER) && (!LOCS_FILTER)) {
    doc.push(`\n---\n\n## Campaign Overview`);
    if (meta.campaign.overview) doc.push(meta.campaign.overview);
    for (const fig of (meta.campaign.keyFigures || [])) {
      doc.push(`**${fig.name}** — ${fig.role}`);
    }
  }

  const sectionTitles = {
    race: 'Races', class: 'Classes', subclass: 'Subclasses',
    character: 'Characters', item: 'Items', location: 'Locations',
  };

  for (const kind of kinds) {
    const entries = byKind[kind] || [];
    if (!entries.length) continue;
    doc.push(`\n---\n\n# ${sectionTitles[kind]}`);

    if (kind === 'location') {
      // Render as a tree, depth-first
      const childrenOf = (pid) => entries.filter((l) => (l.parentId || null) === pid);
      const walk = (loc, depth) => {
        doc.push(renderEntry(loc, Math.min(depth + 2, 6)));
        for (const child of childrenOf(loc.id)) walk(child, depth + 1);
      };
      for (const root of childrenOf(null)) walk(root, 0);
    } else {
      for (const e of entries) doc.push(renderEntry(e, 2));
    }
  }

  // ── Campaign pages (sections stored in __campaigns singleton) ────────────────
  const campaignOrder = meta.campaignOrder.length
    ? meta.campaignOrder
    : Object.keys(meta.campaigns);
  if (campaignOrder.length && (!KINDS_FILTER) && (!CHARS_FILTER) && (!LOCS_FILTER)) {
    doc.push(`\n---\n\n# Campaign Pages`);
    for (const name of campaignOrder) {
      const camp = meta.campaigns[name];
      if (!camp) continue;
      doc.push(`\n## ${name}`);
      if (camp.status) doc.push(`*Status: ${camp.status}*`);
      if (camp.description && camp.description.trim()) doc.push(camp.description.trim());
      for (const sec of (camp.sections || [])) {
        if (sec.dmOnly && !INCLUDE_DM) continue;
        const md = renderSection(sec, 3);
        if (md) doc.push(md);
      }
    }
  }

  const md = doc.join('\n\n');
  writeFileSync(OUT, md, 'utf8');
  const counts = kinds.map((k) => `${(byKind[k] || []).length} ${k}`).join(', ');
  console.log(`✓ Wrote ${OUT}`);
  console.log(`  ${counts}`);
  console.log(`  DM content: ${INCLUDE_DM ? 'INCLUDED (spoilers)' : 'excluded'}`);
  console.log(`  Campaign pages: ${campaignOrder.length} (${campaignOrder.join(', ') || 'none'})`);
  console.log(`  ${md.length.toLocaleString()} characters`);
}

main().catch((e) => { console.error(e); process.exit(1); });
