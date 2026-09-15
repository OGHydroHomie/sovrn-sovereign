import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import AscentField from '../components/AscentField';
import ArchetypeMark from '../components/ArchetypeMark';
import { TOP } from '../lib/ascent';
import { getMap, type MapData, type Figure } from '../lib/map';

const NAME: Record<Figure, string> = {
  devil: 'The Devil',
  hermit: 'The Hermit',
  sun: 'The Sun',
};

const PAPER = '#FBFAF7';
const MUTED = 'rgba(251,250,247,0.62)';
const FAINT = 'rgba(251,250,247,0.30)';
const GHOST = 'rgba(251,250,247,0.10)';
/* The three states of a day have to be told apart at fourteen pixels, and the
   only thing available to tell them apart with is weight — there is no colour
   anywhere in this grid and a missed day is not drawn in a warning. */
const DAY_OUTLINE = 'rgba(251,250,247,0.48)';
const DAY_EMPTY = 'rgba(251,250,247,0.13)';

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.22em',
  textTransform: 'uppercase', color: MUTED, margin: 0,
};

/* The map.
 *
 * Three sections and all three are the record rendered. There is no score on
 * this page and there is nothing on it that could become one: no total, no
 * remaining, no percentage, no bar, no "three of twenty-five". Every unit here
 * costs a real act in the world, and a denominator would turn the acts into a
 * means of moving a number — which is the one thing that would make the whole
 * product pointless while looking like engagement.
 *
 * It is reachable from the Ledger and it is never pushed. No badge, no
 * notification, nothing that says there is something here to come back for.
 */
