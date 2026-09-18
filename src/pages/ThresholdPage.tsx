import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import AscentField from '../components/AscentField';
import { HERO_STARS, TOP } from '../lib/ascent';
import { prefersReducedMotion } from '../lib/motion';

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
  const body = useRef<HTMLDivElement>(null);
  const epigraph = useRef<HTMLDivElement>(null);

  /* The content arrives on a field that is already there. The door has just
     finished opening onto it, so nothing about the ground changes — only the
     words appear.

     The epigraph goes first and is held on its own before the disclosure joins
     it: it is not part of the disclosure and reading it in the same breath as
     "we'll also ask for your birth time" turns it into a caption. Opacity only,
     never display — the button beneath is in the DOM and clickable throughout,
     so nobody who already knows this screen is made to wait for a quotation.
     Reduced motion gets both at once. */
  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (reduced) {
      gsap.set([epigraph.current, body.current], { opacity: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(epigraph.current, { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power1.inOut' });
      gsap.fromTo(body.current, { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power1.inOut', delay: 1.4 });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100svh',
        /* Dark, like everything before the reveal.

           The stranger's first three screens used to be near-black, cream, then
           near-black again: two inversions in three screens, which reads as a
           flicker rather than a passage. It also spent the payoff early. The
           product now ends with ink dropping and paper arriving with a person's
           name on it — light is the reward, so paper appears nowhere before the
           reveal. Same copy, same choices, same disclosure; only the ground and
           the type have changed ends. */
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {/* The same sky the door opened onto, at the same density. */}
      <AscentField altitude={TOP} {...HERO_STARS} />

      {/* One line, before anything is asked of anyone. It is the only borrowed
          voice in the product and it is attributed, because an unattributed
          quotation read as a line we had written about ourselves. Small and
          muted: it sets the ground for the screen, it is not the screen's
          claim. */}
      <div
        ref={epigraph}
        data-epigraph=""
        style={{ maxWidth: 420, width: '100%', position: 'relative', zIndex: 1, opacity: 0 }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--sv-font)',
            fontWeight: 300,
            fontSize: 15,
            lineHeight: 1.7,
            color: 'rgba(251,250,247,0.72)',
          }}
        >
          &ldquo;The privilege of a lifetime is to become who you truly are.&rdquo;
        </p>
        <p
          style={{
            margin: '10px 0 0',
            fontFamily: 'var(--sv-font)',
            fontWeight: 400,
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(251,250,247,0.42)',
          }}
        >
          Carl Jung
        </p>
      </div>

      <div
        ref={body}
        style={{ maxWidth: 420, width: '100%', position: 'relative', zIndex: 1, opacity: 0, marginTop: 38 }}
      >
        {/* No heading. It was the hero's line word for word, so arriving here
            meant reading the same sentence twice — once on the way out and once
            on the way in. This screen's job is the disclosure and the choice. */}
        <p
          style={{
            marginTop: 0,
            fontFamily: 'var(--sv-font)',
            fontWeight: 300,
            fontSize: 16,
            lineHeight: 1.7,
            color: 'rgba(251,250,247,0.88)',
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
            color: 'rgba(251,250,247,0.6)',
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
            color: '#FBFAF7',
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
            background: '#FBFAF7',
            color: '#0C0C0B',
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
            color: 'rgba(251,250,247,0.6)',
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
