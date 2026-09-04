import { supabase } from './supabase';

export interface Recalibration {
  becoming: string;
  previous: string;
  changed: boolean;
  reason: string;
}

/**
 * Send the day 7 answer and get the resulting becoming back.
 *
 * The selection runs on the server under the secret key, authenticated by this
 * session's own access token — the same shape as /api/delete. A becoming is not
 * something a browser gets to assert about itself, so the client sends the
 * sentence and is told the outcome.
 */
export async function submitRecalibration(answer: string): Promise<Recalibration | null> {
  const text = answer.trim();
  if (!text) return null;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  try {
    const res = await fetch('/api/recalibrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ answer: text }),
    });
    if (!res.ok) {
      console.warn('Recalibration failed:', res.status);
      return null;
    }
    return (await res.json()) as Recalibration;
  } catch (err) {
    console.warn('Recalibration failed:', err);
    return null;
  }
}
