import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AscentField from '../components/AscentField';
import Crystallization from '../components/Crystallization';
import ReturnLink from '../components/ReturnLink';
import Wordmark from '../components/Wordmark';
import { BECOMINGS } from '../lib/archetypes';
import { HERO_STARS, TOP } from '../lib/ascent';
import { MARK_ASPECT, markFrameUrls, preloadFrames } from '../lib/marks';
import { getToday, type Today } from '../lib/today';
import SiteHeader from '../components/SiteHeader';
import { T, EASE, prefersReducedMotion } from '../lib/motion';

gsap.registerPlugin(ScrollTrigger);

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

/* The head.
 *
 * Two lines, because the contrast is the headline. The market has been told
 * "find out who you are" by every personality test, birth-chart app and
 * archetype quiz it has ever seen, so leading on that claim buys nothing — it
 * is measured against a dozen things the reader has already stopped believing.
 * What nothing else in that field does is come back the next morning and check.
 * So the first line concedes the field and the second one takes it.
 *
 * The first line is set muted and the second in paper: the recession is the
 * argument, and it costs no new type size, weight or face to make it. */
const HEAD = ['Everything else tells you who you could be.', 'This one makes you find out.'];

/* The claim, in full, one beat after the head rather than in it. It is safe to
   state plainly here because the head has already bought a fresh hearing for
   it; at the top of the page it is just the twelfth version of a sentence the
   reader has learned to skip. Then straight back out to the mechanism, so the
   claim never stands alone long enough to be compared against the field. */
const LEAD = [
  'Three questions and your birth details name who you’re becoming — and the loop you’ve been running instead.',
  'Then it stops describing you, and starts asking.',
];

/* The control names what you leave with, not what you are promised. The old
   one — "Find out who you’re becoming" — was the worn claim verbatim, asking
   for the sale in the same words as everything the reader has already
   abandoned. Under it, the three facts that answer price, time and effort
   before any of them can be raised as an objection. */
const CALL = 'Get today’s act';
const CALL_SUB = 'Three questions. Five minutes. Free.';

/* The close. The old headline, which is a line about recognition and works
   once the page has earned it, set against the mechanism so that recognising
   yourself now has a consequence attached to it. */
const CLOSE = [
  'You already know the thing you’ve been avoiding.',
  'Tomorrow at six, something will ask whether you did it.',
];
const CLOSE_SUB = 'Three questions. Five minutes. Free. Nothing to cancel.';

const LABEL: React.CSSProperties = {
  margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em',
  textTransform: 'uppercase', color: FAINT,
};

/* Display type, unchanged from the line it replaces: same clamp, same weight,
   same face. The head got longer; it did not get louder. */
const DISPLAY: React.CSSProperties = {
  margin: 0, maxWidth: 360, textAlign: 'center',
  fontFamily: 'var(--sv-font)', fontWeight: 300,
  fontSize: 'clamp(19px, 5.2vw, 23px)', lineHeight: 1.4,
  letterSpacing: '-0.01em', color: PAPER,
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
  const reduced = prefersReducedMotion();
  /* The field's density, in forty steps.
     Quantised so a scroll does not cost a render a frame: the field redraws
     five times a second at rest, forty steps across the page is finer than it
     can show, and it is two orders of magnitude fewer renders than passing raw
     scroll progress through React. */
  const [step, setStep] = useState(0);

  useLayoutEffect(() => {
    if (reduced) return;
    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const vh = window.innerHeight || 1;
        const doc = Math.max(1, document.documentElement.scrollHeight - vh);
        const y = self.progress * doc;
        /* Two ramps, because the hero is not part of the reading.
           Dense at the wound and sparse by the record is what the field is for;
           the hero is above the wound and is one card, one line and one control
           on an otherwise empty screen. At the density the reading wants, the
           stars punch straight through that headline. So the field builds as
           the hero leaves, and thins from there to the bottom. */
        const entering = Math.min(1, y / vh);
        const reading = Math.max(0, Math.min(1, (y - vh) / Math.max(1, doc - vh)));
        const base = HERO_STARS.starBase + (T.scroll.starsFrom - HERO_STARS.starBase) * entering;
        const d = base + (T.scroll.starsTo - base) * reading;
        setStep(Math.round((d / T.scroll.starsFrom) * 40));
      },
    });
    /* The page grows as the grid loads, so the end is measured against a
       document that is not its final height yet. */
    const settle = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => { clearTimeout(settle); st.kill(); };
  }, [reduced]);

  const starBase = reduced
    ? HERO_STARS.starBase
    : Math.max(T.scroll.starsTo, (step / 40) * T.scroll.starsFrom);

  return (
    <div
      data-tone="paper"
      data-scroll={step}
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
      <AscentField altitude={TOP} starCut={HERO_STARS.starCut} starBase={starBase} />
      <SiteHeader here="/" />
      <Hero />
      <Below />
    </div>
  );
}

