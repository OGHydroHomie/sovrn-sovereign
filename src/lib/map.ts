import { supabase } from './supabase';

export type Figure = 'devil' | 'hermit' | 'sun';
export type DayState = 'done' | 'missed' | 'empty';

export type Position =
  | { state: 'freed'; figure: Figure; date: string }
  | { state: 'active'; figure: Figure }
  | { state: 'locked' };

export interface MapData {
  /* Twenty-five of them, and the browser is never told how many are filled.
     It has to draw them; it never has to count them. */
  figures: Position[];
  days: Array<{ day: string; state: DayState }>;
  cycles: Array<{ target: string; how: string; date: string }>;
}

/** The record, laid out. Null when it cannot be read; the page says so. */
export async function getMap(): Promise<MapData | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const res = await fetch('/api/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    return (await res.json()) as MapData;
  } catch {
    return null;
  }
}
