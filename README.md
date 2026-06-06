# Chronicles of the Realms — Compendium

A homebrew wiki for the CotR D&D 5.5e campaigns. Built with React + Vite, hosted
on GitHub Pages, backed by Supabase (Postgres + Auth + realtime).

**Live site:** https://aFreshLoaf.github.io/cotr-compendium/

---

## Architecture

```
GitHub Pages (static host)
    └── React + Vite app
            └── Supabase
                    ├── content_entries  (one row per entry: characters, classes,
                    │                      subclasses, races, items, locations, magic,
                    │                      plus singleton rows for settings/ordering)
                    └── profiles         (per-user role + owned characters)
```

Content is stored **one row per entry** in `content_entries`, not as a single
blob. Each row has:

- `id` (text, primary key) — e.g. `artificer`, or a generated id for a character
- `kind` — `class`, `subclass`, `race`, `character`, `item`, `location`, `magic`,
  or `meta` (for singleton settings/ordering rows, whose ids are prefixed `__`)
- `data` (jsonb) — the public entry content
- `dm_data` (jsonb) — staff-only content (DM-only entries/sections live here)
- `owner_id` (uuid) — for player-owned characters
- `sort_order` (int)

Access is controlled by **Supabase Auth + roles** stored in `profiles.role`:

- **admin** — full access plus account management
- **dm** — all content, including DM-only notes
- **player** — can edit only the character(s) they own
- (signed-out) — public read of non-DM content

Row-Level Security enforces this in Postgres; the app layer mirrors it for display.

---

## Setup (one-time)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, create the `content_entries` and `profiles` tables with
   RLS policies. (See `docs/schema.sql` if present, or ask the maintainer for the
   current schema — it defines the tables, the `is_staff()` / `is_admin()`
   security-definer functions, and the public-read / staff-write policies.)
3. In **Settings → API**, copy:
   - **Project URL** — `https://xxxxxxxxxxxx.supabase.co`
   - **publishable** key (`sb_publishable_...`) — used by the app and public exports
   - **secret** key (`sb_secret_...`) — used only by admin tooling (imports, DM exports).
     Treat this like a password; never commit it or put it in client code.

### 2. GitHub Secrets

In the repo, go to **Settings → Secrets and variables → Actions** and add:

| Secret name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase **publishable** key |

(There is no DM-password secret anymore — access is via Supabase Auth accounts.)

### 3. GitHub Pages

In **Settings → Pages**, set **Source: GitHub Actions**. The next push to `main`
builds and deploys automatically (see `.github/workflows/`).

---

## Local development

```bash
npm install
cp .env.example .env.local      # then fill in your Supabase URL + publishable key
npm run dev                     # http://localhost:5173/cotr-compendium/
```

---

## Editing content

Most editing happens **in the app**, signed in as a staff (admin/dm) account,
via Edit Mode. Changes save to Supabase and sync to open tabs. Players who own a
character can edit that character once an admin assigns it to them.

---

## Tooling

Two Node scripts ship with the repo for bulk operations. Both need a Supabase URL
and a key in the environment, and both are run locally (they talk to your
database directly). They are safe to clone and use **with your own keys**.

Install deps first if you haven't: `npm install` (this provides
`@supabase/supabase-js`, which the scripts import).

### Export canon — `export-canon.mjs`

Reads `content_entries` and writes a readable Markdown snapshot of your canon —
handy as a creative reference or for feeding into other tools.

```bash
# bash / Git Bash:
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_ANON_KEY="<your sb_publishable_... key>"
node export-canon.mjs                          # full public export
node export-canon.mjs --kinds class            # only classes
node export-canon.mjs --out my-canon.md        # custom filename
node export-canon.mjs --include-dm             # include DM content (needs the SECRET key)
```

```cmd
:: Windows CMD — use `set` (no quotes) instead of `export`:
set SUPABASE_URL=https://YOUR-PROJECT.supabase.co
set SUPABASE_ANON_KEY=<your sb_publishable_... key>
node export-canon.mjs
```

Public export uses the **publishable** key. `--include-dm` requires the **secret**
key (`SUPABASE_SERVICE_ROLE_KEY`) since DM content is access-gated.

Generated `.md` exports are git-ignored — they're regenerable and may contain
private campaign content.

### Import classes — `import-classes.mjs`

Upserts `class` entries into `content_entries` from a data file (an `.mjs` that
exports a `CLASSES` array). Useful for bulk-loading or scaffolding classes.

```bash
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your sb_secret_... key>"

node import-classes.mjs --dry-run                          # preview, write nothing
node import-classes.mjs                                    # uses classes-data.mjs
node import-classes.mjs --file=classes-data-blanks.mjs     # use a different data file
node import-classes.mjs --skip-existing                    # only insert new, never overwrite
```

Notes:
- Requires the **secret** key (it writes to the database).
- **Overwrites** existing classes that appear in the data file; classes not in the
  file are left untouched. Use `--dry-run` first.
- New class names are auto-registered in the sidebar ordering on import.
- `classes-data-blanks.mjs` is a reusable template of empty class scaffolds
  (Summary / Starting Info / 20-level progression table / Core Features) — import
  it, then fill the pages in via the app's Edit Mode.

---

## Contributing / forking

The app and tooling are general-purpose; the *content* (characters, lore, custom
classes) is specific to the CotR campaigns and lives in your own Supabase project,
not in this repo. Clone the code, point it at your own Supabase instance with your
own keys, and build your own compendium.