/* A hairline at 30%, centred, with air either side.
   The sections used to run together and read as one long document. No box, no
   card, no change of ground — the rule and the space are the whole device. */
function Break() {
  return (
    <div data-break="" style={{ margin: '76px 0', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '30%', height: 1, background: 'rgba(251,250,247,0.20)' }} />
    </div>
  );
}

/* Type that arrives once, as it comes into reach.
   Every line in a section rises twenty pixels and fades up, staggered, and then
   it is done — a section that re-animates each time it is scrolled past turns
   the page into a toy. */
function useReveal(root: React.RefObject<HTMLElement | null>, reduced: boolean) {
  useLayoutEffect(() => {
    if (!root.current) return;
    if (reduced) {
      gsap.set(root.current.querySelectorAll('[data-rise]'), { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      for (const section of root.current!.querySelectorAll('[data-reveal]')) {
        const lines = section.querySelectorAll('[data-rise]');
        if (!lines.length) continue;
        gsap.fromTo(lines,
          { opacity: 0, y: T.scroll.rise },
          {
            opacity: 1, y: 0,
            duration: T.scroll.fade, ease: EASE.in, stagger: T.scroll.stagger,
            scrollTrigger: { trigger: section, start: `top ${T.scroll.start * 100}%`, once: true },
          });
      }
    }, root);

    /* Measured again once the page has finished becoming its own height.
       The grid below fetches its marks lazily, so at the moment these triggers
       are created the document is far shorter than it will be — every section's
       start lands inside the first viewport and they all fire at once, which
       looks exactly like having written no scroll behaviour at all. */
    const settle = setTimeout(() => ScrollTrigger.refresh(), 400);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      clearTimeout(settle);
      window.removeEventListener('load', onLoad);
      ctx.revert();
    };
  }, [root, reduced]);
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
        padding: 'clamp(40px, 7svh, 64px) 22px clamp(28px, 5svh, 40px)', gap: 0,
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
          /* The third term is the height cap. The mark is 1080×1620, so its
             height is 1.5× whatever width it is given — at 58vw on a phone that
             was 326px, forty percent of the screen, which was fine when the
             hero was one line and a button and is not now that it carries a
             two-line head, a two-line lead and the three facts. 25svh of width
             is 38svh of card, and the control stays on the first screen. */
          style={{ width: 'min(58vw, 236px, 25svh)' }}
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

        <p data-head="" style={{ ...DISPLAY, marginTop: 'clamp(20px, 3.4svh, 34px)' }}>
          <span style={{ display: 'block', color: MUTED }}>{HEAD[0]}</span>
          <span style={{ display: 'block' }}>{HEAD[1]}</span>
        </p>

        {LEAD.map((line, i) => (
          <p key={i} data-lead="" style={{ ...BODY, marginTop: i === 0 ? 'clamp(12px, 2svh, 20px)' : 'clamp(8px, 1.2svh, 12px)', maxWidth: 360, textAlign: 'center' }}>
            {line}
          </p>
        ))}

        <Ask sub={CALL_SUB} />
      </div>
    </section>
  );
}

/* One of the thirteen, resolving as it comes into reach.
 *
 * The same ink the hero runs and the reveal runs, at 600ms — a grid of thirteen
 * is a different event from one card arriving with the screen to itself, and at
 * 2.2s each the row is still working when the eye has moved on. Not a fade:
 * a fade would be a different material for the same object.
 *
 * Its six frames are fetched when it gets near, not on mount. Thirteen sets of
 * six on the first byte a stranger loads is not a front page, and this grid sits
 * well below the fold.
 */
