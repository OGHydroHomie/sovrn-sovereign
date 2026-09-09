interface Props {
  onEnter: () => void;
  onLeave: () => void;
}

/* The door.

   It sits between the hero and question one, and it is deliberately not a
   funnel: no motion, no progress bar, no urgency, nothing that reads as being
   moved along. Cream, black, Geist, silence. Someone should be able to stand
   here and decide.

   It also carries the disclosure. Birth date, birth time, birth place, the
   belief in the way and the pattern being repeated are all named here, before
   anything is asked for — rather than arriving one question at a time with the
   email at the end. */
export default function ThresholdPage({ onEnter, onLeave }: Props) {
  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#FBFAF7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        <h1
          style={{
            fontFamily: 'var(--sv-font)',
            fontWeight: 300,
            fontSize: 'clamp(28px, 7.6vw, 40px)',
            lineHeight: 1.18,
            letterSpacing: '-0.01em',
            color: '#000000',
          }}
        >
          This life is yours. Take the reins.
        </h1>

        <p
          style={{
            marginTop: 30,
            fontFamily: 'var(--sv-font)',
            fontWeight: 300,
            fontSize: 16,
            lineHeight: 1.7,
            color: '#1A1A1A',
          }}
        >
          Three questions about the life you want, the belief standing in its way,
          and the pattern you keep repeating.
        </p>

        <p
          style={{
            marginTop: 16,
            fontFamily: 'var(--sv-font)',
            fontWeight: 300,
            fontSize: 15,
            lineHeight: 1.7,
            color: '#6E6A66',
          }}
        >
          We&rsquo;ll also ask for your name, birth date, time and place, and email.
        </p>

        <p
          style={{
            marginTop: 26,
            fontFamily: 'var(--sv-font)',
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.7,
            color: '#000000',
          }}
        >
          Open your Blueprint. Choose your next act.
        </p>

        <button
          onClick={onEnter}
          style={{
            marginTop: 40,
            width: '100%',
            minHeight: 52,
            background: '#000000',
            color: '#FBFAF7',
            border: 'none',
            borderRadius: 2,
            fontFamily: 'var(--sv-font)',
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            padding: '18px 24px',
            cursor: 'pointer',
          }}
        >
          I create my fate
        </button>

        {/* Leaves without comment. No confirmation, no second ask, no line about
            what they are missing — a door someone can walk back out of is the
            only kind worth putting here. */}
        <button
          onClick={onLeave}
          style={{
            marginTop: 20,
            background: 'none',
            border: 'none',
            padding: '8px 2px',
            cursor: 'pointer',
            fontFamily: 'var(--sv-font)',
            fontWeight: 300,
            fontSize: 14,
            color: '#6E6A66',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Maybe someday
        </button>
      </div>
    </div>
  );
}
