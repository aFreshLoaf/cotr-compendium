# Chronicles of the Realms — Compendium

A homebrew wiki for the CotR D&D 5.5e campaigns. Built with React + Vite, hosted on GitHub Pages, backed by Supabase for real-time sync.

**Live site:** https://aFreshLoaf.github.io/cotr-compendium/

---

## Setup (one-time)

### 1. Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project — name it `cotr-compendium`
3. Go to **SQL Editor** and run this:

```sql
create table compendium_content (
  id integer primary key default 1,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table compendium_content
  add constraint single_row check (id = 1);

alter table compendium_content enable row level security;

create policy "public read" on compendium_content
  for select using (true);

create policy "public write" on compendium_content
  for update using (true);

create policy "public insert" on compendium_content
  for insert with check (true);

insert into compendium_content (id, content)
  values (1, '{}'::jsonb)
  on conflict (id) do nothing;
```

4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 2. GitHub Secrets

In your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add three secrets:

| Secret name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_DM_PASSWORD` | Any password you choose for DM Edit Mode |

### 3. GitHub Pages

In your GitHub repo, go to **Settings → Pages** and set:
- **Source:** GitHub Actions

That's it. The next push to `main` will build and deploy automatically.

---

## Local development

```bash
# Install dependencies
npm install

# Copy the env template
cp .env.example .env.local
# Then edit .env.local with your Supabase URL, anon key, and DM password

# Start dev server
npm run dev
# Opens at http://localhost:5173/cotr-compendium/
```

---

## Updating content

Content is edited through the compendium's Edit Mode (DM password required). Changes save to Supabase and sync to all open tabs in real time.

For bulk structural updates (adding new subclasses, races, characters), edit `src/App.jsx`'s `DEFAULT_CONTENT` object and push to `main`. The smart-merge system will apply structural changes while preserving any edits already saved in Supabase.

---

## Architecture

```
GitHub Pages (static host)
    └── React + Vite app
            └── Supabase (Postgres + realtime)
                    └── compendium_content table (single JSON row)
```

### Roadmap

- **Phase 1 (current):** Static site + Supabase sync. Single shared DM password for Edit Mode.
- **Phase 2:** Supabase Auth. Per-player accounts. Characters have owner_id — only owner + DM can edit.
- **Phase 3:** Role-based visibility. DM-only sections hidden from players. Campaign-scoped access.
