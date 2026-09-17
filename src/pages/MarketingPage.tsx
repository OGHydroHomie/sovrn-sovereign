import { useCallback, useEffect, useMemo, useState } from 'react';
import AscentField from '../components/AscentField';
import ArchetypeMark from '../components/ArchetypeMark';
import Crystallization from '../components/Crystallization';
import ReturnLink from '../components/ReturnLink';
import Wordmark from '../components/Wordmark';
import { BECOMINGS } from '../lib/archetypes';
import { HERO_STARS, TOP } from '../lib/ascent';
import { markFrameUrls, preloadFrames } from '../lib/marks';
import { prefersReducedMotion } from '../lib/motion';
import { getToday, type Today } from '../lib/today';

/* The film, when there is one.
 *
 * Null until the file exists. The slot holds its shape while empty so dropping
 * a video in does not reflow the page underneath it — a hole that collapses
 * when filled means the layout below has never been seen in the state it will
 * ship in. */
const DEMO_VIDEO: string | null = null;

const PAPER = '#FBFAF7';
const MUTED = 'rgba(251,250,247,0.66)';
const FAINT = 'rgba(251,250,247,0.38)';
const RULE = 'rgba(251,250,247,0.14)';

const LINE = 'You already know the thing you’ve been avoiding.';
const CALL = 'Find out who you’re becoming';

const LABEL: React.CSSProperties = {
  margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em',
  textTransform: 'uppercase', color: FAINT,
};

const BODY: React.CSSProperties = {
  margin: 0, fontFamily: 'var(--sv-font)', fontWeight: 300,
  fontSize: 'clamp(17px, 4.6vw, 19px)', lineHeight: 1.6, color: PAPER,
};

/* A shuffled run through the thirteen, so nobody sees the same figure twice in
   a row — including across the seam, where a fresh shuffle can otherwise open
   with the one the last pass closed on. */
function shuffled(after?: string): string[] {
  const order = [...BECOMINGS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (after && order[0] === after && order.length > 1) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

export default function MarketingPage() {
  return (
    <div
      data-tone="paper"
      style={{
        position: 'relative', minHeight: '100svh',
        background: '#000000', color: PAPER,
        fontFamily: 'var(--sv-font)', fontWeight: 300, overflowX: 'hidden',
      }}
    >
      {/* One field for the whole page.
          It is `position: fixed`, so every instance covers the viewport — two
          of them meant the denser one painted over the sparser and the hero's
          headline ended up with stars through it. And it is not cleared: the
          clearing takes the union of the refs it is given, which on a page this
          tall is the whole document and therefore the whole screen. The door
          and the threshold both run this exact configuration — one sparse
          field, uncleared — and this page is what they open from. */}
      <AscentField altitude={TOP} {...HERO_STARS} />
      <Hero />
      <Below />
    </div>
  );
}

/* ── The hero ──────────────────────────────────────────────────────────────
   One card assembling itself out of noise, on loop, and nothing else moving.
   No name on the card: the name belongs to the reveal, and putting it here
   would spend the only thing the reveal has to give. */
function Hero() {
  const reduced = prefersReducedMotion();
  const [order, setOrder] = useState<string[]>(() => shuffled());
  const [at, setAt] = useState(0);
  const [ready, setReady] = useState(false);

  const current = order[at % order.length];
  const next = useMemo(() => {
    const i = (at + 1) % order.length;
    return i === 0 ? null : order[i];
  }, [at, order]);

  /* Only the first card's frames are fetched before anything is shown. This is
     the first byte a stranger loads and thirteen sets of six is not a front
     page — the rest arrive during the hold of the card in front of them. */
  useEffect(() => {
    const urls = markFrameUrls(current);
    if (!urls) { setReady(true); return; }
    let live = true;
    void preloadFrames(urls).then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [current]);

  /* The one after this, fetched while this one is still on screen, so the loop
     never stalls between figures. */
  useEffect(() => {
    if (reduced || !next) return;
    const urls = markFrameUrls(next);
    if (urls) void preloadFrames(urls);
  }, [next, reduced]);

  const cycle = useCallback(() => {
    setAt((i) => {
      const n = i + 1;
      if (n < order.length) return n;
      setOrder((o) => shuffled(o[o.length - 1]));
      return 0;
    });
  }, [order.length]);

  return (
    <section
      data-hero=""
      style={{
        position: 'relative', minHeight: '100svh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '64px 22px 40px', gap: 0,
      }}
    >
      <div
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        {/* `data-showing` is which card is on screen, so the loop can be
            measured rather than watched. It is not rendered anywhere — the name
            belongs to the reveal and never appears here. Deliberately not
            `data-figure`, which is what the thirteen below are marked with;
            sharing the attribute made a grid of thirteen count as fourteen. */}
        <div
          data-idle={reduced ? 'static' : 'looping'}
          data-showing={current}
          style={{ width: 'min(58vw, 236px)' }}
        >
          <Crystallization
            key={`${current}-${at}`}
            becoming={current}
            size="100%"
            ready={ready && !reduced}
            loop
            onCycle={cycle}
          />
        </div>

        <p
          style={{
            margin: '38px 0 0', maxWidth: 360, textAlign: 'center',
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: 'clamp(19px, 5.2vw, 23px)', lineHeight: 1.4,
            letterSpacing: '-0.01em', color: PAPER,
          }}
        >
          {LINE}
        </p>

        <Call />
      </div>
    </section>
  );
}

/* The one control. Identical here and at the close, because it is one offer
   made twice rather than two offers. */
function Call() {
  return (
    <a
      href="/begin"
      data-call=""
      className="sv-label"
      style={{
        marginTop: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: 360, minHeight: 56,
        background: PAPER, color: '#0C0C0B',
        border: 'none', borderRadius: 2, padding: '18px 22px',
        fontSize: 12, fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase', textDecoration: 'none',
      }}
    >
      {CALL}
    </a>
  );
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 84 }}>
      {label && <p className="sv-label" style={LABEL}>{label}</p>}
      <div style={{ marginTop: label ? 22 : 0, display: 'grid', gap: 20 }}>{children}</div>
    </section>
  );
}

