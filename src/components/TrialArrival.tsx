import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import AscentField from './AscentField';
import Crystallization from './Crystallization';
import { TOP } from '../lib/ascent';
import { T, EASE, prefersReducedMotion } from '../lib/motion';
import { markFrameUrls, preloadFrames } from '../lib/marks';
import type { Trial } from './TrialCard';

interface Props {
  trial: Trial;
  /** Today's act, which rises last. The trial sharpens it; it never replaces it. */
  act: string;
  /** The ceremony is over and the Ledger is theirs again. */
  onDone: () => void;
}

const NAME: Record<Trial['figure'], string> = {
  devil: 'The Devil',
  hermit: 'The Hermit',
  sun: 'The Sun',
};

/* A trial arriving.
 *
 * The first thing in this product that happens to someone rather than something
 * they did, and the sequence is built around that: the field stops dead before
 * anything else moves, and then one thing happens at a time with the screen to
 * itself. The card, then silence, then a name, then a sentence, then the act.
 *
 * It runs on the dark field because the whole of this build does — paper appears
 * exactly once in this product, at the reveal, and the Ledger underneath is the
 * one surface that is already paper. The hand-over at the end is that same move
 * in miniature: the ground lightens and the Ledger is already there.
 *
 * A recurrence gets none of it. The card cross-fades in over 1.6s and the
 * sequence is one beat rather than six, because the second time a figure shows
 * up the useful feeling is recognition, and a ceremony would make it an event
 * again.
 */
