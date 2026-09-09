import { useState } from 'react';
import { fileEntry, undoFiling, type LedgerEntry } from '../lib/ledger';
import FilingUndo from './FilingUndo';

interface Props {
  entry: LedgerEntry;
  /** Called after a filing or an undo lands, so the surface can re-read. */
  onChanged?: () => void | Promise<void>;
  /** Shown above the field. The Day 7 screen names the day; the Ledger does not. */
  heading?: string;
}

/* The only way to file a day.

   This existed twice — once in the Ledger and once in the reveal's card — and
   the Day 7 screen had neither, so a person on day seven could see five open
   days on the record and file none of them. Every surface that can file a day
   now renders this component, which is the only way "same size, same weight,
   same field, same undo" stays true rather than being re-typed and drifting. */
export default function FileDay({ entry, onChanged, heading }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [justFiled, setJustFiled] = useState<{ done: boolean } | null>(null);

  const ready = text.trim().length > 0;
  const fieldId = `what-happened-${entry.id}`;

  const submit = async (done: boolean) => {
    if (!ready || saving) return;
    setSaving(true);
    setFailed(false);
    const updated = await fileEntry(entry.id, text, done);
    setSaving(false);
    if (!updated) { setFailed(true); return; }
    setJustFiled({ done });
    setText('');
    await onChanged?.();
  };

  const undo = async () => {
    const back = await undoFiling(entry.id);
    setJustFiled(null);
    // The window closed between the tap and the write. Say so rather than
    // pretending, and leave the record as it stands.
    if (back?.what_happened) setFailed(true);
    await onChanged?.();
  };

  if (justFiled) {
    return (
      <FilingUndo
        done={justFiled.done}
        onUndo={() => void undo()}
        onExpire={() => setJustFiled(null)}
      />
    );
  }

  return (
    <div>
      <label
        htmlFor={fieldId}
        style={{
          display: 'block', marginTop: 22, fontFamily: 'var(--sv-font)', fontSize: 11,
          fontWeight: 700, letterSpacing: '0.14em', color: '#000000', textTransform: 'uppercase',
        }}
      >
        {heading ?? 'What actually happened?'}
      </label>
      <input
        id={fieldId}
        type="text"
        value={text}
        required
        onChange={(e) => setText(e.target.value)}
        style={{
          marginTop: 10, width: '100%', minHeight: 48, boxSizing: 'border-box',
          background: 'transparent', color: '#1A1A1A',
          border: '1px solid #E4E0D6', borderRadius: 2,
          fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, padding: '12px 14px',
        }}
      />

      {/* Two ways to file, the same size and the same weight. One of them is not
          the failure option, and the field is required for both. */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          onClick={() => void submit(true)}
          disabled={!ready || saving}
          style={{
            flex: 1, minHeight: 48,
            background: ready ? '#000000' : '#E4E0D6',
            color: ready ? '#FBFAF7' : '#9A9A9A',
            border: 'none', borderRadius: 2,
            fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.1em', padding: '16px 12px',
            cursor: ready && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Saving…' : "It's done"}
        </button>
        <button
          onClick={() => void submit(false)}
          disabled={!ready || saving}
          style={{
            flex: 1, minHeight: 48,
            background: 'none',
            color: ready ? '#1A1A1A' : '#9A9A9A',
            border: `1px solid ${ready ? '#1A1A1A' : '#E4E0D6'}`, borderRadius: 2,
            fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.1em', padding: '16px 12px',
            cursor: ready && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          I didn&rsquo;t do it
        </button>
      </div>

      {failed && (
        <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#1A1A1A' }}>
          That didn&rsquo;t save. Your words are still in the box &mdash; try again.
        </p>
      )}
    </div>
  );
}
