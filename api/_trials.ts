/* ── The trials ─────────────────────────────────────────────────────────────
   A trial is a named condition. It is drawn from what the record literally
   contains — a filed miss, a gap, a completion — and never from a guess about
   somebody's psychology. The archetype is who you are. The trial is where you
   are, and it is never an assignment.

   Three fire from behaviour alone:

     The Devil   committed and didn't, twice, on acts pointing at one target
     The Hermit  two or more days unanswered, and then a return
     The Sun     acts finished while the boundary still needs the world

   The hard rule is that absence is never the route to a card. The Hermit can
   only arrive once someone has come back, which is why every trial is evaluated
   at the moment a person opens their Ledger rather than at six in the morning:
   at six there is no return to see, and if disappearing were the unlock the
   product would be teaching people that quitting is interesting. */

export type Figure = 'devil' | 'hermit' | 'sun';

export interface Entry {
  id: string;
  day_number: number;
  committed_at: string;
  completed_at: string | null;
  filed_at: string | null;
  cycle_id: string | null;
}

export interface TrialTrigger {
  figure: Figure;
  /** One sentence, composed from the record. Never a cause, only what happened. */
  reason: string;
}

/**
 * Times are rendered in the person's own timezone.
 *
 * A reason that says "6:04am" to someone who committed at 11:04pm is a fact the
 * record does not contain. Everything in a reason has to be a thing they could
 * check.
 */
function clock(iso: string, zone: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: zone || 'UTC',
    }).format(new Date(iso)).replace(' ', '').toLowerCase();
  } catch {
    return '';
  }
}

/* Small numbers are words in a sentence. "2 mornings arrived" is a log line;
   this is something a person reads. */
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const count = (n: number) => (n < WORD.length ? WORD[n] : String(n));

/** A day that was committed, answered, and answered with "I didn't". */
const isMiss = (e: Entry) => Boolean(e.filed_at) && !e.completed_at;
/** A day that was committed and never answered at all. */
const isSilent = (e: Entry) => !e.filed_at && !e.completed_at;

/**
 * Which trial the record supports, if any.
 *
 * `entries` is the whole ledger, ascending by day. `cycleId` scopes the Devil to
 * one target: two misses on unrelated things are two misses, not a binding.
 *
 * Order matters only because one trial runs at a time. The Devil is first
 * because a filed miss is the most explicit evidence a person can leave.
 */
export function detectTrial(
  entries: Entry[],
  cycleId: string | null,
  timezone: string | null,
  opts: {
    requiresContact: boolean | null;
    crossed: boolean;
    /* Figures this cycle is already done with. They are skipped rather than
       returned-and-discarded, because the evidence for a trial does not expire:
       two filed misses stay in the record forever, so a caller that asked for
       "the trial" and threw it away because the Devil was spent would get the
       Devil again every day, and the Hermit and the Sun would be unreachable
       for the rest of the cycle. Found by working through what a second week
       actually looks like, not by a test. */
    exclude?: Set<Figure>;
  }
): TrialTrigger | null {
  const inCycle = cycleId ? entries.filter((e) => e.cycle_id === cycleId) : entries;
  const spent = opts.exclude ?? new Set<Figure>();

  /* ── The Devil ────────────────────────────────────────────────────────────
     Committed and didn't, twice, on acts pointing at the same target. */
  const misses = inCycle.filter(isMiss);
  if (!spent.has('devil') && misses.length >= 2) {
    const [a, b] = misses.slice(-2);
    const ta = clock(a.committed_at, timezone);
    const tb = clock(b.committed_at, timezone);
    return {
      figure: 'devil',
      reason: ta && tb
        ? `You said yes at ${ta}, and again at ${tb}, and neither one happened. Twice.`
        : `You said yes twice, and neither one happened.`,
    };
  }

  /* ── The Hermit ───────────────────────────────────────────────────────────
     Two or more days unanswered, and then a return.

     The return is today. Not a guess about today — the endpoint only runs
     because somebody opened their Ledger, so the fact of being here is the
     return, and today's own day is therefore never counted as silence. It is
     still live and they can still answer it.

     Everything before today is fair game, including a run that reaches right up
     to it: those mornings came and went, and the run is over because the person
     is reading this. The trial is the return, never the leaving, and without a
     return there is nobody here to show it to. */
  const prior = entries.slice(0, -1);
  let longestGap = 0;
  let run = 0;
  for (const e of prior) {
    run = isSilent(e) ? run + 1 : 0;
    if (run > longestGap) longestGap = run;
  }
  if (!spent.has('hermit') && longestGap >= 2) {
    return {
      figure: 'hermit',
      reason: `${count(longestGap)} mornings arrived and went unanswered. You came back.`
        .replace(/^./, (c) => c.toUpperCase()),
    };
  }

  /* ── The Sun ──────────────────────────────────────────────────────────────
     Finished acts while the boundary still needs contact with the world. */
  const finished = inCycle.filter((e) => e.completed_at).length;
  if (!spent.has('sun') && opts.requiresContact === true && !opts.crossed && finished >= 2) {
    return {
      figure: 'sun',
      reason: `${count(finished)} acts finished, and the boundary you set is still uncrossed.`
        .replace(/^./, (c) => c.toUpperCase()),
    };
  }

  return null;
}

/**
 * What happens to an active trial when a new day arrives.
 *
 * Crossing at any encounter frees the figure. Otherwise it returns — not as a
 * failure, as the pattern doing what patterns do — and one variable is repaired
 * by the act it comes back with. At the third it stops returning and a quest
 * opens instead.
 */
export type Advance =
  | { kind: 'hold' }
  | { kind: 'freed'; entryId: string }
  | { kind: 'returns'; encounter: 2 | 3 };

export function advanceTrial(
  trial: { encounter: number; last_day: number },
  entries: Entry[],
  today: Entry | null
): Advance {
  if (!today || today.day_number <= trial.last_day) return { kind: 'hold' };

  const previous = entries.find((e) => e.day_number === trial.last_day);
  if (previous?.completed_at) return { kind: 'freed', entryId: previous.id };

  /* Three is the end of the road: the quest is open and stays open until it is
     crossed. A fourth encounter would be nagging. */
  const next = Math.min(3, trial.encounter + 1) as 2 | 3;
  return { kind: 'returns', encounter: next };
}