export default function TrialArrival({ trial, act, onDone }: Props) {
  /* Hidden from the first painted frame, not from the first layout effect.
     The effect that hides them is gated on the field being still and the frames
     being decoded, which is a second away — so for that second React painted the
     name, the reason and the act at full opacity, and the sequence then took
     them away and gave them back. Whatever the timeline is waiting for, these
     start invisible. */
  const HIDDEN = { opacity: 0 } as const;

  const root = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /* The whole column, so the field clears the words as well as the picture.
     The first cut passed only the card and the reason arrived with stars
     through it — the same mistake the quiz made, in the same product, with the
     same fix already written. */
  const columnRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLParagraphElement | null>(null);
  const reasonRef = useRef<HTMLParagraphElement | null>(null);
  const actRef = useRef<HTMLDivElement | null>(null);

  /* The field has to be still before the ink enters, and the frames have to be
     decoded before the crystallization starts — a stall halfway through reads
     as broken rather than as slow. Both are gates, not timers. */
  const [still, setStill] = useState(false);
  const [frames, setFrames] = useState<boolean | null>(null);
  /* The moment the ink actually starts moving, reported by the card itself.
     Not the moment the card mounts: the images decode into its canvas first,
     and starting the text sequence at mount ran it four hundred milliseconds
     ahead of the picture, which left the hold at 0.6s instead of 1.0s. The
     hold is the whole point of the sequence, so it is timed against the ink. */
  const [inked, setInked] = useState(false);
  /* The cover overlaps the stop rather than preceding it. Waiting for the
     ground to finish darkening before starting the settle cost a re-render and
     pushed every beat past its mark; running them together costs nothing and
     reads better anyway — the paper goes and the field is already there,
     slowing, rather than appearing afterwards and then slowing. */
  const reduced = prefersReducedMotion();
  const ceremony = trial.first && !reduced;

  useEffect(() => {
    const urls = markFrameUrls(NAME[trial.figure]);
    if (!urls || !ceremony) { setFrames(false); return; }
    let alive = true;
    void preloadFrames(urls).then((ok) => { if (alive) setFrames(ok); });
    return () => { alive = false; };
  }, [trial.figure, ceremony]);

  /* A recurrence, and reduced motion, have nothing to wait for. */
  useEffect(() => {
    if (!ceremony) setStill(true);
  }, [ceremony]);

  /* The cover, on its own clock, before the sequence exists. */
  useLayoutEffect(() => {
    if (!root.current) return;
    if (reduced) { gsap.set(root.current, { opacity: 1 }); return; }
    const ctx = gsap.context(() => {
      gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: T.trial.cover, ease: EASE.panel });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  const ready = still && frames !== null;
  /* A recurrence has no spread to wait for. */
  const started = ceremony ? ready && inked : ready;

  useLayoutEffect(() => {
    if (!started) return;
    const t = T.trial;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: onDone });

      if (!ceremony) {
        /* Recognition. One beat, everything together. */
        /* The whole thing inside the beat, not the beat plus a hold. A trailing
           pause put the recurrence at 2.5s against the arrival's 8, which is
           not "shorter", it is the same shape with less in it. */
        const d = reduced ? t.reducedFade : t.recur;
        tl.fromTo(cardRef.current, { opacity: 0 }, { opacity: 1, duration: d * 0.62, ease: EASE.in })
          .to([nameRef.current, reasonRef.current, actRef.current],
            { opacity: 1, duration: d * 0.5, ease: EASE.in }, d * 0.3)
          .to(root.current, { opacity: 0, duration: d * 0.3, ease: EASE.panel }, d * 0.7);
        return;
      }

      /* The constants are written as the spec reads them — seconds from the
         moment the screen appears. This timeline starts later than that, on the
         first frame of the spread, so every position is shifted back by the
         stillness that has already happened. Anchoring to the ink rather than
         to the mount is what keeps the hold a hold. */
      const at = (absolute: number) => Math.max(0, absolute - t.crystalAt);

      /* The card is crystallizing on its own clock from the same instant; the
         timeline's job is the text, on the beats that sequence leaves for it. */
      tl.set(nameRef.current, { opacity: 1 }, at(t.nameAt))
        /* A stamp, not a fade: it scales down the last 4% and the opacity is a
           hard cut. The same move the archetype's name makes on the reveal,
           because it is the same kind of event. */
        .fromTo(nameRef.current,
          { scale: t.nameScaleFrom },
          { scale: 1, duration: t.nameStamp, ease: EASE.out }, at(t.nameAt))
        .to(reasonRef.current, { opacity: 1, duration: t.reason, ease: EASE.in }, at(t.reasonAt))
        .fromTo(actRef.current,
          { opacity: 0, y: t.actRiseFrom },
          { opacity: 1, y: 0, duration: t.act, ease: EASE.in }, at(t.actAt))
        /* The ground lightens and the Ledger is underneath it, already paper.
           Fading the overlay out rather than cutting means there is no moment
           where the card is gone and nothing has replaced it. */
        .to(root.current, { opacity: 0, duration: t.handover, ease: EASE.panel }, at(t.handoverAt));
    }, root);

    return () => ctx.revert();
  }, [started, ceremony, reduced, onDone]);

  return (
    <div
      ref={root}
      data-trial-arrival={trial.figure}
      data-encounter={trial.encounter}
      data-ceremony={ceremony ? 'full' : 'recurrence'}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#000000', color: '#FBFAF7', opacity: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 26px', gap: 0, overflow: 'hidden',
      }}
    >
      {/* The ground. It is already drifting when this mounts, and the first
          second of the sequence is it coming to a complete stop — nothing can
          arrive out of a moving field. `onStill` is the gate, not a timer, so
          the ink never enters early on a slow frame. */}
      {!reduced && (
        <AscentField
          altitude={TOP}
          clearFor={[columnRef]}
          forceDrift
          settling={ceremony}
          settleSeconds={T.trial.still}
          onStill={() => setStill(true)}
        />
      )}

      <div ref={columnRef} style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
                    display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div ref={cardRef} style={{ opacity: ceremony ? 1 : 0 }}>
          {/* Mounted only once the field has stopped and the frames are decoded,
              so the ink enters into stillness. `ready` false is the finished
              mark, which is the fallback for a missing file, a slow network,
              reduced motion and a recurrence all at once. */}
          {ready && (
            <Crystallization
              becoming={NAME[trial.figure]}
              size="min(52vw, 208px)"
              ready={Boolean(frames) && ceremony}
              onBegin={() => setInked(true)}
            />
          )}
        </div>

        {/* The three beats name themselves. Both harnesses used to find them by
            matching the prose — length, or a phrase out of the reason — which
            reported the act as never arriving the first time a seeded act was
            under forty characters. What is being measured should not depend on
            what the copy happens to say. */}
        <p
          ref={nameRef}
          data-arrival="name"
          className="sv-label"
          style={{
            margin: '30px 0 0', fontSize: 12, fontWeight: 700, letterSpacing: '0.24em',
            textTransform: 'uppercase', color: '#FBFAF7', textAlign: 'center',
            ...HIDDEN,
          }}
        >
          {NAME[trial.figure]}
        </p>

        {/* One sentence, and every part of it is a thing they could check. */}
        <p
          ref={reasonRef}
          data-arrival="reason"
          style={{
            margin: '14px 0 0', maxWidth: 360, textAlign: 'center',
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: 'clamp(18px, 4.8vw, 21px)', lineHeight: 1.4,
            letterSpacing: '-0.005em', color: '#FBFAF7', ...HIDDEN,
          }}
        >
          {trial.reason}
        </p>

        {/* The act, last and quietest. A day never passes with a trial and no
            act, and ending on the act rather than on the figure is what keeps
            the card from being the point. */}
        <div ref={actRef} data-arrival="act" style={{ marginTop: 30, maxWidth: 360, textAlign: 'center', ...HIDDEN }}>
          {trial.encounter > 1 && (
            <p className="sv-label" style={{
              margin: '0 0 10px', fontSize: 11, letterSpacing: '0.18em',
              color: 'rgba(251,250,247,0.62)',
            }}>
              {trial.encounter === 2 ? 'BACK A SECOND TIME' : 'BACK A THIRD TIME'}
            </p>
          )}
          <p style={{
            margin: 0, fontFamily: 'var(--sv-font)', fontWeight: 400,
            fontSize: 16, lineHeight: 1.55, color: 'rgba(251,250,247,0.86)',
          }}>
            {trial.quest ?? act}
          </p>
        </div>
      </div>
    </div>
  );
}