/* ── Below the fold ────────────────────────────────────────────────────────
   Type on the field. No cards, no containers, no boxes drawn around ideas. */
function Below() {
  const [today, setToday] = useState<Today | null>(null);

  useEffect(() => { void getToday().then(setToday); }, []);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 560, margin: '0 auto', padding: '0 22px 96px',
        }}
      >
        {/* The wound. No header — a label over this would frame it as a section
            of a sales page, and the point is that it is simply true. */}
        <Section>
          <p style={BODY}>
            You&rsquo;ve read the books. You know the pattern. You can name it better than
            most therapists can.
          </p>
          <p style={BODY}>And the thing is still sitting there.</p>
          <p style={BODY}>Knowing was never the problem.</p>
        </Section>

        <Section label="What happens">
          <p style={BODY}>Three questions and your birth details.</p>
          <p style={BODY}>
            It names who you&rsquo;re becoming and the loop you&rsquo;re running instead.
          </p>
          <p style={BODY}>One act today. Small enough to do, big enough to matter.</p>
          <p style={BODY}>
            Tomorrow at six it reads what you actually did &mdash; including if you
            didn&rsquo;t &mdash; and writes the next one from that.
          </p>
        </Section>

        {/* The film, or the shape it will occupy. */}
        <section style={{ marginTop: 84 }}>
          <div
            data-video={DEMO_VIDEO ? 'ready' : 'empty'}
            style={{
              aspectRatio: '16 / 9', width: '100%',
              border: `1px solid ${RULE}`,
              background: 'rgba(251,250,247,0.03)',
            }}
          >
            {DEMO_VIDEO && (
              <video
                src={DEMO_VIDEO}
                controls
                playsInline
                preload="none"
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
              />
            )}
          </div>
        </section>

        {/* The thirteen. Names only — no loops beside them.
            The becoming and the loop are chosen independently, so printing a
            pair here would teach a stranger a correspondence that does not
            exist, and they would carry it into their own reading. */}
        <Section label="The thirteen">
          <div
            data-thirteen=""
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 12px' }}
          >
            {BECOMINGS.map((name) => (
              <div key={name} data-figure={name} style={{ minWidth: 0 }}>
                <div style={{ border: `1px solid ${RULE}`, background: 'rgba(251,250,247,0.03)' }}>
                  {/* Thirteen files below the fold on the first byte anyone
                      loads. They arrive as the grid comes into reach. */}
                  <ArchetypeMark becoming={name} size="100%" lazy />
                </div>
                <p
                  className="sv-label"
                  style={{ ...LABEL, fontSize: 9, letterSpacing: '0.12em', marginTop: 8, color: MUTED }}
                >
                  {name}
                </p>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
            No card is ahead of another.
          </p>
        </Section>

        {/* The record. The wall's own numbers, asked of the wall. */}
        <Section label="The record">
          <p data-count="" style={{ ...BODY, fontSize: 'clamp(19px, 5.2vw, 23px)', lineHeight: 1.35 }}>
            {today ? (
              <>
                {today.people}
                <span style={{ display: 'block', color: MUTED }}>{today.did}</span>
              </>
            ) : (
              /* Nothing invented while it loads, and nothing invented if it
                 never arrives. The sentence below is true either way. */
              <span style={{ color: MUTED }}>What people committed to today, and whether they did it.</span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: MUTED }}>
            Every act. Every miss. Public, anonymous, unedited.{' '}
            <a href="/wall" style={{ color: PAPER, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              See the wall
            </a>
          </p>
        </Section>

        {/* The close. The same line and the same control. */}
        <section style={{ marginTop: 96, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p
            style={{
              margin: 0, maxWidth: 360, textAlign: 'center',
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(19px, 5.2vw, 23px)', lineHeight: 1.4,
              letterSpacing: '-0.01em', color: PAPER,
            }}
          >
            {LINE}
          </p>
          <Call />
        </section>

        {/* The way back in, for somebody who already has a reading. Same rule as
            the door: a session is not a Ledger, and this only offers one when
            there is something behind it. */}
        <div style={{ marginTop: 56, paddingTop: 28, borderTop: `1px solid ${RULE}` }}>
          <Wordmark />
          <div style={{ marginTop: 18 }}>
            <ReturnLink />
          </div>
        </div>
      </div>
    </div>
  );
}
