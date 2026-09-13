import { supabase } from './supabase';
import { ensureUser } from './session';

export interface Cycle {
  id: string;
  opened_at: string;
  closes_at: string;
  target_stated: string;
  target_admitted: string;
  rubric: string;
  cost: string;
  crossed_at: string | null;
  crossing_entry_id: string | null;
  closed_at: string | null;
  close_reason: 'crossed' | 'expired' | 'retired' | null;
  cycle_number: number;
}

export interface Admission {
  admitted: string;
  narrowed: boolean;
  reason: string | null;
  rubric: string;
  costThin: boolean;
}

export interface CrossingResult {
  verdict: 'CROSSED' | 'NOT_YET' | 'UNCLEAR';
  question: string | null;
  closed: boolean;
}

/* Which actions may simply be tried again.
 *
 * `admit` stores nothing at all — it narrows a target and hands the wording
 * back, and the person has to accept it before anything is written. Asking
 * twice costs three model calls and changes no state. Everything else here
 * writes: `open` inserts a cycle, `cross` closes one, `retire` closes one. A
 * retry on any of those after a response that was merely *lost* would act
 * twice, so they get one attempt and the person gets a button. */
const IDEMPOTENT = new Set(['admit']);

async function call<T>(body: Record<string, unknown>): Promise<T | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  /* One retry, and only on a failure that says nothing about the request — a
     dropped connection or the server falling over. A 4xx is an answer and
     asking again would just get the same one.

     This exists because the narrowing dead-ended people on a blip. It is three
     model calls and about eight seconds of somebody's attention, and the whole
     of the failure was a line of small text asking them to do it again. It also
     cost four harness runs that read the dead end as the generator being slow;
     it was never slow. */
  const attempts = IDEMPOTENT.has(String(body.action)) ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch('/api/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) return (await res.json()) as T;
      console.warn('cycle request failed:', res.status);
      if (res.status < 500) return null;
    } catch (err) {
      console.warn('cycle request failed:', err);
    }
    if (attempt + 1 < attempts) await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}

/** Narrow a target and write its boundary. Stores nothing — they have to agree. */
export const admitTarget = (target: string, cost: string) =>
  call<Admission>({ action: 'admit', target, cost });

export const openCycle = (target_stated: string, target_admitted: string, rubric: string, cost: string) =>
  call<{ cycle: Cycle }>({ action: 'open', target_stated, target_admitted, rubric, cost });

export const checkCrossing = (entry_id: string, clarification?: string) =>
  call<CrossingResult>({ action: 'cross', entry_id, clarification });

export const retireCycle = () => call<{ closed: boolean }>({ action: 'retire' });

/** The open cycle, or null. `cycles_select_own` scopes this to the caller. */
export async function getOpenCycle(): Promise<Cycle | null> {
  const uid = await ensureUser();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('cycles').select('*').eq('user_id', uid).is('closed_at', null).maybeSingle();
  if (error) { console.warn('Cycle read failed:', error.message); return null; }
  return (data as Cycle) ?? null;
}

/** Every cycle, newest first. The closed ones stay readable. */
export async function listCycles(): Promise<Cycle[]> {
  const uid = await ensureUser();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('cycles').select('*').eq('user_id', uid).order('cycle_number', { ascending: false });
  if (error) { console.warn('Cycle list failed:', error.message); return []; }
  return (data as Cycle[]) ?? [];
}

export function daysLeft(cycle: Cycle): number {
  return Math.max(0, Math.ceil((new Date(cycle.closes_at).getTime() - Date.now()) / 86400_000));
}
