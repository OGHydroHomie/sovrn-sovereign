import { supabase, UNIQUE_VIOLATION } from './supabase';
import { ensureUser } from './session';

export interface LedgerEntry {
  id: string;
  user_id: string;
  created_at: string;
  day_number: number;
  mission_text: string;
  completed_at: string | null;
  what_happened: string | null;
}

const COLUMNS = 'id, user_id, created_at, day_number, mission_text, completed_at, what_happened';

/**
 * Write the Day 1 mission at generation time, not completion time.
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
    .insert({ user_id: uid, day_number: 1, mission_text: missionText })
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
