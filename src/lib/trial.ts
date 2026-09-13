import { supabase } from './supabase';
import type { Trial } from '../components/TrialCard';

/* The trial, asked for on arrival.
 *
 * The evaluation lives on the server and running it here — when a person opens
 * their Ledger — is what makes the Hermit possible: a return is only visible
 * when somebody returns. Nothing about a trial is decided in the browser. */
async function call(action: 'state' | 'reject'): Promise<Trial | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const res = await fetch('/api/trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { trial: Trial | null };
    return body.trial ?? null;
  } catch {
    /* A day with no trial is the normal day. */
    return null;
  }
}

export const getTrial = () => call('state');
export const rejectTrial = () => call('reject');
