/* ── The two closed lists ───────────────────────────────────────────────────
   Thirteen each, not twelve, precisely so no one-per-sign mapping is possible.

   BECOMING comes from the desired reality — who they are reaching for.
   LOOP comes from the repeating pattern and the fear — what they are doing
   instead. A becoming and a loop from different rows is the normal case.

   These live here rather than inside /api/generate because day 7 re-runs the
   becoming selection against the same thirteen. Two copies of a closed list is
   a closed list that drifts. */

export const BECOMINGS = `
THE HEADLINER — built to be seen doing the work; wants the thing out in the world under their own name.
THE CORNERSTONE — built to stay; wants a life with an address, roots, and people who know them.
THE CLOSER — built to finish; wants to land the thing and let the win stand.
THE BOUNCER — built to hold a threshold; wants their time and attention to be theirs to give.
THE CONDUCTOR — built to run something with other hands in it; wants weight carried by more than one person.
THE NEGOTIATOR — built to say the hard thing on the day it happens; wants to be honest in real time.
THE CLEAN SLATE — built to forgive without an apology; wants the accounts closed and the resentment gone.
THE CURATOR — built to decide what gets shown; wants the past to be something they visit, not live in.
THE LIFEGUARD — built to stay present in hard feeling; wants to be here for their own life without numbing it.
THE LIGHTHOUSE — built to hold steady when nothing is on fire; wants calm that doesn't feel like danger.
THE FOUNDER — built to originate; wants something that is theirs rather than assigned to them.
THE LOCKSMITH — built to authorize themselves; wants to move without waiting for anyone's permission.
THE HOST — built to stay in the room; wants to be close to people without leaving first.
`;

export const LOOPS = `
The Opening Act — Won't go on until certain; has been almost ready for a year.
The Tourist — Never lands. Every situation is "for now"; nothing is chosen.
The Ninety-Percenter — Blows it up at 90%; a folder of things nearly done.
The Yes Machine — Cannot refuse; says yes with the mouth and no with the body.
The One-Man Band — Cannot ask for help; does everything badly at once.
The Peacekeeper — Swallows the thing in the moment to avoid making it weird.
The Debt Collector — Keeps the tab forever; collects on debts nobody agreed to.
The Exhibit — The wound is the introduction; the worst chapter is on permanent display.
The Numb Nom — Numbs instead of feels; consumes to avoid what's underneath.
The Arsonist — Torches things once they're stable; needs the fire to feel alive.
The Legacy Hire — Lives the approved life; inherited it instead of building it.
The Applicant — Waits for permission that was always theirs to give.
The Ghost — Leaves before being left; exits every room that starts to matter.
`;

/* The names alone, for validating a selection. A becoming that is not on this
   list is not a becoming — the model does not get to invent one, and day 7 must
   be able to reject a name as firmly as day 1 does. */
export const BECOMING_NAMES: string[] = BECOMINGS
  .split('\n')
  .map((line) => line.split('—')[0].trim())
  .filter(Boolean);
