import { useCallback, useEffect, useState } from 'react';
import { completeEntry, listEntries, type LedgerEntry } from '../lib/ledger';

interface Props {
  entry: LedgerEntry;
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

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E8E6E1',
  borderLeft: '3px solid #C21F2C',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  padding: 24,
};

export default function DayOne({ entry: initialEntry }: Props) {
  const [entry, setEntry] = useState<LedgerEntry>(initialEntry);
  const [asking, setAsking] = useState(false);
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
    setAsking(false);
  };

  return (
    <div style={{ marginTop: 32 }}>
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="sv-label" style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 700, letterSpacing: '0.1em' }}>
            DAY {entry.day_number}
          </h2>
          <span className="sv-label" style={{ fontSize: 11, color: '#9A9A9A', letterSpacing: '0.12em' }}>
            {isComplete ? 'Complete' : 'Your mission'}
          </span>
        </div>

        <p className="sv-serif" style={{ fontSize: 17, lineHeight: 1.6, color: '#1A1A1A', marginTop: 12 }}>
          {entry.mission_text}
        </p>

        {!isComplete && !asking && (
          <button
            onClick={() => setAsking(true)}
            style={{
              marginTop: 20, width: '100%', minHeight: 48,
              background: '#C21F2C', color: '#FFFFFF', border: 'none', borderRadius: 12,
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14,
              textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 24px', cursor: 'pointer',
            }}
          >
            Complete
          </button>
        )}

        {!isComplete && asking && (
          <div style={{ marginTop: 20 }}>
            <label
              htmlFor="what-happened"
              className="sv-label"
              style={{ display: 'block', fontSize: 11, color: '#C21F2C', letterSpacing: '0.14em', fontWeight: 500 }}
            >
              What actually happened?
            </label>
            <input
              id="what-happened"
              type="text"
              value={text}
              autoFocus
              required
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
              style={{
                marginTop: 10, width: '100%', minHeight: 48, boxSizing: 'border-box',
                background: '#FBFAF7', color: '#1A1A1A',
                border: '1px solid #E8E6E1', borderRadius: 10,
                fontFamily: 'Georgia, serif', fontSize: 16, padding: '12px 14px',
              }}
            />
            <button
              onClick={() => void submit()}
              disabled={!ready || saving}
              style={{
                marginTop: 12, width: '100%', minHeight: 48,
                background: ready ? '#C21F2C' : '#E8E6E1',
                color: ready ? '#FFFFFF' : '#9A9A9A',
                border: 'none', borderRadius: 12,
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14,
                textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 24px',
                cursor: ready && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Recording…' : 'Record it'}
            </button>
            {failed && (
              <p className="sv-serif" style={{ fontSize: 14, color: '#C21F2C', marginTop: 10 }}>
                That did not save. Check your connection and try again.
              </p>
            )}
          </div>
        )}

        {isComplete && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E8E6E1' }}>
            <p className="sv-label" style={{ fontSize: 11, color: '#9A9A9A', letterSpacing: '0.12em' }}>
              {formatStamp(entry.completed_at!)}
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
              style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #E8E6E1' }}
            >
              <span
                className="sv-label"
                style={{ fontSize: 11, color: row?.completed_at ? '#1A1A1A' : '#C9C6C0', letterSpacing: '0.1em', fontWeight: 700, minWidth: 46 }}
              >
                DAY {dayNumber}
              </span>
              <div style={{ flex: 1 }}>
                {row?.completed_at ? (
                  <>
                    <p className="sv-label" style={{ fontSize: 11, color: '#9A9A9A', letterSpacing: '0.1em' }}>
                      {formatStamp(row.completed_at)}
                    </p>
                    <p className="sv-serif" style={{ fontSize: 15, lineHeight: 1.6, color: '#4A4A4A', marginTop: 6 }}>
                      {row.what_happened}
                    </p>
                  </>
                ) : (
                  <p className="sv-serif" style={{ fontSize: 15, lineHeight: 1.6, color: '#C9C6C0', fontStyle: 'italic' }}>
                    {row ? 'Open.' : 'No entry.'}
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
