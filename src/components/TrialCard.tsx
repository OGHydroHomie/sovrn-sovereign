import { useState } from 'react';

export interface Trial {
  figure: 'devil' | 'hermit' | 'sun';
  encounter: number;
  reason: string;
  quest: string | null;
  first: boolean;
}

interface Props {
  trial: Trial;
  /** "this isn't it" — the route changes and nothing is recorded about it. */
  onReject: () => void;
}

const NAME: Record<Trial['figure'], string> = {
  devil: 'The Devil',
  hermit: 'The Hermit',
  sun: 'The Sun',
};

/* The Ledger is paper. Everything here is ink on it.
 *
 * This was first written in the field's palette — #FBFAF7 on transparent — which
 * is right for every dark surface in the product and renders as nothing at all
 * on this one. The card was present, its text was in the DOM, and the page had a
 * blank three hundred pixels in it. Colours come from the Ledger's own set. */
const INK = '#1A1A1A';
const STRONG = '#000000';
const MUTED = '#6E6A66';
const RULE = '#E4E0D6';

/* A trial, wrapping the day.
 *
 * It names the condition and the act stays exactly where it was, underneath.
 * A day never passes with a trial and no act: this sits above one, it does not
 * replace one, and if there is no act there is nothing for it to wrap.
 *
 * The card is a placeholder here. The art exists and the arrival — the field
 * stopping, the ink entering, the stamp — is its own build; putting a
 * half-ceremony in now would mean taking one out later.
 */
export default function TrialCard({ trial, onReject }: Props) {
  const [rejecting, setRejecting] = useState(false);

  return (
    <section
      data-trial={trial.figure}
      data-encounter={trial.encounter}
      style={{
        marginBottom: 26, paddingBottom: 22,
        borderBottom: `1px solid ${RULE}`,
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Where the card goes. Deliberately a shape and not a smaller version
            of the real thing — a card that arrives without its ceremony would
            spend the one moment this is built for. */}
        <div
          aria-hidden="true"
          style={{
            flex: 'none', width: 54, aspectRatio: '1080 / 1620',
            border: `1px solid ${RULE}`,
            background: '#F3F0E8',
          }}
        />

        <div style={{ minWidth: 0 }}>
          <p
            className="sv-label"
            style={{
              margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: MUTED,
            }}
          >
            {NAME[trial.figure]}
          </p>

          {/* One sentence, and every part of it is something they could check. */}
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(17px, 4.6vw, 20px)', lineHeight: 1.4,
              letterSpacing: '-0.005em', color: STRONG,
            }}
          >
            {trial.reason}
          </p>

          {/* Recurrence is stated plainly. It is the pattern doing what patterns
              do, and naming it is the point — a silent log would not be. */}
          {trial.encounter > 1 && (
            <p
              style={{
                margin: '10px 0 0', fontFamily: 'var(--sv-font)', fontWeight: 300,
                fontSize: 14, lineHeight: 1.55, color: MUTED,
              }}
            >
              {trial.encounter === 2
                ? 'Back a second time, smaller.'
                : 'Back a third time. This one ends it.'}
            </p>
          )}

          {trial.quest && (
            <p
              style={{
                margin: '12px 0 0', fontFamily: 'var(--sv-font)', fontWeight: 400,
                fontSize: 15, lineHeight: 1.55, color: INK,
              }}
            >
              {trial.quest}
            </p>
          )}

          <button
            onClick={() => { setRejecting(true); onReject(); }}
            disabled={rejecting}
            style={{
              marginTop: 16, background: 'none', border: 'none', padding: '6px 2px',
              cursor: rejecting ? 'wait' : 'pointer',
              fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13,
              color: MUTED,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            this isn&rsquo;t it
          </button>
        </div>
      </div>
    </section>
  );
}