function Figure({ name, index }: { name: string; index: number }) {
  const reduced = prefersReducedMotion();
  const box = useRef<HTMLDivElement | null>(null);
  /* Always starts false, including under reduced motion. Nothing about
     preferring less movement asks for thirteen more files on the first byte. */
  const [near, setNear] = useState(false);
  const [frames, setFrames] = useState(false);
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (near || !box.current) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: '700px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near || reduced) return;
    const urls = markFrameUrls(name);
    if (!urls) { setFrames(false); return; }
    let live = true;
    void preloadFrames(urls).then((ok) => { if (live) setFrames(ok); });
    return () => { live = false; };
  }, [near, name, reduced]);

  /* Held until it is actually on screen, and staggered so the row resolves as a
     row rather than thirteen things happening at once. */
  useLayoutEffect(() => {
    if (reduced || !frames || !box.current || go) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: box.current!,
        start: `top ${T.scroll.start * 100}%`,
        once: true,
        onEnter: () => {
          gsap.delayedCall((index % 3) * T.scroll.cardStagger, () => setGo(true));
        },
      });
    }, box);
    return () => ctx.revert();
  }, [frames, reduced, index, go]);

  return (
    <div ref={box} data-figure={name} data-resolved={go || reduced ? 'yes' : 'no'} style={{ minWidth: 0 }}>
      {/* Nothing is mounted until the cell is in reach. Crystallization falls
          back to the finished mark before it is ready, and that mark fetches
          its file on mount — so mounting thirteen of these early pulled all
          thirteen down regardless of how carefully the frames were deferred. */}
      <div style={{ border: `1px solid ${RULE}`, background: 'rgba(251,250,247,0.03)', aspectRatio: `${MARK_ASPECT}` }}>
        {near && (
          <Crystallization
            becoming={name}
            size="100%"
            ready={go && frames && !reduced}
            advanceSeconds={T.scroll.cardAdvance}
          />
        )}
      </div>
      <p
        className="sv-label"
        style={{ ...LABEL, fontSize: 9, letterSpacing: '0.12em', marginTop: 8, color: MUTED }}
      >
        {name}
      </p>
    </div>
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
        marginTop: 'clamp(16px, 2.6svh, 26px)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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

/* The control and the three facts under it, as one unit — the facts are part
   of the ask, not a footnote to it, and they are the same at both ends of the
   page except for the guarantee, which only the close has earned. */
function Ask({ sub }: { sub: string }) {
  return (
    <>
      <Call />
      <p
        data-rise=""
        style={{
          margin: 'clamp(9px, 1.4svh, 14px) 0 0', textAlign: 'center',
          fontSize: 13, lineHeight: 1.6, color: MUTED,
        }}
      >
        {sub}
      </p>
    </>
  );
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section data-reveal="">
      {label && <p className="sv-label" data-rise="" style={LABEL}>{label}</p>}
      <div style={{ marginTop: label ? 22 : 0, display: 'grid', gap: 20 }}>{children}</div>
    </section>
  );
}

/* ── Below the fold ────────────────────────────────────────────────────────
   Type on the field. No cards, no containers, no boxes drawn around ideas. */
