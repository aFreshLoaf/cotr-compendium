import { createClient } from '@supabase/supabase-js';

// These are injected at build time by Vite from your GitHub repo secrets.
// They are the PUBLIC anon key — safe to expose in client-side code.
// Real access control happens via Supabase Row Level Security policies.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[CotR] Supabase env vars missing. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file (dev) ' +
    'or GitHub repo secrets (production).'
  );
}

export const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || ''
);
