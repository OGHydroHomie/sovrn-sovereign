import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listEntries, isFiled, type LedgerEntry } from '../lib/ledger';
import FileDay from '../components/FileDay';
import InstallScreen from '../components/InstallScreen';
import { shouldOfferInstall } from '../lib/install';
import TrialCard, { type Trial } from '../components/TrialCard';
import TrialArrival from '../components/TrialArrival';
import TrialUnbinding, { type Unbound } from '../components/TrialUnbinding';
import MirrorCard, { type Mirror } from '../components/MirrorCard';
import { getMirror } from '../lib/mirror';
import { getTrial, rejectTrial } from '../lib/trial';
import PaperPage from '../components/PaperPage';
import NextMorning from '../components/NextMorning';
import { signalVillain, villainUnlocked } from '../lib/villain';
import { getProfile, type Profile } from '../lib/blueprint';
import ArchetypeMark from '../components/ArchetypeMark';
import CycleClosing from '../components/CycleClosing';
import TargetAdmission from '../components/TargetAdmission';
import { getOpenCycle, listCycles, daysLeft, retireCycle, type Cycle } from '../lib/cycle';
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
  /* The second and last asking. Days after the first are written by the 6am
     cron with their act already committed — there is no second commit gesture
     anywhere in the product — so the second occasion is the morning a second day
     exists, which is also the morning the promise it makes has been kept. */
  const [offerInstall, setOfferInstall] = useState(false);
  /* The condition wrapping today, if the record supports one. Most days it is
     null, which is the normal day and not a lesser one. */
  const [trial, setTrial] = useState<Trial | null>(null);
  /* The arrival runs over the Ledger, once, on the first sight of an encounter.
     Held separately from `trial` so that dismissing the ceremony leaves the card
     exactly where it was underneath — the trial is not the ceremony, and a
     reload must not replay one. */
  const [arriving, setArriving] = useState<Trial | null>(null);
  /* Once per figure, ever. The server sends this in exactly one response and
     stamps it seen as it goes, so there is nothing here to guard against a
     reload — if it arrives, it has never been shown. */
  const [unbinding, setUnbinding] = useState<Unbound | null>(null);
  /* For the days without a trial, which is most of them. Fetched after the page
     is already usable, because it is a model call and the act must not wait on
     one. It fades in late or it never arrives, and either is a fine day. */
  const [mirror, setMirror] = useState<Mirror | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [naming, setNaming] = useState(false);
  const [retiring, setRetiring] = useState(false);

  const load = useCallback(async () => {
    const [rows, me, open, all] = await Promise.all([
      listEntries(), getProfile(), getOpenCycle(), listCycles(),
    ]);
    setEntries(rows);
    setProfile(me);
    setCycle(open);
    setCycles(all);
    /* A second day exists, and the first asking was refused. */
    if (rows.some((e) => e.day_number > 1) && shouldOfferInstall(2)) setOfferInstall(true);
    /* Asked for once the ledger is in hand, because a trial only exists to wrap
       an act and there is nothing to wrap before the day is known. Moving it up
       into the Promise.all saves a round trip and is safe — the server applies
       the same rule — but it buys nothing anyone can see, so it stays where it
       reads correctly. */
    if (rows.length) {
      const { trial: t, unbinding: freed } = await getTrial();
      setTrial(t);
      /* `fresh` is decided on the server, against the stamp on today's row, so
         it survives a reload and cannot be replayed by one. */
      if (t?.fresh) setArriving(t);
      if (freed) setUnbinding(freed);
      /* One or the other, never both. A trial is a named condition and the
         Mirror is what fills the days there isn't one; showing them together
         would be two things claiming to be the observation of the day. */
      if (!t) void getMirror().then(setMirror);
    }
    setNaming(false);
    setRetiring(false);
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

  /* A cycle that has ended, and nothing open. The record of it is the page —
     there is nothing else the Ledger could usefully be showing. */
  const lastClosed = cycles.find((c) => c.closed_at);
  if (!cycle && lastClosed && !naming) {
    return (
      <PaperPage title="" becoming={profile?.becoming} nav={<NavLink href="/blueprint">Your Blueprint</NavLink>}>
        <CycleClosing
          cycle={lastClosed}
          entries={entries}
          timezone={profile?.timezone ?? null}
          onNext={() => setNaming(true)}
        />
      </PaperPage>
    );
  }

  if (!cycle && naming) {
    return (
      <PaperPage title="Name the next one" becoming={profile?.becoming} nav={<NavLink href="/blueprint">Your Blueprint</NavLink>}>
        <TargetAdmission onOpened={load} />
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
      <ArchetypeMark becoming={profile.becoming} size={34} basis="height" />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span>
          {profile.becoming}
          {profile.becomingResolvedAt ? '' : ' · in progress'}
        </span>
      </span>
    </span>
  ) : undefined;

  return (
    <>
    {/* Over the Ledger, not instead of it. The page is built and sitting
        underneath the whole time, so the hand-over at the end of the ceremony
        is the ground lightening onto something already there rather than a
        second load. Ahead of the install offer, which can wait — this is the
        one moment in the product that happens to them. */}
    {/* The unbinding comes first if both are somehow due on the same open: one
        figure ends before another begins, and they must never be on screen
        together. In practice a freeing response never carries a trial. */}
    {unbinding && (
      <TrialUnbinding unbound={unbinding} onDone={() => setUnbinding(null)} />
    )}
    {arriving && current && !unbinding && (
      <TrialArrival
        trial={arriving}
        act={current.mission_text}
        onDone={() => setArriving(null)}
      />
    )}
    {offerInstall && !arriving && !unbinding && (
      <InstallScreen occasion={2} becoming={profile?.becoming} onClose={() => setOfferInstall(false)} />
    )}
    <PaperPage
      title="Your Ledger"
      standfirst={becomingLine}
      becoming={profile?.becoming}
      nav={<NavLink href="/blueprint">Your Blueprint</NavLink>}
    >
      {cycle && (
        <div style={{ marginBottom: 26, borderBottom: '1px solid #E4E0D6', paddingBottom: 20 }}>
          <p className="sv-label" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#6E6A66' }}>
            CYCLE {cycle.cycle_number} · {daysLeft(cycle)} DAYS LEFT
          </p>
          <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 17, lineHeight: 1.5, color: '#000000' }}>
            {cycle.target_admitted}
          </p>
          <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, lineHeight: 1.6, color: '#6E6A66' }}>
            {cycle.rubric}
          </p>

          {/* Low, small, and plain. Retiring is not failure and it is not
              completion — sometimes the opportunity goes or the thing genuinely
              changes, and the only dishonest options are pretending it finished
              or pretending it is still live. The confirmation says exactly what
              it does and nothing about why they might be doing it. */}
          {!retiring ? (
            <button
              onClick={() => setRetiring(true)}
              style={{
                marginTop: 18, background: 'none', border: 'none', padding: '4px 2px',
                cursor: 'pointer', fontFamily: 'var(--sv-font)', fontWeight: 300,
                fontSize: 13, color: '#6E6A66',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              Retire this target
            </button>
          ) : (
            <div style={{ marginTop: 18, borderTop: '1px solid #E4E0D6', paddingTop: 16 }}>
              <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#1A1A1A' }}>
                This closes the cycle as an attempt. The target, the boundary and every
                day of it stay on the record. Nothing is marked finished.
              </p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                <button
                  onClick={() => void (async () => { await retireCycle(); await load(); })()}
                  style={{
                    minHeight: 44, background: 'none', color: '#1A1A1A',
                    border: '1px solid #1A1A1A', borderRadius: 2,
                    fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    padding: '14px 20px', cursor: 'pointer',
                  }}
                >
                  Retire it
                </button>
                <button
                  onClick={() => setRetiring(false)}
                  style={{
                    background: 'none', border: 'none', padding: '8px 2px', cursor: 'pointer',
                    fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#6E6A66',
                    textDecoration: 'underline', textUnderlineOffset: 3,
                  }}
                >
                  Keep it open
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
              margin: '0 0 30px',
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(26px, 7vw, 34px)', lineHeight: 1.28,
              letterSpacing: '-0.015em', color: '#000000',
              textWrap: 'balance',
            }}
          >
            {current.read_line}
          </p>
        )}
        {/* Above the act, never instead of it. */}
        {!trial && mirror && <MirrorCard mirror={mirror} />}
        {trial && (
          <TrialCard
            trial={trial}
            onReject={() => { setTrial(null); void rejectTrial(); }}
          />
        )}
        <div style={{ borderTop: '1px solid #E4E0D6', paddingTop: 22 }}>
          <p className="sv-label" style={{ fontSize: 11, color: '#6E6A66', letterSpacing: '0.14em' }}>
            DAY {current.day_number} · Committed {formatTime(current.committed_at)} · Open
          </p>
          {/* The act, under the read and quieter than it. It used to be set at
              the same weight and nearly the same size, which made the page two
              headlines — and of the two, the one written about this person this
              morning is the one worth reading first. */}
          <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 16, lineHeight: 1.55, color: '#1A1A1A' }}>
            {current.mission_text}
          </p>

          <FileDay entry={current} onChanged={load} onCrossed={load} />
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
    </>
  );
}
