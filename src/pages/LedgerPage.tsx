import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listEntries, isFiled, type LedgerEntry } from '../lib/ledger';
import FileDay from '../components/FileDay';
import InstallPrompt from '../components/InstallPrompt';
import PaperPage from '../components/PaperPage';
import NextMorning from '../components/NextMorning';
import { signalVillain, villainUnlocked } from '../lib/villain';
import { getProfile, type Profile } from '../lib/blueprint';
import ArchetypeMark from '../components/ArchetypeMark';
import SurfaceNav, { NavLink } from '../components/SurfaceNav';
import DaySeven from '../components/DaySeven';

type State = 'loading' | 'signed-out' | 'ready';

/* Day 7 is the recalibration. It has an entry like any other day, but the entry
   carries a question instead of an act. */
const RECALIBRATION_DAY = 7;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* Today's entry: the highest day that has not been filed yet.

   Filed means answered, not finished. A day recorded as "I didn't do it" is
   closed as far as this prompt is concerned — it has an account on it, and
   asking again would be asking them to file it twice. */
function pickCurrent(entries: LedgerEntry[]): LedgerEntry | null {
  const unfiled = entries.filter((e) => !isFiled(e));
  return unfiled.length ? unfiled[unfiled.length - 1] : null;
}

export default function LedgerPage() {
  const [state, setState] = useState<State>('loading');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  /* null until they tap. Then 'ok' or 'failed' — the placeholder must not claim
     they were counted if the write did not land. */
  const [villain, setVillain] = useState<'ok' | 'failed' | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const [rows, me] = await Promise.all([listEntries(), getProfile()]);
    setEntries(rows);
    setProfile(me);
    setState('ready');
  }, []);

  useEffect(() => {
    // The magic link lands here with the session in the URL fragment. supabase-js
    // consumes it on construction (detectSessionInUrl), so by the time this runs
    // getSession is authoritative either way.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setState('signed-out');
        return;
      }
      void load();
    });
  }, [load]);

  const unlocked = villainUnlocked(entries);

  const tapVillain = async () => {
    setVillain((await signalVillain()) ? 'ok' : 'failed');
  };

  const current = pickCurrent(entries);
  const past = entries.filter((e) => e.id !== current?.id).sort((a, b) => b.day_number - a.day_number);


  if (state === 'loading') {
    return (
      <PaperPage title="Your Ledger" nav={<NavLink href="/blueprint">Your Blueprint</NavLink>}>
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, color: '#6E6A66' }}>
          Looking you up.
        </p>
      </PaperPage>
    );
  }

  if (state === 'signed-out') {
    return (
      <PaperPage title="Your Ledger" nav={<NavLink href="/blueprint">Your Blueprint</NavLink>}>
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#1A1A1A' }}>
          This link has expired, or this browser doesn&rsquo;t know you yet.
        </p>
        <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
          Open the newest link from your email, on the device you actually want to use.
        </p>
      </PaperPage>
    );
  }

  /* The seventh day is not a mission with a Ledger under it. It is the week,
     the read, and the question, and it replaces the page rather than sitting
     inside it. */
  if (current?.day_number === RECALIBRATION_DAY && profile?.becoming) {
    return (
      <div
        style={{
          minHeight: '100svh', background: '#FBFAF7', color: '#1A1A1A',
          fontFamily: 'var(--sv-font)', padding: '32px 20px 80px',
        }}
      >
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <SurfaceNav becoming={profile.becoming} sticky>
            <NavLink href="/blueprint">Your Blueprint</NavLink>
          </SurfaceNav>
        </div>
        <DaySeven
          entry={current}
          entries={entries}
          becoming={profile.becoming}
          timezone={profile.timezone}
          onChanged={load}
        />
      </div>
    );
  }

  /* The placeholder. There is nothing behind the button yet and the screen says
     so — the tap is the product for now, and pretending otherwise would be the
     one thing this app is not allowed to do. */
  if (villain) {
    return (
      <PaperPage title="Counted." nav={<NavLink href="/blueprint">Your Blueprint</NavLink>}>
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: '#1A1A1A' }}>
          Villain mode doesn&rsquo;t exist yet. This screen is a counter &mdash; it is here to
          find out how many people would say yes to seven days of harder acts with no way out.
        </p>
        <p style={{ marginTop: 16, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: '#6E6A66' }}>
          {villain === 'ok'
            ? 'You are counted. If enough people are, it gets built.'
            : 'That didn\u2019t record. Nothing was counted \u2014 tap it again.'}
        </p>
        <button
          onClick={() => setVillain(null)}
          style={{
            marginTop: 32, minHeight: 48, minWidth: 200,
            background: 'none', color: '#1A1A1A', border: '1px solid #1A1A1A', borderRadius: 2,
            fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.12em', padding: '16px 24px', cursor: 'pointer',
          }}
        >
          Back to your Ledger
        </button>
      </PaperPage>
    );
  }

  /* The mark at 34px rather than 16. At 16 a shaded illustration was a smudge,
     which is why this slot held the square; at 34 it reads, and it is the only
     place the character appears on the surface a returning person lives on.
     The link is the way back to the reading — without it a magic link opens the
     Ledger and nothing else is reachable from it. */
  const becomingLine = profile?.becoming ? (
    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <ArchetypeMark becoming={profile.becoming} size={34} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span>
          {profile.becoming}
          {profile.becomingResolvedAt ? '' : ' · in progress'}
        </span>
      </span>
    </span>
  ) : undefined;

  return (
    <PaperPage
      title="Your Ledger"
      standfirst={becomingLine}
      becoming={profile?.becoming}
      nav={<NavLink href="/blueprint">Your Blueprint</NavLink>}
    >
      {/* ── Today, at the top ── */}
      {current ? (
        <>
        {/* Their own line, standing above the day. It closed WHO YOU ARE on the
            reveal and has not been seen since; it comes back while a day is
            open, because that is the stretch where the act is still a decision
            rather than a record. Quiet — it is not news, it is the premise. */}
        {profile?.recognitionLine && (
          <p
            style={{
              margin: '0 0 20px',
              fontFamily: 'var(--sv-font)', fontWeight: 400,
              fontSize: 15, lineHeight: 1.6, color: '#6E6A66',
            }}
          >
            {profile.recognitionLine}
          </p>
        )}

        {/* The read, before anything else and larger than the act it introduces.
            This sentence is the app saying it watched — the reason there is any
            point coming back — and it used to exist only inside the 6am email,
            read once and then gone. It leads the page now. Null on day one and
            on anything generated before the column existed, in which case the
            page simply opens on the act as it always did. */}
        {current.read_line && (
          <p
            style={{
              margin: '0 0 28px',
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(20px, 5.4vw, 24px)', lineHeight: 1.42,
              letterSpacing: '-0.01em', color: '#000000',
            }}
          >
            {current.read_line}
          </p>
        )}
        <div style={{ borderTop: '1px solid #E4E0D6', paddingTop: 22 }}>
          <p className="sv-label" style={{ fontSize: 11, color: '#000000', letterSpacing: '0.14em' }}>
            DAY {current.day_number} · Committed {formatTime(current.committed_at)} · Open
          </p>
          <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 17, lineHeight: 1.55, color: '#1A1A1A' }}>
            {current.mission_text}
          </p>

          <FileDay entry={current} onChanged={load} />
        </div>
        </>
      ) : (
        <div style={{ borderTop: '1px solid #E4E0D6', paddingTop: 22 }}>
          <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
            Nothing open. The next one is being written. It lands at 6am.
          </p>
        </div>
      )}

      {/* ── Everything already on the record, underneath ── */}
      {past.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <p className="sv-label" style={{ fontSize: 11, color: '#1A1A1A', letterSpacing: '0.18em' }}>
            ON THE RECORD
          </p>
          {past.map((e) => (
            <div key={e.id} style={{ borderTop: '1px solid #E4E0D6', padding: '16px 0' }}>
              <p className="sv-label" style={{ fontSize: 11, color: '#1A1A1A', letterSpacing: '0.1em' }}>
                DAY {e.day_number} · {formatDay(e.committed_at)} · Committed {formatTime(e.committed_at)}
                {e.completed_at ? ` · Completed ${formatTime(e.completed_at)}` : ' · Open'}
              </p>
              <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: '#6E6A66' }}>
                {e.mission_text}
              </p>
              {e.what_happened && (
                <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 15, lineHeight: 1.6, color: '#1A1A1A' }}>
                  {e.what_happened}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Only while it is still a promise. Before the first commit there is no
          tomorrow to describe; once a second day exists the promise has been
          kept in front of them, and a card explaining what already happened is
          just something to read past. */}
      {entries.length > 0 && !entries.some((e) => e.day_number > 1) && <NextMorning />}

      {/* Once there is a record worth coming back to. */}
      {entries.length > 0 && <InstallPrompt />}

      {/* Earned, not advertised. Three days both committed and completed, or it
          does not exist — offering it to someone on day one would make it a
          feature to browse rather than a door that opens. */}
      {unlocked && (
        <div style={{ marginTop: 40, borderTop: '1px solid #E4E0D6', paddingTop: 22 }}>
          <button
            onClick={() => void tapVillain()}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'var(--sv-font)',
            }}
          >
            <span
              style={{
                display: 'block', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.18em', color: '#000000', textTransform: 'uppercase',
              }}
            >
              Become the villain
            </span>
            <span
              style={{
                display: 'block', marginTop: 8, fontWeight: 300,
                fontSize: 14, lineHeight: 1.6, color: '#6E6A66',
              }}
            >
              Seven days. Harder acts. No opt-out. Not built yet.
            </span>
          </button>
        </div>
      )}
    </PaperPage>
  );
}
