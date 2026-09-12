/* Every duration in the product, in one place.

   GSAP does the animating; this holds the numbers so a timing can be read and
   changed without hunting through components, and so the three sequences stay in
   proportion to each other. Seconds, because that is what GSAP takes.

   The rule the numbers are tuned against: nothing bounces and nothing
   celebrates. Every ease is out or in-out, never back, never elastic. */

export const EASE = {
  /** Arrivals: fast then settling. */
  in: 'power2.out',
  /** Departures: the square leaving. */
  out: 'power2.in',
  /** Height, both directions. */
  panel: 'power2.inOut',
  /** The breath. */
  breath: 'sine.inOut',
  /** The fill. A clock, so no easing at all. */
  linear: 'none',
} as const;

export const T = {
  /* 1 — the loading square */
  square: {
    /* The settle. Once the reading has landed, the field takes six seconds to
       come to a complete stop while the square runs its fill out, and then the
       page holds still for a beat longer than is comfortable before it hands
       over. What reads as expensive is fewer things moving, more slowly, with
       better timing — so this stretch has exactly two things moving, and then
       one, and then none. */
    settle: 6.0,
    settleHold: 1.1,
    breatheCycle: 4.0,     // 1.0 -> 1.03 -> 1.0
    breatheScale: 1.03,
    fill: 20.0,            // outline to solid, the length of a generation
    fillCatchUp: 0.45,     // when the reading lands early, close the rest
    dissolve: 0.9,         // scale to 1.5 and go
    nameDelay: 0.45,       // into the dissolve, the name starts
    nameFade: 0.7,
    hold: 1.5,             // total, before the reading opens
    staticFill: 0.5,       // reduced motion: one frozen frame, half full
  },

  /* The header wordmark breathes on its tracking. The letters open out and
     close again; the mark itself does not move. Same sine ease as the square,
     a slower cycle because the movement is wider. */
  wordmark: {
    cycle: 5.0,
    trackingMin: 0.15,   // em
    trackingMax: 0.45,   // em
  },

  /* The commit. A circuit closing, not a reward — the whole thing is over in a
     third of a second and nothing bounces. The trace runs the border, the card
     inverts for a frame and a half, and it settles. */
  commit: {
    trace: 0.28,
    flash: 0.06,
    settle: 0.34,
  },

  /* Day 7 runs the same sequence slower. It is the only purely rewarding
     moment in the product and it is allowed to take its time. */
  daySeven: {
    holdBefore: 1.4,
    dissolve: 1.8,
    nameFade: 1.4,
    body: 4.1,             // the record fades up after the name has landed
  },

  /* 2 — the reveal header. The name leads; the mark follows it in. */
  reveal: {
    name: 0.9,
    markAt: 0.6,
    mark: 0.6,
    markFrom: 0.96,        // scale, not a stroke draw — the marks are filled
    progressAt: 1.05,
    progress: 0.5,
    loopAt: 1.3,
    loop: 0.7,
  },

  /* 2b — the crystallization reveal.

     Six frames resolve from near-chaos into the mark, then the page holds on a
     finished picture for a full second before a single word appears. The hold
     is the point: the sequence is not a loader finishing, it is a thing
     arriving and then being looked at. Nothing overlaps — every beat has the
     screen to itself.

       0.0 -> 2.2   ink enters at a point and spreads, x1 resolving to x6 behind it
       2.2 -> 3.2   hold, resolved, no text
       3.2          the name stamps in
       4.0          the loop line fades under it
       4.6          the three sections rise

     The advance is eased rather than linear, so the early frames pass quickly
     and the last ones settle — the picture resolves fast and then finishes
     slowly, which is how the eye expects a thing coming into focus to behave. */
  crystal: {
    /* 2.2, not 1.6. The ink has to look like it is finding the shape rather than
       being switched on, and a spread that fast reads as a wipe. */
    advance: 2.2,
    hold: 1.0,           // 2.2 -> 3.2, on a finished card, in silence
    nameAt: 3.2,
    nameStamp: 0.18,     // scale only; the opacity is a hard cut
    nameScaleFrom: 1.04,
    loopAt: 4.0,
    loop: 0.4,
    cardsAt: 4.6,
    cardsStagger: 0.12,
    /* Reduced motion: no crystallization at all. The final frame cross-fades in
       and every later beat keeps its place in the sequence, so the reveal still
       reads in the same order — it just does not animate its way there. */
    reducedFade: 0.4,
  },

  /* 3 — the three cards */
  cards: {
    firstAt: 1.7,          // after the header has settled
    enter: 0.55,
    stagger: 0.15,
    riseFrom: 10,          // px
    expand: 0.42,
    collapse: 0.36,
    bodyFade: 0.3,
    bodyAt: 0.12,          // into the expand
  },
} as const;

/** One read, so every component asks the same question the same way. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
