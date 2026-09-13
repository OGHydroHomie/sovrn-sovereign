import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { stripAct } from './_strip.js';
import { safetyCheck } from './_safety.js';

/* The safety filter is a model call, and this had no cap. A stripped act that
   times out here is never published and nobody is told — the commit succeeds,
   the wall just never shows it. */
export const config = { maxDuration: 60 };

/**
 * Write the public version of one act.
 *
 * The act itself is committed by the client, directly and immediately — a
 * commitment must not wait on a model, and it must not fail because one is
 * unreachable. This is called straight after, once, and it is the only thing
 * that ever writes `public_act`.
 *
 * It will not rewrite a line that already exists. A public line is generated at
 * the moment of commit and then it is what it is: something a person could see
 * change under them afterwards is not something they agreed to.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url = process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !secret || !apiKey) {
    console.error('[publicise] missing configuration');
    return res.status(500).json({ error: 'Not configured' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'No session' });

  const entryId = (req.body?.entryId ?? '').toString();
  if (!entryId) return res.status(400).json({ error: 'No entry' });

  const admin = createClient(url, secret, { auth: { persistSession: false } });

  try {
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (authError || !uid) return res.status(401).json({ error: 'Invalid or expired session' });

    const { data: entry, error: readError } = await admin
      .from('ledger_entries')
      .select('id, user_id, mission_text, public_act')
      .eq('id', entryId)
      .single();

    if (readError || !entry) return res.status(404).json({ error: 'No such entry' });
    /* Someone else's act is not theirs to publish. */
    if (entry.user_id !== uid) return res.status(403).json({ error: 'Not yours' });
    /* Generated once. A second call is a no-op, not a rewrite. */
    if (entry.public_act !== null) return res.status(200).json({ already: true });

    const client = new Anthropic({ apiKey });
    const stripped = await stripAct(client, entry.mission_text ?? '');

    /* The stripped line is generated copy that will reach other people, so it
       goes through the same gate every other generated line does. A line that
       does not pass is simply not published. */
    let line = stripped.line;
    if (line && !(await safetyCheck(client, line, 'public_act'))) {
      console.log('[publicise] stripped line failed safety; act stays private');
      line = null;
    }

    const { error: writeError } = await admin
      .from('ledger_entries')
      .update({ public_act: line })
      .eq('id', entryId)
      /* Only if it is still empty: two calls racing must not both write. */
      .is('public_act', null);

    if (writeError) {
      console.warn('[publicise] write failed:', writeError.message);
      return res.status(500).json({ error: 'Write failed' });
    }

    console.log(`[publicise] day act ${line ? 'published' : `withheld (${stripped.reason})`}`);
    /* The reason never leaves the server. Nothing about this is the person's
       problem and there is no state for them to fix. */
    return res.status(200).json({ published: Boolean(line) });
  } catch (err) {
    console.error('[publicise] failed:', err);
    return res.status(500).json({ error: 'Failed' });
  }
}
