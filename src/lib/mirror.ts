import { supabase } from './supabase';
import type { Mirror } from '../components/MirrorCard';

/* The Mirror, asked for only on a day with no trial.
 *
 * Deliberately its own round trip rather than part of the trial answer: it is
 * a model call, and the Ledger must not wait on one to show somebody their act.
 * It arrives when it arrives, or it does not arrive, and either is a fine day.
 */
export async function getMirror(): Promise<Mirror | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const res = await fetch('/api/mirror', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { mirror: Mirror | null };
    return body.mirror ?? null;
  } catch {
    return null;
  }
}
