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

  /* 2c — a trial arriving.

     The first thing in this product that happens to someone rather than
     something they did, so it is the slowest sequence here and the only one
     that stops everything else first. The field coming to a halt is the beat
     that makes the rest land: nothing can arrive out of a moving ground.

       0.0 -> 1.0   the field comes to a complete stop
       1.0 -> 3.2   the card crystallizes, ink entering at a point
       3.2 -> 4.2   hold. the card alone, nothing else on screen
       4.2          the name, stamped
       4.8          the reason, one sentence
       5.6          the act rises from below
       7.2          the ground turns to paper and the Ledger is underneath

     Second and third encounters skip all of it and cross-fade in over 1.6s.
     The ceremony is for the first arrival; a recurrence should read as
     recognition, not as spectacle. */
  trial: {
    /* Before 0.0: the paper goes out.

       The Ledger's own loading state is paper, and on a real connection it is
       on screen for two and a half seconds before this mounts — so a sequence
       whose first beat is a dark field began with a hard cut from cream to
       black. The ground is darkened deliberately instead. It is the reveal's
       move in reverse: there the paper arrives with the ink, and here it
       leaves as the field is already slowing. It overlaps the stop rather than
       preceding it, so it costs the sequence nothing. */
    cover: 0.45,
    still: 1.0,
    crystalAt: 1.0,
    hold: 1.0,
    nameAt: 4.2,
    nameStamp: 0.18,       // scale only; the opacity is a hard cut, as the reveal
    nameScaleFrom: 1.04,
    reasonAt: 4.8,
    reason: 0.5,
    actAt: 5.6,
    act: 0.6,
    actRiseFrom: 14,       // px
    handoverAt: 7.2,
    handover: 0.8,
    /* A recurrence. One beat, no crystallization, everything at once. */
    recur: 1.6,
    reducedFade: 0.4,
  },

  /* 2d — the unbinding.

     The only purely rewarding moment in the product, and it happens once per
     figure, ever. Nothing bounces and nothing celebrates; the weight comes from
     the stillness around it, which is why more than half of these four seconds
     is a card doing nothing.

       0.0 -> 0.6   the card, still, as it has been
       0.6 -> 1.8   the binding falls
       1.8 -> 2.6   the figure settles — one slow pulse, the only time a card moves
       2.6 -> 3.4   hold
       3.4         one line: THE DEVIL · freed · September 12
       4.2         beneath it, the act that earned it, in their words

     The card's own beats are in milliseconds because it runs on its own clock
     off a rAF rather than through GSAP; the page's beats are in seconds because
     they go on a timeline. */
  unbind: {
    stillMs: 600,
    fallMs: 1200,
    pulseMs: 800,
    /* How far the ink recedes at the deepest point of the breath, as a
       fraction of its alpha. It has to go down: the art is one-bit and its ink
       is already fully opaque, so there is no headroom upward. Small on purpose
       — this is the only time a card moves at all, and an early version
       re-thresholded the pixels instead and turned the figure into eight
       hundred milliseconds of noise. */
    pulseDepth: 0.13,

    holdAt: 2.6,
    lineAt: 3.4,
    line: 0.5,
    actAt: 4.2,
    act: 0.6,
    actRiseFrom: 12,       // px
    handoverAt: 6.4,
    handover: 0.8,
    reducedFade: 0.4,
  },

  /* 2e — the front door's idle.

     The same six-frame spread the reveal uses, looping: in, a hold long enough
     to look at, and a collapse back into noise before the next figure takes
     over. The hold is the reason to keep watching and the dissolve is
     deliberately much shorter than the arrival — a card that leaves as slowly
     as it came reads as a film being rewound. */
  idle: {
    hold: 1.5,
    dissolve: 0.8,
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
