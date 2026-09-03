import { createClient } from '@supabase/supabase-js';

/* Current-format Supabase keys (sb_publishable_ / sb_secret_), not legacy JWTs.
   Both values come from Vercel env at build time — never hardcode them here. */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !publishableKey) {
  console.error('Supabase env missing: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient(url ?? '', publishableKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // The session must survive a hard reload in a private window, so it lives in
    // localStorage under a stable key rather than in memory.
    storageKey: 'sovrn_auth',
  },
});

/* Postgres error code for a unique-violation. Both `users` (pkey) and `emails`
   (unique email) treat a duplicate as "already recorded", not as a failure. */
export const UNIQUE_VIOLATION = '23505';
