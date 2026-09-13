import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { composeMirror, readFilings, MINIMUM, type Filing } from './_mirror.js';
import { findInventedClaims } from './_grounding.js';
import { safetyCheck } from './_safety.js';

/**
 * /api/mirror — how this person has been talking about their own days.
 *
 * Asked for only on a day with no trial, which is most days. It is what stops
 * day three through day six being the same screen five times.
 *
 * Fails closed and fails quiet. Every path that cannot produce something
 * grounded returns `{ mirror: null }`, and a day with no Mirror is a plain day
 * rather than an error — there is no state here worth interrupting somebody
 * over. That is also why it is its own endpoint rather than part of /api/trial:
 * the Ledger should not wait on a model call to render the act.
 */

/* A model call, so it gets a cap. Everything in this file fails to null, which
   is exactly the condition under which an unset timeout goes unnoticed. */
export const config = { maxDuration: 60 };

/* A week. The Mirror says "this week you wrote", and it has to be true. */
const WINDOW_DAYS = 7;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!url || !secret) return res.status(500).json({ error: 'Not configured' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'No session' });

  const admin = createClient(url, secret, { auth: { persistSession: false } });

  try {
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (authError || !uid) return res.status(401).json({ error: 'Invalid or expired session' });
    if (!key) return res.status(200).json({ mirror: null });

    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
    const { data: rows } = await admin.from('ledger_entries')
      .select('day_number, what_happened, completed_at, filed_at')
      .eq('user_id', uid)
      .not('what_happened', 'is', null)
      .gte('filed_at', since)
      .order('day_number', { ascending: true });

    const filings: Filing[] = (rows ?? [])
      .map((r) => ({
        day_number: r.day_number as number,
        what_happened: String(r.what_happened ?? '').trim(),
        completed: Boolean(r.completed_at),
      }))
      .filter((f) => f.what_happened.length > 0);

    /* Below the floor there is nothing to observe, and the round trip to the
       model is skipped rather than made and thrown away. */
    if (filings.length < MINIMUM) return res.status(200).json({ mirror: null });

    const client = new Anthropic({ apiKey: key, maxRetries: 3 });
    const readings = await readFilings(client, filings);
    const mirror = composeMirror(readings);
    if (!mirror) return res.status(200).json({ mirror: null });

    /* The four gates, on a surface whose source is the filings.
       Everything outside the quotation marks is a fixed string and every quote
       has already been checked as a literal substring, so this should have
       nothing to find — which is the point of running it. A gate that only ever
       runs where you expect trouble is not a gate. */
    const invented = await findInventedClaims(
      client,
      { filings: filings.map((f) => f.what_happened) },
      mirror.text,
      'mirror',
    );
    if (invented.length) {
      console.warn('[mirror] overreach in an assembled Mirror:', invented.map((i) => i.claim));
      return res.status(200).json({ mirror: null });
    }

    /* Generated copy that reaches a person passes the safety filter. This is
       assembled rather than generated and most of it is the person's own
       sentences, which is an argument for running it rather than against:
       reflecting somebody's words back at them is still putting them on a
       screen. Fails closed, as everywhere else. */
    if (!(await safetyCheck(client, mirror.text, 'mirror'))) {
      console.warn('[mirror] blocked by the safety filter');
      return res.status(200).json({ mirror: null });
    }

    return res.status(200).json({
      mirror: {
        lead: mirror.lead, quotes: mirror.quotes,
        tally: mirror.tally, close: mirror.close,
      },
    });
  } catch (err) {
    console.error('[mirror] failed:', err);
    /* A day with no Mirror is the ordinary day. */
    return res.status(200).json({ mirror: null });
  }
}
