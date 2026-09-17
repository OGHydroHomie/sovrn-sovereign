import { supabase } from './supabase';
import { getBlueprint } from '../utils/storage';
import { getProfile } from './blueprint';

/**
 * Does this person have a reading?
 *
 * A session is not a Ledger. `ensureUser` mints an anonymous identity for every
 * visitor who reaches the app, so "signed in" is true of somebody who landed
 * nine seconds ago — and offering them "Your Ledger" sends a stranger to an
 * empty page. The question is whether a reading exists: in this browser, or on
 * the row.
 *
 * Lives here because two places now ask it — the way back in at the foot of the
 * front page, and the link in its header — and two copies of this rule would
 * eventually disagree about who is a stranger.
 */
export async function hasReading(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  if (getBlueprint()?.text) return true;
  const me = await getProfile();
  return Boolean(me?.becoming);
}
