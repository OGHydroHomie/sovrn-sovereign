import { supabase, UNIQUE_VIOLATION } from './supabase';
import { ensureUser } from './session';

/**
 * Record a captured email in Supabase.
 *
 * The `emails` table is write-only from the client: insert is open to anon and
 * authenticated, and there is no select policy, so nothing can read the list back
 * through the API. `email` is unique — a repeat submission is the same lead, not a
 * failure, so a unique violation resolves as success.
 *
 * Non-blocking by design. Capture must never stand between someone and their
 * blueprint, so this resolves either way and only logs on real failure.
 */
export async function captureEmail(email: string, source: string): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!address) return;

  // Best-effort attribution. A null user_id is allowed, so capture still lands if
  // the anonymous session has not settled yet.
  const uid = await ensureUser();

  const { error } = await supabase
    .from('emails')
    .insert({ email: address, user_id: uid, source });

  if (error && error.code !== UNIQUE_VIOLATION) {
    console.warn('Email capture failed:', error.message);
  }
}
