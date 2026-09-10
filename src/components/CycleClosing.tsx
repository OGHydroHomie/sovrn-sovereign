import type { Cycle } from '../lib/cycle';
import type { LedgerEntry } from '../lib/ledger';

interface Props {
  cycle: Cycle;
  entries: LedgerEntry[];
  onNext: () => void;
  timezone: string | null;
}

/* Written out so the sentence reads as a sentence. A cycle is thirty days, so
   this never needs to go higher. */
const WORDS = [
  'zero times', 'once', 'twice', 'three times', 'four times', 'five times', 'six times',
  'seven times', 'eight times', 'nine times', 'ten times', 'eleven times', 'twelve times',
  'thirteen times', 'fourteen times', 'fifteen times', 'sixteen times', 'seventeen times',
  'eighteen times', 'nineteen times', 'twenty times', 'twenty-one times', 'twenty-two times',
  'twenty-three times', 'twenty-four times', 'twenty-five times', 'twenty-six times',
  'twenty-seven times', 'twenty-eight times', 'twenty-nine times', 'thirty times',
];
const times = (n: number) => WORDS[n] ?? `${n} times`;

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--sv-font)', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.16em', color: '#6E6A66', textTransform: 'uppercase',
};

/* The end of a cycle, in all three ways it can end.

   No score, no percentage, no grade, and no red anywhere. A crossing is not a
   trophy and an expiry is not a failure notice — the consequence of an expiry is
   that the thing is still undone and a month has gone, which is sufficient
   without a single word of commentary.

   Neither ending pushes the person into another cycle. Someone who crossed the
   thing they came for and leaves has been served exactly as well as someone who
   keeps going. */
export default function CycleClosing({ cycle, entries, onNext, timezone }: Props) {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(undefined, { ...opts, ...(timezone ? { timeZone: timezone } : {}) })
        .format(new Date(iso));
    } catch { return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso)); }
  };
  const day = (iso: string) => fmt(iso, { month: 'short', day: 'numeric' });
  const time = (iso: string) => fmt(iso, { hour: 'numeric', minute: '2-digit' });

  const crossed = cycle.close_reason === 'crossed';
  const expired = cycle.close_reason === 'expired';
  const inCycle = entries.filter((e) => e.cycle_id === cycle.id || !e.cycle_id);

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <p style={LABEL}>
        {crossed ? `Cycle ${cycle.cycle_number} · crossed` : expired ? `Cycle ${cycle.cycle_number} · thirty days` : `Cycle ${cycle.cycle_number} · retired`}
      </p>

      <h1
        style={{
          marginTop: 16, fontFamily: 'var(--sv-font)', fontWeight: 300,
          fontSize: 'clamp(28px, 7.4vw, 40px)', lineHeight: 1.15,
          letterSpacing: '-0.01em', color: '#000000',
        }}
      >
        {crossed ? 'You crossed it.' : expired ? 'Thirty days.' : 'Closed.'}
      </h1>

      <p style={{ marginTop: 20, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 17, lineHeight: 1.7, color: '#1A1A1A' }}>
        {crossed && (
          <>
            {cycle.target_admitted} &mdash; filed {cycle.crossed_at ? `${day(cycle.crossed_at)}, ${time(cycle.crossed_at)}` : 'this cycle'}.
          </>
        )}
        {expired && (
          <>
            The cycle is closed. {cycle.target_admitted} is still undone.
          </>
        )}
        {!crossed && !expired && (
          <>
            You retired this one. It stays on the record as an attempt, not as something finished.
          </>
        )}
      </p>

      {crossed && (
        <p style={{ marginTop: 14, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, lineHeight: 1.7, color: '#6E6A66' }}>
          Your account of it, checked against the boundary you set. Nothing here saw
          it happen.
        </p>
      )}

      {/* What actually happened over the thirty days, stated and left alone. The
          target being undone is one fact; returning eleven times is another, and
          leaving it out is its own kind of editing. No adjective, no "but", no
          "at least" — the number says itself or it says nothing. */}
      {expired && (
        <p style={{ marginTop: 16, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 17, lineHeight: 1.7, color: '#1A1A1A' }}>
          You committed {times(inCycle.length)} over thirty days and crossed none of them.
        </p>
      )}

      {/* ── The record ── */}
      <div style={{ marginTop: 44 }}>
        <p style={LABEL}>What you named</p>
        <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: '#6E6A66' }}>
          {cycle.target_stated}
        </p>

        {cycle.target_stated.trim() !== cycle.target_admitted.trim() && (
          <>
            <p style={{ ...LABEL, marginTop: 26 }}>What you took on</p>
            <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 16, lineHeight: 1.7, color: '#1A1A1A' }}>
              {cycle.target_admitted}
            </p>
          </>
        )}

        <p style={{ ...LABEL, marginTop: 26 }}>The boundary</p>
        <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: '#1A1A1A' }}>
          {cycle.rubric}
        </p>
      </div>

      <div style={{ marginTop: 44 }}>
        <p style={LABEL}>Every day of it</p>
        {inCycle.map((e) => (
          <div key={e.id} style={{ borderTop: '1px solid #E4E0D6', padding: '16px 0' }}>
            <p className="sv-label" style={{ fontSize: 11, letterSpacing: '0.1em', color: '#1A1A1A' }}>
              DAY {e.day_number} · {day(e.committed_at)}
              {e.completed_at ? ` · Completed ${time(e.completed_at)}` : ' · Open'}
              {e.id === cycle.crossing_entry_id ? ' · Crossed here' : ''}
            </p>
            <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: '#6E6A66' }}>
              {e.mission_text}
            </p>
            {e.what_happened && (
              <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 15, lineHeight: 1.6, color: '#1A1A1A' }}>
                {e.what_happened}
              </p>
            )}
          </div>
        ))}
        <div style={{ borderTop: '1px solid #E4E0D6' }} />
      </div>

      {/* ── What happens next, without a thumb on it ── */}
      <div style={{ marginTop: 48 }}>
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: '#1A1A1A' }}>
          Nothing follows from this on its own. You can name another thing, or you can
          leave it here.
        </p>
        <button
          onClick={onNext}
          style={{
            marginTop: 20, width: '100%', maxWidth: 340, minHeight: 52,
            background: 'none', color: '#1A1A1A', border: '1px solid #1A1A1A', borderRadius: 2,
            fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
            textTransform: 'uppercase', letterSpacing: '0.14em', padding: '18px 24px', cursor: 'pointer',
          }}
        >
          Name another target
        </button>
      </div>
    </div>
  );
}
