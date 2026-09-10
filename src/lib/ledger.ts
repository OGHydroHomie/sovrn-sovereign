import { supabase, UNIQUE_VIOLATION } from './supabase';
import { ensureUser } from './session';

export interface LedgerEntry {
  id: string;
  user_id: string;
  created_at: string;
  day_number: number;
  mission_text: string;
  /** When they committed to the act. Never null — an entry exists because of it. */
  committed_at: string;
  completed_at: string | null;
  what_happened: string | null;
  /* One sentence naming what the previous day actually was, written when this
     day was generated. Null on day one and on anything generated before the
     column existed. */
  read_line: string | null;
  /* When the day was filed, either way. Stamped by a trigger, never by us. */
  filed_at: string | null;
  /* The cycle this act served. Null on entries that predate cycles. */
  cycle_id: string | null;
}

const COLUMNS = 'id, user_id, created_at, day_number, mission_text, committed_at, completed_at, what_happened, read_line, filed_at, cycle_id';

/**
 * Write the Day 1 mission at the moment they commit to it.
 *
 * The entry exists the moment the mission is shown, so an uncompleted day is a
 * visible open row rather than an absence. A unique index on (user_id, day_number)
 * makes this idempotent: a second blueprint on the same device returns the entry
 * already on record instead of a duplicate or an error.
 */
export async function createDayOneEntry(missionText: string): Promise<LedgerEntry | null> {
  const uid = await ensureUser();
  if (!uid) return null;

  const { data, error } = await supabase
    .from('ledger_entries')
    .insert({ user_id: uid, day_number: 1, mission_text: missionText, committed_at: new Date().toISOString() })
    .select(COLUMNS)
    .single();

  if (!error) return data as LedgerEntry;

  if (error.code === UNIQUE_VIOLATION) {
    return getEntryForDay(1);
  }

  console.warn('Ledger insert failed:', error.message);
  return null;
}

export async function getEntryForDay(dayNumber: number): Promise<LedgerEntry | null> {
  const uid = await ensureUser();
  if (!uid) return null;

  const { data, error } = await supabase
    .from('ledger_entries')
    .select(COLUMNS)
    .eq('user_id', uid)
    .eq('day_number', dayNumber)
    .maybeSingle();

  if (error) {
    console.warn('Ledger read failed:', error.message);
    return null;
  }
  return (data as LedgerEntry) ?? null;
}

export async function getEntryById(id: string): Promise<LedgerEntry | null> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn('Ledger read failed:', error.message);
    return null;
  }
  return (data as LedgerEntry) ?? null;
}

/**
 * File a day, either way.

 * `done` decides whether completed_at is written. what_happened is written
 * regardless and is required regardless — the account of the day is the point,
 * and a day the person did not do is worth as much to the engine as one they
 * did. Arguably more: it is the only place the reason shows up.
 *
 * Two rules in Postgres do the enforcing and this sits inside them rather than
 * around them:
 *
 *   - `filing_requires_text` rejects a filing whose what_happened is blank, in
 *     either direction, so the field is never optional.
 *   - `ledger_files_once` stops matching the row the moment either column is
 *     set, so a second attempt updates nothing. That comes back as success with
 *     zero rows, NOT as an error — an already-filed entry is re-read and
 *     returned unchanged rather than reported as a failure.
 */
export async function fileEntry(
  id: string,
  whatHappened: string,
  done: boolean
): Promise<LedgerEntry | null> {
  const text = whatHappened.trim();
  if (!text) return null;

  const { data, error } = await supabase
    .from('ledger_entries')
    .update(done
      ? { completed_at: new Date().toISOString(), what_happened: text }
      : { what_happened: text })
    .eq('id', id)
    .select(COLUMNS);

  if (error) {
    console.warn('Ledger filing failed:', error.message);
    return null;
  }
  if (!data || data.length === 0) return getEntryById(id);
  return data[0] as LedgerEntry;
}

/** Seconds the person has to take a filing back. Enforced in Postgres too. */
export const UNDO_WINDOW_SECONDS = 30;

/**
 * Put a filed day back to open.
 *
 * Allowed for thirty seconds after filing and not one second longer — the
 * `ledger_files_once` policy stops matching the row once `filed_at` ages out, so
 * a late attempt updates nothing and comes back as the unchanged entry rather
 * than as an error. The window is the database's, not this function's.
 */
export async function undoFiling(id: string): Promise<LedgerEntry | null> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .update({ what_happened: null, completed_at: null })
    .eq('id', id)
    .select(COLUMNS);

  if (error) {
    console.warn('Undo failed:', error.message);
    return null;
  }
  if (!data || data.length === 0) return getEntryById(id);
  return data[0] as LedgerEntry;
}

/** True once the day has been filed, whichever way it went. */
export function isFiled(entry: LedgerEntry): boolean {
  return entry.completed_at !== null || (entry.what_happened ?? '').trim().length > 0;
}


/** Every entry for this identity, oldest day first. */
export async function listEntries(): Promise<LedgerEntry[]> {
  const uid = await ensureUser();
  if (!uid) return [];

  const { data, error } = await supabase
    .from('ledger_entries')
    .select(COLUMNS)
    .eq('user_id', uid)
    .order('day_number', { ascending: true });

  if (error) {
    console.warn('Ledger list failed:', error.message);
    return [];
  }
  return (data as LedgerEntry[]) ?? [];
}
