export interface Mission {
  mission: string;
  verification: string;
  minutes: number;
  source: 'generated' | 'fallback';
}

/* The Blueprint's own header for the One Act. Nothing else in the document is a
   directive, so this section is the only honest seed for a Day 1 mission. */
const ACT_HEADER = 'FIRST SOVEREIGN ACT';

/* Headers that can follow it, so extraction stops at the next section rather than
   swallowing the rest of the document. */
const OTHER_HEADERS = [
  'SOUL ARCHITECTURE',
  'HIDDEN GIFTS',
  'SHADOW PATTERN',
  'RELATIONSHIP BLUEPRINT',
  'CAREER DESTINY',
  'TRUE NORTH',
];

/**
 * Pull the First Sovereign Act section out of a finished blueprint.
 *
 * Returns null when the section is absent — the caller must not invent a mission
 * from the rest of the document, because the Act is the only part the blueprint
 * wrote as an instruction.
 */
export function extractSovereignAct(blueprint: string): string | null {
  const lines = blueprint.split('\n');
  const start = lines.findIndex((l) => l.trim() === ACT_HEADER);
  if (start === -1) return null;

  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (OTHER_HEADERS.includes(lines[i].trim())) break;
    body.push(lines[i]);
  }

  const text = body.join('\n').trim();
  return text.length > 0 ? text : null;
}

/**
 * Ask the server to derive the Day 1 mission from the Act.
 *
 * The endpoint always resolves with a mission — a validated one, or the hard-coded
 * safe default — so a null here means the network call itself failed.
 */
export async function requestMission(sovereignAct: string): Promise<Mission | null> {
  try {
    const res = await fetch('/api/mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sovereignAct }),
    });
    if (!res.ok) {
      console.warn('Mission request failed:', res.status);
      return null;
    }
    return (await res.json()) as Mission;
  } catch (err) {
    console.warn('Mission request failed:', err);
    return null;
  }
}
