import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listEntries, completeEntry, type LedgerEntry } from '../lib/ledger';
import PaperPage from '../components/PaperPage';

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

  const load = useCallback(async () => {
    setEntries(await listEntries());
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
          One moment.
        </p>
      </PaperPage>
    );
  }

  if (state === 'signed-out') {
    return (
      <PaperPage title="Your Ledger">
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#1A1A1A' }}>
          This link has expired, or it was opened in a browser that is not signed in.
        </p>
        <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
          Open the most recent link from your email, on the device you want to use.
        </p>
      </PaperPage>
    );
  }

  return (
    <PaperPage title="Your Ledger">
      {/* ── Today, at the top ── */}
      {current ? (
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
              That did not save. Check your connection and try again.
            </p>
          )}
        </div>
      ) : (
        <div style={{ borderTop: '1px solid #E4E0D6', paddingTop: 22 }}>
          <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
            Nothing open. The next one arrives in the morning.
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
    </PaperPage>
  );
}
