import { useCallback, useEffect, useState } from 'react';
import { completeEntry, listEntries, type LedgerEntry } from '../lib/ledger';

interface Props {
  entry: LedgerEntry;
  /** Rendered inside an existing card (the ONE ACT panel) — drops the outer chrome. */
  embedded?: boolean;
}

interface LedgerRow {
  dayNumber: number;
  entry: LedgerEntry | null;
}

/**
 * Build one row per day from 1 to the furthest day on record.
 *
 * A day with no entry is still a row. Missed days are part of the evidence — a
 * ledger that hides them is a ledger that flatters, so gaps render as visible
 * empty rows rather than being filtered out.
 */
function buildRows(entries: LedgerEntry[]): LedgerRow[] {
  const byDay = new Map(entries.map((e) => [e.day_number, e]));
  const lastDay = entries.reduce((max, e) => Math.max(max, e.day_number), 1);
  return Array.from({ length: lastDay }, (_, i) => ({
    dayNumber: i + 1,
    entry: byDay.get(i + 1) ?? null,
  }));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E8E6E1',
  borderLeft: '3px solid #000000',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  padding: 24,
};

export default function DayOne({ entry: initialEntry, embedded = false }: Props) {
  const [entry, setEntry] = useState<LedgerEntry>(initialEntry);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rows, setRows] = useState<LedgerRow[]>([]);

  const isComplete = entry.completed_at !== null;

  const refreshLedger = useCallback(async () => {
    setRows(buildRows(await listEntries()));
  }, []);

  // A completed entry means there is a ledger worth showing, including on a cold
  // load after a hard refresh.
  useEffect(() => {
    if (isComplete) void refreshLedger();
  }, [isComplete, refreshLedger]);

  const ready = text.trim().length > 0;

  const submit = async () => {
    // The entry does not write and the button does not resolve until the field
    // has content. There is no skip.
    if (!ready || saving) return;
    setSaving(true);
    setFailed(false);

    const updated = await completeEntry(entry.id, text);
    setSaving(false);

    if (!updated) {
      setFailed(true);
      return;
    }
    setEntry(updated);
  };

  return (
    <div style={{ marginTop: embedded ? 0 : 32 }}>
      <div style={embedded ? { padding: 0 } : CARD}>
        {!embedded && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="sv-label" style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 700, letterSpacing: '0.1em' }}>
              DAY {entry.day_number}
            </h2>
            <span className="sv-label" style={{ fontSize: 11, color: '#9A9A9A', letterSpacing: '0.12em' }}>
              {isComplete ? 'Complete' : 'Your mission'}
            </span>
          </div>
        )}

        <p className="sv-serif" style={{ fontSize: 17, lineHeight: 1.6, color: '#1A1A1A', marginTop: embedded ? 0 : 12 }}>
          {entry.mission_text}
        </p>

        {/* The moment after committing, which said nothing at all until now.
            This is also the only place the app asks for the thing the whole next
            day is generated from — and that a day where nothing happened is
            still worth writing down is the part nobody assumes. */}
        {!isComplete && (
          <p style={{ marginTop: 14, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.65, color: '#6E6A66' }}>
            Committed. Come back and say what happened &mdash; especially if nothing did.
          </p>
        )}

        {!isComplete && (
          <div style={{ marginTop: 18 }}>
            <p className="sv-label" style={{ fontSize: 11, color: '#6E6A66', letterSpacing: '0.12em' }}>
              Committed {formatTime(entry.committed_at)}
            </p>

            <label
              htmlFor="what-happened"
              style={{
                display: 'block', marginTop: 18, fontFamily: 'var(--sv-font)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#000000',
                textTransform: 'uppercase',
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
        )}

        {isComplete && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E8E6E1' }}>
            <p className="sv-label" style={{ fontSize: 11, color: '#6E6A66', letterSpacing: '0.12em' }}>
              Committed {formatTime(entry.committed_at)} · Completed {formatTime(entry.completed_at!)}
            </p>
            <p className="sv-serif" style={{ fontSize: 16, lineHeight: 1.6, color: '#4A4A4A', marginTop: 8 }}>
              {entry.what_happened}
            </p>
          </div>
        )}
      </div>

      {isComplete && rows.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p className="sv-label" style={{ fontSize: 11, color: '#1A1A1A', letterSpacing: '0.18em', fontWeight: 700 }}>
            THE LEDGER
          </p>
          <div style={{ height: 1, background: '#E8E6E1', margin: '10px 0 0' }} />

          {rows.map(({ dayNumber, entry: row }) => (
            <div
              key={dayNumber}
              style={{ padding: '14px 0', borderBottom: '1px solid #E4E0D6' }}
            >
              <div style={{ flex: 1 }}>
                {/* One line carrying both times. A committed-but-unfinished day
                    stays on the record exactly as it is — no red, no nudge, no
                    shame copy. The Ledger reports; it does not editorialise. */}
                <p
                  className="sv-label"
                  style={{ fontSize: 11, color: row ? '#1A1A1A' : '#C9C6C0', letterSpacing: '0.1em', fontWeight: 700 }}
                >
                  DAY {dayNumber}
                  {row && ` · Committed ${formatTime(row.committed_at)}`}
                  {row && (row.completed_at
                    ? ` · Completed ${formatTime(row.completed_at)}`
                    : ' · Open')}
                </p>

                {row?.completed_at && (
                  <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: '#1A1A1A' }}>
                    {row.what_happened}
                  </p>
                )}
                {!row && (
                  <p style={{ marginTop: 6, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: '#C9C6C0' }}>
                    No entry.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
