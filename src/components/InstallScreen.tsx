import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import AscentField from './AscentField';
import ArchetypeMark from './ArchetypeMark';
import { HERO_STARS, TOP } from '../lib/ascent';
import { prefersReducedMotion } from '../lib/motion';
import {
  clearInstallPrompt, getInstallPrompt, isIOS, markShown, stopAsking,
} from '../lib/install';

interface Props {
  becoming: string | null | undefined;
  /** Which asking this is: the first after an act, or the last. */
  occasion: 1 | 2;
  /** Closes it, whichever way it was closed. */
  onClose: () => void;
}

/* Keeping it.
 *
 * A full screen rather than a banner, once, at the only moment it is true: an
 * act has just been committed, and tomorrow morning something will be written
 * about what happened to it. A bar sliding up the bottom of a page is asking to
 * be flicked away; this asks properly and then never asks again.
 *
 * Dark, on the same field as everything before the reveal. No paper — paper is
 * the reward and it belongs to the reading.
 *
 * There is no guilt copy and no consequence dressed as one. The line at the
 * bottom is the plain fact of what happens instead, and "later" costs nothing.
 */
export default function InstallScreen({ becoming, occasion, onClose }: Props) {
  const body = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const prompt = getInstallPrompt();
  const ios = isIOS();

  useEffect(() => {
    markShown(occasion);
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      gsap.fromTo(body.current, { opacity: 0 },
        { opacity: 1, duration: reduced ? 0.3 : 0.6, ease: 'power1.inOut' });
    }, body);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = async () => {
    if (!prompt || busy) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      clearInstallPrompt();
      /* Accepted or refused, the browser has now had this conversation and will
         not offer the event again. Asking a second time would be asking into a
         void. */
      if (outcome === 'accepted') stopAsking();
    } catch { /* the browser declined to show it */ }
    setBusy(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#000000', overflow: 'hidden',
      }}
    >
      {/* The field keeps off the words here for the same reason it does in the
          quiz: stars were landing on the line at the bottom, and a sentence with
          a star in the middle of it is a sentence people read twice. */}
      <AscentField altitude={TOP} {...HERO_STARS} clearFor={[body]} />

      <div
        ref={body}
        style={{
          position: 'relative', zIndex: 1, height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 28px', textAlign: 'center', opacity: 0,
        }}
      >
        {/* Only when there is one. The fallback mark is a solid black square,
            which on this ground is an invisible object holding a space open. */}
        {becoming && <ArchetypeMark becoming={becoming} size="clamp(84px, 22vw, 104px)" />}

        <p
          style={{
            margin: '34px 0 0', maxWidth: 330,
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: 'clamp(21px, 5.6vw, 25px)', lineHeight: 1.36,
            letterSpacing: '-0.01em', color: '#FBFAF7', textWrap: 'balance',
          }}
        >
          Tomorrow at six, it reads what you did.
        </p>
        <p
          style={{
            margin: '14px 0 0', maxWidth: 330,
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: 'clamp(21px, 5.6vw, 25px)', lineHeight: 1.36,
            letterSpacing: '-0.01em', color: '#FBFAF7', textWrap: 'balance',
          }}
        >
          Keep it where you&rsquo;ll see it.
        </p>

        {/* One route or the other, never both and never neither — the screen
            does not open unless one of them exists. */}
        {prompt ? (
          <button
            onClick={() => void add()}
            disabled={busy}
            style={{
              marginTop: 34, width: '100%', maxWidth: 320, minHeight: 52,
              background: '#FBFAF7', color: '#0C0C0B', border: 'none', borderRadius: 2,
              fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              padding: '17px 24px', cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Add to Home Screen
          </button>
        ) : ios ? (
          <p
            style={{
              margin: '30px 0 0', maxWidth: 300,
              fontFamily: 'var(--sv-font)', fontWeight: 400,
              fontSize: 15, lineHeight: 1.6, color: 'rgba(251,250,247,0.88)',
            }}
          >
            Tap Share, then Add to Home Screen.
          </p>
        ) : null}

        <button
          onClick={onClose}
          style={{
            marginTop: 26, minHeight: 44, padding: '10px 14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15,
            color: 'rgba(251,250,247,0.66)',
            textDecoration: 'underline', textUnderlineOffset: 4,
          }}
        >
          later
        </button>

        <p
          style={{
            margin: '30px 0 0', maxWidth: 300,
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: 12.5, lineHeight: 1.6, color: 'rgba(251,250,247,0.55)',
          }}
        >
          Without it, tomorrow&rsquo;s act arrives by email instead.
        </p>
      </div>
    </div>
  );
}
