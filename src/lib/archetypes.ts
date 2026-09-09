/* The two closed lists, for the browser.

   api/_becomings.ts is the authority — it is what the engine selects from, and
   it must never import client code into a serverless function. This is a
   verified copy: scripts/check-archetypes.mjs compares the two and fails if they
   drift. Duplication with a guard beats a cross-boundary import that only breaks
   in production.

   BECOMINGS and LOOPS are chosen INDEPENDENTLY. A becoming and a loop from
   different positions is the normal case, not an error, so nothing here pairs
   them and nothing should render them as pairs. */

export const BECOMINGS = [
  'THE HEADLINER',
  'THE CORNERSTONE',
  'THE CLOSER',
  'THE BOUNCER',
  'THE CONDUCTOR',
  'THE NEGOTIATOR',
  'THE CLEAN SLATE',
  'THE CURATOR',
  'THE LIFEGUARD',
  'THE LIGHTHOUSE',
  'THE FOUNDER',
  'THE LOCKSMITH',
  'THE HOST',
] as const;

export const LOOPS = [
  'The Opening Act',
  'The Tourist',
  'The Ninety-Percenter',
  'The Yes Machine',
  'The One-Man Band',
  'The Peacekeeper',
  'The Debt Collector',
  'The Exhibit',
  'The Numb Nom',
  'The Arsonist',
  'The Legacy Hire',
  'The Applicant',
  'The Ghost',
] as const;
