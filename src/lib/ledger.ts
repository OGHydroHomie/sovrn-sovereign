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
}

const COLUMNS = 'id, user_id, created_at, day_number, mission_text, committed_at, completed_at, what_happened, read_line';

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
 * Close an entry: set completed_at and what_happened together.
 *
 * Two Postgres rules do the real enforcement here and this function is built to
 * sit inside them rather than around them:
 *
 *   - `completion_requires_text` rejects a completion whose what_happened is
 *     blank, so both columns must be written in the same statement.
 *   - `ledger_complete_once` stops matching the row the moment completed_at is
 *     set, so a second attempt updates nothing. That comes back as success with
 *     zero rows, NOT as an error — an already-closed entry is re-read and
 *     returned unchanged rather than reported as a failure.
 */
export async function completeEntry(id: string, whatHappened: string): Promise<LedgerEntry | null> {
  const text = whatHappened.trim();
  if (!text) return null;

  const { data, error } = await supabase
    .from('ledger_entries')
    .update({ completed_at: new Date().toISOString(), what_happened: text })
    .eq('id', id)
    .select(COLUMNS);

  if (error) {
    console.warn('Ledger completion failed:', error.message);
    return null;
  }

  if (!data || data.length === 0) return getEntryById(id);

  return data[0] as LedgerEntry;
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
