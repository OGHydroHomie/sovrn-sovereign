import { supabase, UNIQUE_VIOLATION } from './supabase';
import { ensureUser } from './session';
import type { LedgerEntry } from './ledger';

/** Days that have to be both committed and completed before the signal exists. */
export const VILLAIN_THRESHOLD = 3;

/**
 * Has this person earned the right to be offered it.
 *
 * Both conditions are checked even though committed_at is NOT NULL today, so the
 * gate still reads correctly if an entry ever exists without a commitment.
 */
export function villainUnlocked(entries: LedgerEntry[]): boolean {
  const done = entries.filter((e) => e.committed_at && e.completed_at);
  return done.length >= VILLAIN_THRESHOLD;
}

/**
 * Record that someone wants villain mode.
 *
 * The table is write-only from the browser — insert-own, no select policy — and
 * carries one row per person. A second tap hits the unique index and comes back
 * as a violation, which is the same outcome as the first: they are counted.
 * Resolves true either way so the screen behaves identically.
 */
export async function signalVillain(): Promise<boolean> {
  const uid = await ensureUser();
  if (!uid) return false;

  const { error } = await supabase.from('villain_signals').insert({ user_id: uid });
  if (error && error.code !== UNIQUE_VIOLATION) {
    console.warn('Villain signal failed:', error.message);
    return false;
  }
  return true;
}
