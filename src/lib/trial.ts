import { supabase } from './supabase';
import type { Trial } from '../components/TrialCard';
import type { Unbound } from '../components/TrialUnbinding';

/* The trial, asked for on arrival.
 *
 * The evaluation lives on the server and running it here — when a person opens
 * their Ledger — is what makes the Hermit possible: a return is only visible
 * when somebody returns. Nothing about a trial is decided in the browser. */
export interface TrialState {
  trial: Trial | null;
  /* Present exactly once, ever, per figure: the response that carries it is the
     only one that will. The server stamps it seen as it sends it. */
  unbinding: Unbound | null;
}

async function call(action: 'state' | 'reject'): Promise<TrialState> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return NOTHING;
    const res = await fetch('/api/trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return NOTHING;
    const body = (await res.json()) as Partial<TrialState>;
    return { trial: body.trial ?? null, unbinding: body.unbinding ?? null };
  } catch {
    /* A day with no trial is the normal day. */
    return NOTHING;
  }
}

const NOTHING: TrialState = { trial: null, unbinding: null };

export const getTrial = () => call('state');
export const rejectTrial = () => call('reject');
