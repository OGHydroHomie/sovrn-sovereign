import { supabase, UNIQUE_VIOLATION } from './supabase';

/* One shared in-flight promise. React StrictMode mounts effects twice in dev and
   several call sites want the uid, so every caller awaits the same bootstrap. */
let bootstrap: Promise<string | null> | null = null;

/**
 * Get this browser's SOVRN identity, creating it on first visit.
 *
 * Anonymous auth is the identity: `users.id` IS `auth.uid()`, enforced by the
 * `users_insert_own` RLS policy (`with check id = auth.uid()`). There is no way
 * to write a `users` row for anyone else, so the uid is the only thing we need.
 *
 * Returns the uid, or null if auth is unavailable (offline, env missing). Callers
 * that write to Supabase must treat null as "skip the write" — never as a reason
 * to block the user's path through the product.
 */
export function ensureUser(): Promise<string | null> {
  if (!bootstrap) {
    bootstrap = bootstrapUser().catch((err) => {
      console.warn('Supabase session bootstrap failed:', err);
      // Let a later call retry rather than caching the failure forever.
      bootstrap = null;
      return null;
    });
  }
  return bootstrap;
}

async function bootstrapUser(): Promise<string | null> {
  const uid = await currentUid();
  if (!uid) return null;

  const { error } = await supabase.from('users').insert({ id: uid });

  // The row already exists from an earlier visit on this device — that is the
  // normal path for every visit after the first.
  if (error && error.code !== UNIQUE_VIOLATION) {
    console.warn('users insert failed:', error.message);
    return uid;
  }

  return uid;
}

/**
 * Stamp the moment the person consented, on their own users row.
 *
 * Written at intake, once, when the box is ticked and the quiz is submitted.
 * `users_update_own` scopes the write to id = auth.uid(), so a session can only
 * ever record consent for itself. Non-blocking: a failure here must not stand
 * between someone and their blueprint, and the checkbox is the gate.
 */
export async function recordConsent(): Promise<void> {
  const uid = await ensureUser();
  if (!uid) return;

  // The browser is the only place that knows where the person actually is, and
  // intake is the only moment we are guaranteed to be in it. Everything sent to
  // them later — every time rendered in an email — depends on this.
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timezone = null;
  }

  const { error } = await supabase
    .from('users')
    .update({ consent_at: new Date().toISOString(), timezone })
    .eq('id', uid);

  if (error) console.warn('Consent stamp failed:', error.message);
}

async function currentUid(): Promise<string | null> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user?.id) return existing.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('Anonymous sign-in failed:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}