export default function MapPage() {
  /* The field at its ordinary density, held off the column.
     Stars were landing in the middle of the section labels, so the reading gets
     its hole punched — and then thinning the field to hero density on top of
     that removed it altogether, because every star it had left was inside the
     hole. The wall solved this first and the answer is the same: full density,
     and the sky lives in the margins. */
  const columnRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<'loading' | 'signed-out' | 'ready'>('loading');
  const [data, setData] = useState<MapData | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data: session }) => {
      if (!session.session) { setState('signed-out'); return; }
      setData(await getMap());
      setState('ready');
    });
  }, []);

  return (
    <div
      data-tone="paper"
      style={{
        position: 'relative', minHeight: '100svh',
        background: '#000000', color: PAPER,
        fontFamily: 'var(--sv-font)', fontWeight: 300,
        padding: '28px 20px 90px', overflowX: 'hidden',
      }}
    >
      <AscentField altitude={TOP} clearFor={[columnRef]} />

      <div ref={columnRef} style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto' }}>
        <a
          href="/ledger"
          style={{
            fontSize: 13, color: MUTED, textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          &larr; Your Ledger
        </a>

        {state === 'loading' && (
          <p style={{ marginTop: 40, fontSize: 15, color: MUTED }}>Reading the record.</p>
        )}

        {state === 'signed-out' && (
          <p style={{ marginTop: 40, fontSize: 15, lineHeight: 1.7, color: PAPER }}>
            This browser doesn&rsquo;t know you yet. Open the newest link from your email.
          </p>
        )}

        {state === 'ready' && data && (
          <>
            {/* ── The figures ────────────────────────────────────────────── */}
            <section data-map="figures" style={{ marginTop: 44 }}>
              <p className="sv-label" style={LABEL}>The figures</p>
              <div
                style={{
                  marginTop: 18,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 10,
                }}
              >
                {data.figures.map((f, i) => (
                  <div key={i} data-position={f.state} style={{ minWidth: 0 }}>
                    <div
                      data-card=""
                      style={{
                        aspectRatio: '1080 / 1620',
                        border: `1px solid ${f.state === 'locked' ? GHOST : FAINT}`,
                        background: f.state === 'locked' ? 'rgba(251,250,247,0.03)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        /* Dimmed, in place. A trial that is running is not a
                           prize and is not shown as one. */
                        opacity: f.state === 'active' ? 0.38 : 1,
                        overflow: 'hidden',
                      }}
                    >
                      {f.state === 'locked'
                        ? <Lock />
                        : <ArchetypeMark becoming={NAME[f.figure]} size="100%" />}
                    </div>

                    {/* Only a freed figure is named, and only a freed figure
                        carries a date. A locked position says nothing at all —
                        not its name, not what it wants, not how it opens.

                        The space is reserved on every cell rather than only on
                        the ones that use it: without it a single freed figure
                        makes its own row taller than the rest and the grid goes
                        ragged around the one thing on it worth looking at. */}
                    <div style={{ minHeight: 34, marginTop: 7 }}>
                      {f.state === 'freed' && (
                        <>
                          <p className="sv-label" style={{ ...LABEL, fontSize: 9, letterSpacing: '0.12em', color: PAPER }}>
                            {NAME[f.figure]}
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: 10, lineHeight: 1.3, color: MUTED }}>
                            {f.date}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── The days ───────────────────────────────────────────────── */}
            <section data-map="days" style={{ marginTop: 52 }}>
              <p className="sv-label" style={LABEL}>The days</p>
              <div
                style={{
                  marginTop: 18,
                  display: 'grid',
                  /* Seven across. A week is the unit a person already reads a
                     run of days in, and it makes a gap legible as the shape it
                     was rather than as a ragged line — auto-filling to whatever
                     the width allowed produced two uneven rows of noise. It
                     implies no path: it is a calendar, not a track. */
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 6,
                  maxWidth: 260,
                }}
              >
                {data.days.map((d) => (
                  <div
                    key={d.day}
                    data-day={d.state}
                    title={d.day}
                    style={{
                      aspectRatio: '1',
                      /* Filled, outlined, empty. One ink, three states, and no
                         difference in colour anywhere — a missed day is drawn
                         with the same pen as a crossed one, because it is the
                         same kind of fact. */
                      background: d.state === 'done' ? PAPER : 'transparent',
                      border: `1px solid ${d.state === 'empty' ? DAY_EMPTY : DAY_OUTLINE}`,
                    }}
                  />
                ))}
              </div>
              {!data.days.length && (
                <p style={{ marginTop: 12, fontSize: 14, color: MUTED }}>
                  Nothing on the record yet.
                </p>
              )}
            </section>

            {/* ── The cycles ─────────────────────────────────────────────── */}
            <section data-map="cycles" style={{ marginTop: 52 }}>
              <p className="sv-label" style={LABEL}>The cycles</p>
              {data.cycles.length ? (
                <div style={{ marginTop: 6 }}>
                  {data.cycles.map((c, i) => (
                    <div
                      key={i}
                      data-cycle={c.how}
                      style={{ padding: '18px 0', borderTop: `1px solid ${GHOST}` }}
                    >
                      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: PAPER }}>
                        {c.target}
                      </p>
                      <p className="sv-label" style={{ ...LABEL, fontSize: 10, letterSpacing: '0.16em', marginTop: 9 }}>
                        {c.how} &middot; {c.date}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: 12, fontSize: 14, color: MUTED }}>
                  Nothing has closed yet.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* A lock, and nothing else.
 *
 * Deliberately not a padlock with a keyhole or anything that suggests a
 * mechanism — a mechanism invites the question of what opens it, and answering
 * that question anywhere on this page would turn twenty-two unknowns into
 * twenty-two objectives. A shackle and a body, at the smallest weight the
 * hairline will carry.
 */
function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="30%" aria-hidden="true" style={{ display: 'block', opacity: 0.5 }}>
      <path
        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
        fill="none" stroke={PAPER} strokeWidth="1.1" strokeLinecap="round"
      />
      <rect x="6.5" y="10.5" width="11" height="8.5" fill="none" stroke={PAPER} strokeWidth="1.1" />
    </svg>
  );
}
