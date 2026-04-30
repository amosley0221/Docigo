import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  );
}

export const supabase: SupabaseClient = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const FILES_BUCKET = 'files';
