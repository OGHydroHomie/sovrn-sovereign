import ArchetypeMark from '../components/ArchetypeMark';
import Wordmark from '../components/Wordmark';
import FoundingSeat from '../components/FoundingSeat';
import { BECOMINGS, LOOPS } from '../lib/archetypes';

/* The page you send someone who has never used SOVRN.

   Cream, black, Geist. No pricing, no testimonials, no logos, no counters, no
   social proof invented or otherwise. Mobile first — every measurement below is
   the phone measurement, and the desktop one is the same thing with more room.

   The thirteen are shown as thirteen, not as pairs. Becomings and loops are
   selected independently by the engine — a becoming and a loop from different
   positions is the normal case — so pairing one loop under each mark would
   teach the opposite of how the reading works. */

const SECTION: React.CSSProperties = { marginTop: 76 };
const LABEL: React.CSSProperties = {
  fontFamily: 'var(--sv-font)', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.18em', color: '#6E6A66', textTransform: 'uppercase',
};

/* Dropped in once it is filmed: an mp4 in public/, or an embed URL. Until then
   the slot holds its own shape so the page does not reflow when it arrives. */
const DEMO_VIDEO: string | null = null;

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={{ borderTop: '1px solid #E4E0D6', padding: '20px 0' }}>
      <p style={{ ...LABEL, fontSize: 10, letterSpacing: '0.22em', color: '#9A9A9A' }}>{n}</p>
      <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 17, lineHeight: 1.5, color: '#000000' }}>
        {title}
      </p>
      <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
        {body}
      </p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100svh', background: '#FBFAF7', color: '#1A1A1A', padding: '28px 22px 80px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <a href="/" style={{ textDecoration: 'none', lineHeight: 1 }}>
          <Wordmark />
        </a>

        {/* ── 1. The line ── */}
        <div style={{ paddingTop: '12vh' }}>
          <h1
            style={{
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(30px, 8.4vw, 52px)', lineHeight: 1.12,
              letterSpacing: '-0.015em', color: '#000000',
            }}
          >
            This life is yours. Take the reins.
          </h1>
          <p
            style={{
              marginTop: 24, fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(17px, 4.6vw, 20px)', lineHeight: 1.6, color: '#1A1A1A',
            }}
          >
            SOVRN reads what you say about your own life, names the pattern you keep
            repeating, and gives you one act to do today &mdash; then a new one every
            morning, written from what you actually did.
          </p>

          <div style={{ marginTop: 34 }}>
            <a
              href="/"
              style={{
                display: 'inline-block', minHeight: 52, boxSizing: 'border-box',
                background: '#000000', color: '#FBFAF7', textDecoration: 'none',
                borderRadius: 2, fontFamily: 'var(--sv-font)', fontWeight: 700,
                fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.14em',
                padding: '18px 28px',
              }}
            >
              Open your Blueprint
            </a>
          </div>
        </div>

        {/* ── 2. What happens ── */}
        <div style={SECTION}>
          <p style={LABEL}>What happens</p>
          <div style={{ marginTop: 18 }}>
            <Step
              n="01"
              title="Three questions."
              body="The life you want, the belief standing in its way, and the pattern you keep repeating. Plus your name, birth date, time and place."
            />
            <Step
              n="02"
              title="A Blueprint."
              body="A written reading of who you are becoming and the loop you are running instead. About six hundred words. It arrives whole, once."
            />
            <Step
              n="03"
              title="One act, today."
              body="Not a habit, not a streak. One thing you can finish in under twenty minutes, and a place to say what actually happened — including when nothing did."
            />
            <Step
              n="04"
              title="Tomorrow, written from today."
              body="At 6am you get the next act. It is not a repeat and it is not from a list: it is written out of what you did with the last one."
            />
            <div style={{ borderTop: '1px solid #E4E0D6' }} />
          </div>
        </div>

        {/* ── 3. The thirteen ── */}
        <div style={SECTION}>
          <p style={LABEL}>The thirteen</p>
          <div
            style={{
              marginTop: 22,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 26,
            }}
          >
            {BECOMINGS.map((becoming) => (
              <div key={becoming} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ArchetypeMark becoming={becoming} size="clamp(96px, 26vw, 128px)" />
                </div>
                <p
                  style={{
                    marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 400,
                    fontSize: 12, letterSpacing: '0.08em', color: '#000000',
                  }}
                >
                  {becoming}
                </p>
              </div>
            ))}
          </div>

          {/* The other axis, kept separate because that is what it is. */}
          <p style={{ ...LABEL, marginTop: 56 }}>And the thirteen loops</p>
          <p
            style={{
              marginTop: 14, fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 16, lineHeight: 1.9, color: '#1A1A1A',
            }}
          >
            {LOOPS.join(' · ')}
          </p>
          <p
            style={{
              marginTop: 14, fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 14, lineHeight: 1.7, color: '#6E6A66',
            }}
          >
            Any becoming, any loop. Most people are reaching for one thing and running
            a pattern that belongs to another.
          </p>
        </div>

        {/* ── 4. The demo ── */}
        <div style={SECTION}>
          <p style={LABEL}>See it</p>
          <div
            style={{
              marginTop: 18, width: '100%', aspectRatio: '16 / 9',
              border: '1px solid #E4E0D6', borderRadius: 2, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#FBFAF7',
            }}
          >
            {DEMO_VIDEO ? (
              <video
                src={DEMO_VIDEO}
                controls
                playsInline
                preload="metadata"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <p style={{ ...LABEL, color: '#9A9A9A' }}>Demo coming</p>
            )}
          </div>
        </div>

        {/* ── 5. The one control ── */}
        <div style={SECTION}>
          <FoundingSeat />
        </div>

        <div style={{ height: 1, background: '#E8E6E1', margin: '64px 0 16px' }} />
        <p style={{ fontFamily: 'var(--sv-font)', fontSize: 13, color: '#6E6A66' }}>
          <a href="/privacy" style={{ color: '#1A1A1A' }}>Privacy</a>
          <span style={{ padding: '0 8px' }}>·</span>
          <a href="/terms" style={{ color: '#1A1A1A' }}>Terms</a>
          <span style={{ padding: '0 8px' }}>·</span>
          <a href="/delete" style={{ color: '#1A1A1A' }}>Delete my data</a>
        </p>
      </div>
    </div>
  );
}
