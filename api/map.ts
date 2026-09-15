import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Figure } from './_trials.js';

/**
 * /api/map — the record, laid out.
 *
 * Three things, and all three of them are the record rendered rather than
 * scored: which figures have been freed, every day since the first cycle
 * opened, and every cycle that has closed.
 *
 * There is deliberately no count of anything in this response. No total, no
 * remaining, no percentage, no "3 of 25". Every unit on this page costs a real
 * act in the world, and the moment somebody has a denominator the acts become a
 * means to a number. The browser gets the twenty-five positions because it has
 * to draw them; it is never told how many are filled, because it never needs to
 * say.
 */

export const config = { maxDuration: 30 };

/** The whole set. Three of them are drawn; the rest are shapes. */
const POSITIONS = 25;

/* Where the three that exist sit.
 *
 * Fixed, so a person's map is the same map every time they open it, and
 * scattered, so the grid does not read as three then a queue of twenty-two
 * waiting their turn. There is no order here and the layout should not invent
 * one — nothing about being freed of the Devil brings the Hermit any closer.
 *
 * These are indexes into a grid of twenty-five, nothing more. They are not a
 * ranking and they are not a sequence. */
const PLACED: Record<number, Figure> = {
  3: 'devil',
  11: 'sun',
  18: 'hermit',
};

/** Their day, where they were standing. Never a UTC timestamp handed to a reader. */
function theirDay(iso: string, zone: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: zone || 'UTC',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

/** The calendar day an instant fell on, where they were standing. */
function localDay(iso: string, zone: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone || 'UTC',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export type DayState = 'done' | 'missed' | 'empty';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return res.status(500).json({ error: 'Not configured' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'No session' });

  const admin = createClient(url, secret, { auth: { persistSession: false } });

  try {
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (authError || !uid) return res.status(401).json({ error: 'Invalid or expired session' });

    const [trialsRes, cyclesRes, entriesRes, profileRes] = await Promise.all([
      admin.from('trials').select('figure, state, freed_at').eq('user_id', uid),
      admin.from('cycles').select('target_admitted, close_reason, closed_at, opened_at, cycle_number')
        .eq('user_id', uid).order('cycle_number', { ascending: true }),
      admin.from('ledger_entries').select('committed_at, filed_at, completed_at')
        .eq('user_id', uid).order('committed_at', { ascending: true }),
      admin.from('users').select('timezone').eq('id', uid).maybeSingle(),
    ]);

    const zone = (profileRes.data?.timezone ?? null) as string | null;
    const trials = (trialsRes.data ?? []) as Array<{ figure: Figure; state: string; freed_at: string | null }>;
    const cycles = (cyclesRes.data ?? []) as Array<{
      target_admitted: string; close_reason: string | null; closed_at: string | null;
      opened_at: string; cycle_number: number;
    }>;
    const entries = (entriesRes.data ?? []) as Array<{
      committed_at: string; filed_at: string | null; completed_at: string | null;
    }>;

    /* ── The figures ─────────────────────────────────────────────────────── */
    const freed = new Map<Figure, string>();
    for (const t of trials) {
      if (t.state === 'freed' && t.freed_at) freed.set(t.figure, theirDay(t.freed_at, zone));
    }
    const active = trials.find((t) => t.state === 'active')?.figure ?? null;

    /* A locked position says nothing at all — no name, no figure, no hint that
       one is there. Somebody who has never met the Devil should not learn from
       this page that a Devil exists. */
    const figures = Array.from({ length: POSITIONS }, (_, i) => {
      const at = PLACED[i];
      if (at && freed.has(at)) return { state: 'freed' as const, figure: at, date: freed.get(at)! };
      if (at && at === active) return { state: 'active' as const, figure: at };
      return { state: 'locked' as const };
    });

    /* ── The days ────────────────────────────────────────────────────────── */
    /* One square per calendar day since the first cycle opened, in their
       timezone. Days with nothing on them are part of the picture: a gap is
       what a gap looked like, and rendering it as absence rather than as a
       failure is the whole difference between a record and a scorecard. */
    const byDay = new Map<string, DayState>();
    for (const e of entries) {
      const day = localDay(e.committed_at, zone);
      const state: DayState = e.completed_at ? 'done' : e.filed_at ? 'missed' : 'empty';
      /* Two entries on one calendar day is not a shape the product makes, but
         if it ever did, the one that was crossed is the one that happened. */
      if (byDay.get(day) !== 'done') byDay.set(day, state);
    }

    const days: Array<{ day: string; state: DayState }> = [];
    const opened = cycles[0]?.opened_at ?? entries[0]?.committed_at ?? null;
    if (opened) {
      const from = new Date(`${localDay(opened, zone)}T12:00:00Z`);
      const to = new Date(`${localDay(new Date().toISOString(), zone)}T12:00:00Z`);
      /* Bounded. A clock that is wrong should not produce a page with forty
         thousand squares on it. */
      for (let d = new Date(from), guard = 0; d <= to && guard < 400; d.setUTCDate(d.getUTCDate() + 1), guard++) {
        const key = d.toISOString().slice(0, 10);
        days.push({ day: key, state: byDay.get(key) ?? 'empty' });
      }
    }

    /* ── The cycles ──────────────────────────────────────────────────────── */
    const closed = cycles
      .filter((c) => c.closed_at)
      .map((c) => ({
        target: c.target_admitted,
        /* Their word for how it ended, not a grade. Expired and retired are not
           failures and are not written as any. */
        how: (c.close_reason ?? 'closed') as string,
        date: theirDay(c.closed_at as string, zone),
      }))
      .reverse();

    return res.status(200).json({ figures, days, cycles: closed });
  } catch (err) {
    console.error('[map] failed:', err);
    return res.status(500).json({ error: 'Could not read the record' });
  }
}
