/**
 * Lightweight tropical Sun-sign lookup for the threshold confirmation display.
 * Pure date logic — intentionally independent of the natal chart engine
 * (chart.ts) so nothing in the calculation pipeline is touched.
 */

interface SignInfo {
  sign: string;
  archetype: string;
}

// [startMonth, startDay, endMonth, endDay]
const SIGNS: Array<{ sign: string; archetype: string; range: [number, number, number, number] }> = [
  { sign: 'Aquarius', archetype: 'The Visionary', range: [1, 20, 2, 18] },
  { sign: 'Pisces', archetype: 'The Mystic', range: [2, 19, 3, 20] },
  { sign: 'Aries', archetype: 'The Initiator', range: [3, 21, 4, 19] },
  { sign: 'Taurus', archetype: 'The Sovereign', range: [4, 20, 5, 20] },
  { sign: 'Gemini', archetype: 'The Emissary', range: [5, 21, 6, 20] },
  { sign: 'Cancer', archetype: 'The Keeper', range: [6, 21, 7, 22] },
  { sign: 'Leo', archetype: 'The Flame', range: [7, 23, 8, 22] },
  { sign: 'Virgo', archetype: 'The Alchemist', range: [8, 23, 9, 22] },
  { sign: 'Libra', archetype: 'The Mirror', range: [9, 23, 10, 22] },
  { sign: 'Scorpio', archetype: 'The Threshold Guardian', range: [10, 23, 11, 21] },
  { sign: 'Sagittarius', archetype: 'The Wayfinder', range: [11, 22, 12, 21] },
];

// Capricorn wraps the year boundary, so it is handled separately.
const CAPRICORN: SignInfo = { sign: 'Capricorn', archetype: 'The Architect' };

export function getSunArchetype(birthDate: string): SignInfo | null {
  if (!birthDate) return null;

  const parts = birthDate.split('-');
  if (parts.length < 3) return null;

  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!month || !day) return null;

  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return CAPRICORN;
  }

  for (const { sign, archetype, range } of SIGNS) {
    const [sM, sD, eM, eD] = range;
    const afterStart = month > sM || (month === sM && day >= sD);
    const beforeEnd = month < eM || (month === eM && day <= eD);
    if (afterStart && beforeEnd) {
      return { sign, archetype };
    }
  }

  return null;
}
