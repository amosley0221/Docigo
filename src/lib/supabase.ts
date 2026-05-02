import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  );
}

const STAY_KEY = 'docigo.stay-signed-in.v1';

/** True when the user has opted to remain signed in across browser sessions. */
export function getStayPreference(): boolean {
  try {
    return localStorage.getItem(STAY_KEY) !== 'no';
  } catch {
    return true;
  }
}

/** Set before sign-in so the storage adapter knows where to persist. */
export function setStayPreference(stay: boolean) {
  try {
    if (stay) localStorage.removeItem(STAY_KEY);
    else localStorage.setItem(STAY_KEY, 'no');
  } catch {
    // ignore
  }
}

/**
 * Custom storage that mirrors the Supabase auth session into either
 * localStorage (persistent across browser restarts) or sessionStorage
 * (cleared when the tab/window closes), based on the user's "Keep me
 * signed in" preference. Reads fall back across both so an ongoing
 * session keeps working even if the preference flipped mid-flight.
 */
const stayAwareStorage = {
  getItem(k: string): string | null {
    try {
      return localStorage.getItem(k) ?? sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem(k: string, v: string): void {
    try {
      if (getStayPreference()) {
        localStorage.setItem(k, v);
        sessionStorage.removeItem(k);
      } else {
        sessionStorage.setItem(k, v);
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
  },
  removeItem(k: string): void {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

export const supabase: SupabaseClient = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: stayAwareStorage,
  },
});

export const FILES_BUCKET = 'files';
