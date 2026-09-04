import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listEntries, completeEntry, type LedgerEntry } from '../lib/ledger';
import PaperPage from '../components/PaperPage';
import NextMorning from '../components/NextMorning';
import { signalVillain, villainUnlocked } from '../lib/villain';
import { getRecognitionLine } from '../lib/blueprint';

type State = 'loading' | 'signed-out' | 'ready';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* Today's entry: the open one with the highest day number. */
function pickCurrent(entries: LedgerEntry[]): LedgerEntry | null {
  const open = entries.filter((e) => !e.completed_at);
  return open.length ? open[open.length - 1] : null;
}

export default function LedgerPage() {
  const [state, setState] = useState<State>('loading');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  /* null until they tap. Then 'ok' or 'failed' — the placeholder must not claim
     they were counted if the write did not land. */
  const [villain, setVillain] = useState<'ok' | 'failed' | null>(null);
  const [recognition, setRecognition] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rows, line] = await Promise.all([listEntries(), getRecognitionLine()]);
    setEntries(rows);
    setRecognition(line);
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
  const ready = text.trim().length > 0;

  const submit = async () => {
    if (!current || !ready || saving) return;
    setSaving(true);
    setFailed(false);
    const updated = await completeEntry(current.id, text);
    setSaving(false);
    if (!updated) {
      setFailed(true);
      return;
    }
    setText('');
    await load();
  };

  if (state === 'loading') {
    return (
      <PaperPage title="Your Ledger">
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, color: '#6E6A66' }}>
          Looking you up.
        </p>
      </PaperPage>
    );
  }

  if (state === 'signed-out') {
    return (
      <PaperPage title="Your Ledger">
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#1A1A1A' }}>
          This link has expired, or this browser doesn&rsquo;t know you yet.
        </p>
        <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
          Open the newest link from your email, on the device you actually want to use.
        </p>
      </PaperPage>
    );
  }

  /* The placeholder. There is nothing behind the button yet and the screen says
     so — the tap is the product for now, and pretending otherwise would be the
     one thing this app is not allowed to do. */
  if (villain) {
    return (
      <PaperPage title="Counted.">
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

  return (
    <PaperPage title="Your Ledger">
      {/* ── Today, at the top ── */}
      {current ? (
        <>
        {/* Their own line, standing above the day. It closed WHO YOU ARE on the
            reveal and has not been seen since; it comes back while a day is
            open, because that is the stretch where the act is still a decision
            rather than a record. Quiet — it is not news, it is the premise. */}
        {recognition && (
          <p
            style={{
              margin: '0 0 20px',
              fontFamily: 'var(--sv-font)', fontWeight: 400,
              fontSize: 15, lineHeight: 1.6, color: '#6E6A66',
            }}
          >
            {recognition}
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

          <label
            htmlFor="what-happened"
            style={{
              display: 'block', marginTop: 22, fontFamily: 'var(--sv-font)', fontSize: 11,
              fontWeight: 700, letterSpacing: '0.14em', color: '#000000', textTransform: 'uppercase',
            }}
          >
            What actually happened?
          </label>
          <input
            id="what-happened"
            type="text"
            value={text}
            required
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            style={{
              marginTop: 10, width: '100%', minHeight: 48, boxSizing: 'border-box',
              background: 'transparent', color: '#1A1A1A',
              border: '1px solid #E4E0D6', borderRadius: 2,
              fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, padding: '12px 14px',
            }}
          />
          <button
            onClick={() => void submit()}
            disabled={!ready || saving}
            style={{
              marginTop: 12, width: '100%', minHeight: 48,
              background: ready ? '#000000' : '#E4E0D6',
              color: ready ? '#FBFAF7' : '#9A9A9A',
              border: 'none', borderRadius: 2,
              fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '0.12em', padding: '16px 24px',
              cursor: ready && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving…' : "It's done"}
          </button>
          {failed && (
            <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#1A1A1A' }}>
              That didn&rsquo;t save. Your words are still in the box &mdash; try again.
            </p>
          )}
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