function Below() {
  const [today, setToday] = useState<Today | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => { void getToday().then(setToday); }, []);
  useReveal(root, reduced);

  return (
    <div ref={root} style={{ position: 'relative' }}>
      <div
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 560, margin: '0 auto', padding: '0 22px 96px',
        }}
      >
        {/* 1 — The wound. No header: a label over this would frame it as a
               section of a sales page, and the point is that it is simply true.
               It opens the stream of acceptances the rest of the page spends. */}
        <Section>
          <p data-rise="" style={BODY}>
            You&rsquo;ve read the books. You know the pattern. You can name it better than
            most therapists can.
          </p>
          <p data-rise="" style={BODY}>And the thing is still sitting there.</p>
          <p data-rise="" style={BODY}>Knowing was never the problem.</p>
        </Section>

        <Break />

        {/* 2 — Why it didn't take.
               New. The page had no account of why the reader's last four
               attempts failed, which left every promise after it competing
               against a memory of being disappointed by something that sounded
               the same. No competitor is named: we do not dominate this field,
               and naming one spends our own space buying it recognition. The
               verdict — it was the tool, not you — arrives inside the
               indictment rather than after it, because an attack without its
               remedy in the same breath reads as a pitch. */}
        <Section>
          <p data-rise="" style={BODY}>Here&rsquo;s what every one of them did.</p>
          <p data-rise="" style={BODY}>
            It described you. Accurately, sometimes. You recognised yourself on the screen
            and something loosened, and for a few days you were different.
          </p>
          <p data-rise="" style={BODY}>
            Then it asked nothing. It never came back to see. It had no way of knowing
            whether you&rsquo;d moved an inch, so it kept describing &mdash; the same
            person, the same pattern, in slightly different words.
          </p>
          <p data-rise="" style={BODY}>And when you stopped, nothing noticed.</p>
          <p data-rise="" style={BODY}>
            That&rsquo;s not a discipline problem. Nothing was ever built to catch it.
          </p>
        </Section>

        <Break />

        {/* 3 — The mechanism, which is the only thing here the field does not
               already have. It used to be four flat lines under the label
               "What happens", with the part that matters arriving fourth. It is
               the block now, and the miss is named as an input rather than a
               failure, which is the sentence the rest of the page leans on. */}
        <Section label="What actually happens">
          <p data-rise="" style={BODY}>
            Three questions and your birth details. It names one of thirteen &mdash; who
            you&rsquo;re becoming &mdash; and the loop you run instead of becoming it.
          </p>
          <p data-rise="" style={BODY}>
            Then it gives you one act. Today. Small enough that you&rsquo;ll do it, big
            enough that doing it costs you something.
          </p>
          <p data-rise="" style={BODY}>Tomorrow at six, it asks what happened.</p>
          <p data-rise="" style={BODY}>
            You tell it you did it, or you tell it you didn&rsquo;t. Either answer is the
            input. It writes tomorrow&rsquo;s act from what you actually did &mdash; not
            from what you meant to do, and not from the person the first reading said you
            were.
          </p>
          <p data-rise="" style={BODY}>
            That&rsquo;s the whole machine. It&rsquo;s the only part that matters, and
            it&rsquo;s the part nothing else has.
          </p>
        </Section>

        <Break />

        {/* The film, when there is one. It sits here because it is evidence for
            the mechanism above, and evidence belongs where the question it
            answers has just been asked.

            The empty slot used to render regardless: a bordered 16:9 hole on a
            page whose entire argument is that this is the one that checks. A
            proof-shaped container that contains no proof creates the demand and
            fails it in the same second. The section is gone until there is
            footage; `data-video` stays for the harness. */}
        {DEMO_VIDEO && (
          <>
            <section data-reveal="">
              <div
                data-rise=""
                data-video="ready"
                style={{
                  aspectRatio: '16 / 9', width: '100%',
                  border: `1px solid ${RULE}`,
                  background: 'rgba(251,250,247,0.03)',
                }}
              >
                <video
                  src={DEMO_VIDEO}
                  controls
                  playsInline
                  preload="none"
                  style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                />
              </div>
            </section>
            <Break />
          </>
        )}

        {/* 4 — The proof, moved up from the foot of the page. Proof lands where
               the reader demands it, and he demands it one block after a
               mechanism claim, not four. The unflattering half is the asset: a
               record that publishes its own misses is a claim nobody can copy
               without actually doing it. */}
        <Section label="Everyone’s, in the open">
          <p data-count="" data-rise="" style={{ ...BODY, fontSize: 'clamp(19px, 5.2vw, 23px)', lineHeight: 1.35 }}>
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
          <p data-rise="" style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: MUTED }}>
            Every act. Every miss. Public, anonymous, unedited. Nobody&rsquo;s record is
            cleaned up &mdash; the days nothing happened are on there too.{' '}
            <a href="/wall" style={{ color: PAPER, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              See the wall
            </a>
          </p>
        </Section>

        <Break />

        {/* 5 — The thirteen, moved down one. These are a role the reader can
               want to occupy, and a role is offered after belief, never as the
               claim that opens the ad. Names only — no loops beside them. The
               becoming and the loop are chosen independently, so printing a
               pair here would teach a stranger a correspondence that does not
               exist, and they would carry it into their own reading. */}
        <Section label="The thirteen">
          <div
            data-thirteen=""
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 12px' }}
          >
            {BECOMINGS.map((name, i) => (
              <Figure key={name} name={name} index={i} />
            ))}
          </div>
          <p data-rise="" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
            No card is ahead of another. There&rsquo;s no rank, no score, and nothing here
            is better than anything else here.
          </p>
          <p data-rise="" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
            You&rsquo;ll be given one. What you do with it is the only part that&rsquo;s up
            to you.
          </p>
        </Section>

        <Break />

        {/* 6 — The objection most likely to lose a reader who came here for
               rigour, answered rather than avoided. The page asks a stranger
               for their birth details and then argues for evidence; saying
               nothing about that gap leaves him arguing with the page instead
               of reading it. It sits here, after the mechanism and the proof,
               because leading with it starts the argument before he wants
               anything. Verified against api/morning.ts: the next act is
               written from the archetype and the record, and no chart data is
               read after the first reading. */}
        <Section label="About the birth details">
          <p data-rise="" style={BODY}>
            They&rsquo;re an input, not a prophecy. They set which of the thirteen you
            start from &mdash; nothing after that comes from the sky.
          </p>
          <p data-rise="" style={BODY}>
            From tomorrow on, the only thing it has to work with is what you did. If the
            first reading flattered you and the record says otherwise, the record wins.
          </p>
        </Section>

        <Break />

        {/* 7 — The close. The old headline comes home here, where a page of
               belief has been spent and recognition is legitimate, and it is
               set directly against the mechanism so that recognising yourself
               finally has a consequence attached to it. Neither line is strong
               alone; adjacent, the first one costs something. */}
        <section data-reveal="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p data-rise="" style={DISPLAY}>{CLOSE[0]}</p>
          <p data-rise="" style={{ ...DISPLAY, marginTop: 14, color: MUTED }}>{CLOSE[1]}</p>
          <Ask sub={CLOSE_SUB} />
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
