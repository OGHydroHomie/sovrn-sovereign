import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { admitTarget } from './_admission.js';
import { checkCrossing } from './_crossing.js';
import { findInventedClaims } from './_grounding.js';

export const config = { maxDuration: 300 };

const CYCLE_DAYS = 30;

function adminClient(url: string, key: string) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Everything a cycle can do, behind the caller's own access token.
 *
 * The uid comes from the token, never the body — the same shape as /api/delete
 * and /api/recalibrate. A cycle decides what every act for the next month points
 * at; it is not something a browser gets to assert on someone else's behalf.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server configuration error' });

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return res.status(500).json({ error: 'Server configuration error' });

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Missing access token' });

  const admin = adminClient(url, secret);
  const { data: authUser, error: authErr } = await admin.auth.getUser(token);
  const uid = authUser?.user?.id;
  if (authErr || !uid) return res.status(401).json({ error: 'Invalid or expired session' });

  const action = String(req.body?.action ?? '');
  const client = new Anthropic();

  try {
    /* ── Narrow a target and write its boundary. Nothing is stored: the person
       has to see the narrowing and accept it first. ── */
    if (action === 'admit') {
      const target = String(req.body?.target ?? '').trim();
      const cost = String(req.body?.cost ?? '').trim();
      if (!target) return res.status(400).json({ error: 'Missing target' });
      if (!cost) return res.status(400).json({ error: 'Missing cost' });

      const admission = await admitTarget(client, target, cost);
      if (!admission) return res.status(502).json({ error: 'Could not read that target' });

      /* The narrowing is generated prose shown to a person about their own life,
         so it passes the same gate every other generated string does. The source
         is what they just said — nothing else is known about them here. */
      const generated = [admission.admitted, admission.reason, admission.rubric]
        .filter(Boolean).join('\n\n');
      const invented = await findInventedClaims(
        client,
        { desiredReality: target, deepestFear: cost },
        generated,
        'cycle:admission'
      );
      if (invented.length) {
        console.warn('[cycle.admission] overreach in the narrowing:', invented.map((i) => i.claim));
        const retry = await admitTarget(client, target, cost);
        if (retry) return res.status(200).json(retry);
      }
      return res.status(200).json(admission);
    }

    /* ── Open it. ── */
    if (action === 'open') {
      const stated = String(req.body?.target_stated ?? '').trim();
      const admitted = String(req.body?.target_admitted ?? '').trim();
      const rubric = String(req.body?.rubric ?? '').trim();
      const cost = String(req.body?.cost ?? '').trim();
      if (!stated || !admitted || !rubric || !cost) {
        return res.status(400).json({ error: 'Missing target, rubric or cost' });
      }

      const { data: prior } = await admin
        .from('cycles').select('cycle_number').eq('user_id', uid)
        .order('cycle_number', { ascending: false }).limit(1).maybeSingle();
      const next = ((prior as { cycle_number?: number } | null)?.cycle_number ?? 0) + 1;

      const { data, error } = await admin.from('cycles').insert({
        user_id: uid,
        closes_at: new Date(Date.now() + CYCLE_DAYS * 86400_000).toISOString(),
        target_stated: stated,
        target_admitted: admitted,
        rubric,
        cost,
        cycle_number: next,
      }).select().single();

      if (error) {
        // The partial unique index is the authority on one-open-cycle-per-user.
        if (error.code === '23505') return res.status(409).json({ error: 'A cycle is already open' });
        console.error('Cycle open failed:', error.message);
        return res.status(500).json({ error: 'Could not open the cycle' });
      }
      console.log(`[cycle.open] number=${next}`);
      return res.status(200).json({ cycle: data });
    }

    /* ── Read a filing against the boundary. ── */
    if (action === 'cross') {
      const entryId = String(req.body?.entry_id ?? '').trim();
      const clarification = String(req.body?.clarification ?? '').trim() || undefined;
      if (!entryId) return res.status(400).json({ error: 'Missing entry_id' });

      const { data: cycleRow } = await admin
        .from('cycles').select('*').eq('user_id', uid).is('closed_at', null).maybeSingle();
      const cycle = cycleRow as { id: string; rubric: string } | null;
      if (!cycle) return res.status(200).json({ verdict: 'NOT_YET', question: null, closed: false });

      const { data: entryRow } = await admin
        .from('ledger_entries').select('id, what_happened, completed_at')
        .eq('id', entryId).eq('user_id', uid).maybeSingle();
      const entry = entryRow as { id: string; what_happened: string | null; completed_at: string | null } | null;
      if (!entry?.what_happened) return res.status(400).json({ error: 'That entry has no account on it' });
      // Only a day filed as done can cross. "I didn't do it" is not a crossing.
      if (!entry.completed_at) return res.status(200).json({ verdict: 'NOT_YET', question: null, closed: false });

      const result = await checkCrossing(client, cycle.rubric, entry.what_happened, clarification);
      if (result.verdict !== 'CROSSED') {
        return res.status(200).json({ ...result, closed: false });
      }

      const now = new Date().toISOString();
      const { error: closeErr } = await admin.from('cycles').update({
        crossed_at: now, crossing_entry_id: entry.id, closed_at: now, close_reason: 'crossed',
      }).eq('id', cycle.id).is('closed_at', null);
      if (closeErr) {
        console.error('Cycle close failed:', closeErr.message);
        return res.status(500).json({ error: 'Could not close the cycle' });
      }
      console.log('[cycle.crossed]');
      return res.status(200).json({ verdict: 'CROSSED', question: null, closed: true });
    }

    /* ── Retire it. The opportunity vanished or the thing genuinely changed.
       Closed honestly as retired; it is not a completion. ── */
    if (action === 'retire') {
      const now = new Date().toISOString();
      const { error } = await admin.from('cycles')
        .update({ closed_at: now, close_reason: 'retired' })
        .eq('user_id', uid).is('closed_at', null);
      if (error) return res.status(500).json({ error: 'Could not retire the cycle' });
      console.log('[cycle.retired]');
      return res.status(200).json({ closed: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Cycle request failed:', err);
    return res.status(500).json({ error: 'Cycle request failed' });
  }
}
