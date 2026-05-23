import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export a flag so storage.js knows whether Supabase is actually configured
export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Only create the client if both values are present — avoids the
// "Invalid path" error that crashes the whole app when secrets are missing
export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
