import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
  maxDuration: 30,
};

/**
 * Hard-delete everything belonging to the caller.
 *
 * Runs with SUPABASE_SECRET_KEY, never the publishable key — deleting an auth
 * user is an admin operation and is not reachable from the browser. The caller
 * proves who they are with their own access token; the server validates it and
 * deletes exactly that uid. There is no way to name someone else's account.
 *
 * Order matters. `emails.user_id` is ON DELETE SET NULL, so removing the auth
 * user would orphan the address rather than remove it — the email is deleted
 * first, while the uid still links to it. `users.id` and `ledger_entries.user_id`
 * are ON DELETE CASCADE, so the users row and every ledger entry go with the
 * auth user.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error('Delete endpoint misconfigured: missing SUPABASE_URL or SUPABASE_SECRET_KEY');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Missing access token' });

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Validate the token against the auth server and take the uid from it, not
    // from the request body. A caller can only ever delete themselves.
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (authError || !uid) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { error: emailError } = await admin.from('emails').delete().eq('user_id', uid);
    if (emailError) {
      console.error('Email delete failed:', emailError.message);
      return res.status(500).json({ error: 'Deletion failed' });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) {
      console.error('Auth user delete failed:', deleteError.message);
      return res.status(500).json({ error: 'Deletion failed' });
    }

    console.log('[delete] account removed');
    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('Delete failed:', err);
    return res.status(500).json({ error: 'Deletion failed' });
  }
}
