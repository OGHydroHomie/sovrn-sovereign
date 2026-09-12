import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/motion';

/* Speaking instead of typing.
 *
 * People say truer things out loud. Typing invites editing — the sentence gets
 * shaped on the way out, and the whole product runs on what someone actually
 * thinks rather than what they are willing to have written down. The filing is
 * the field most likely to be shortened out of tiredness, and it is the one this
 * matters most on.
 *
 * It is never automatic and never a flow. It is a mic sitting in the corner of
 * a field for anyone who wants it, and words that land in the field as text —
 * editable, deletable, exactly as if they had been typed. Voice is an input
 * method here, not a commitment.
 *
 * Where the browser has no recognition, nothing renders. No greyed-out control,
 * no tooltip explaining what this browser cannot do, no apology.
 */

interface Props {
  /** The field's current value, so dictation appends rather than replaces. */
  value: string;
  onChange: (next: string) => void;
  /* Where the mic sits. A textarea puts it in the top corner clear of the text;
     a single-line field centres it. */
  align?: 'top' | 'middle';
  /** Announced to a screen reader; the glyph itself carries no text. */
  label?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function Dictate({ value, onChange, align = 'top', label = 'Dictate' }: Props) {
  const [supported] = useState(() => Boolean(getRecognition()));
  /* Permission can only be refused once per origin and never un-refuses inside a
     session. A mic that can never work is worse than no mic, so it leaves. */
  const [refused, setRefused] = useState(false);
  const [listening, setListening] = useState(false);

  const rec = useRef<Recognition | null>(null);
  const base = useRef('');
  const settled = useRef('');
  const latest = useRef(onChange);
  latest.current = onChange;
  const pulse = useRef<HTMLDivElement>(null);

  useEffect(() => () => { try { rec.current?.abort(); } catch { /* already gone */ } }, []);

  /* The hairline under the field, breathing while it listens. The same rule the
     door draws with — no waveform, and nothing red. */
  useEffect(() => {
    if (!listening || !pulse.current) return;
    if (prefersReducedMotion()) {
      gsap.set(pulse.current, { opacity: 0.55, scaleX: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(pulse.current,
        { opacity: 0.18, scaleX: 0.35 },
        { opacity: 0.7, scaleX: 1, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }, pulse);
    return () => ctx.revert();
  }, [listening]);

  const stop = () => {
    try { rec.current?.stop(); } catch { /* not started */ }
    setListening(false);
  };

  const start = () => {
    const Ctor = getRecognition();
    if (!Ctor) return;

    const r = new Ctor();
    rec.current = r;
    r.lang = document.documentElement.lang || 'en-US';
    r.interimResults = true;
    /* iOS stops of its own accord after a pause whatever this says, which is why
       the end of a run is handled rather than assumed. */
    r.continuous = true;

    /* Whatever is already written stays. Dictation adds to it. */
    base.current = value ? value.replace(/\s*$/, '') + ' ' : '';
    settled.current = '';

    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) settled.current += chunk;
        else interim += chunk;
      }
      latest.current(base.current + settled.current + interim);
    };
    r.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') setRefused(true);
      setListening(false);
    };
    r.onend = () => setListening(false);

    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  if (!supported || refused) return null;

  return (
    <>
      <button
        type="button"
        aria-label={listening ? 'Stop dictating' : label}
        aria-pressed={listening}
        onClick={(e) => { e.stopPropagation(); listening ? stop() : start(); }}
        style={{
          position: 'absolute', right: 8,
          ...(align === 'top' ? { top: 8 } : { top: '50%', transform: 'translateY(-50%)' }),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, padding: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          /* No extra opacity. --sv-mute already carries the muted step for
             whichever ground it is on, and multiplying it by 0.75 on top took
             the glyph to 2.54:1 on the cream reveal — under the 3:1 a control
             has to meet. Quiet is a colour, not a transparency. */
          color: listening ? 'var(--sv-ink)' : 'var(--sv-mute)',
        }}
      >
        {/* Drawn, not an icon set: one weight of line, the same as every rule in
            the product. */}
        <svg width="15" height="19" viewBox="0 0 15 19" fill="none" aria-hidden="true">
          <rect x="4.6" y="0.6" width="5.8" height="10.2" rx="2.9"
                stroke="currentColor" strokeWidth="1.1" />
          <path d="M1.1 8.4v1.2a6.4 6.4 0 0 0 12.8 0V8.4"
                stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M7.5 16.2v2.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>

      {listening && (
        <div
          ref={pulse}
          aria-hidden="true"
          style={{
            position: 'absolute', left: 0, right: 0, bottom: -3, height: 1,
            background: 'var(--sv-ink)', transformOrigin: '50% 50%', opacity: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* What a screen reader hears while it runs. The hairline is decoration. */}
      <span
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        {listening ? 'Listening' : ''}
      </span>
    </>
  );
}
