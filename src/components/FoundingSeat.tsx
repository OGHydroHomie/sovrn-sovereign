import { useState } from 'react';
import { captureEmail } from '../lib/capture';

type State = 'idle' | 'sending' | 'done' | 'failed';

/* The only control on the page.

   It writes the address to `emails` with source 'founding' and does nothing
   else. No account is created, nothing is linked, no confirmation is sent —
   someone asking for a seat has not taken the quiz and has not asked to confirm
   anything. */
export default function FoundingSeat() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
    if (!valid || state === 'sending') return;
    setState('sending');
    try {
      await captureEmail(email, 'founding', { link: false });
      setState('done');
    } catch {
      setState('failed');
    }
  };

  if (state === 'done') {
    return (
      <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: '#1A1A1A' }}>
        You&rsquo;re on the list. You&rsquo;ll hear from us before it opens.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 380 }}>
      <label
        htmlFor="founding-email"
        style={{
          display: 'block', fontFamily: 'var(--sv-font)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.14em', color: '#000000', textTransform: 'uppercase',
        }}
      >
        Request a founding seat
      </label>
      <input
        id="founding-email"
        type="email"
        inputMode="email"
        value={email}
        placeholder="your@email.com"
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
        style={{
          marginTop: 12, width: '100%', minHeight: 52, boxSizing: 'border-box',
          background: 'transparent', color: '#1A1A1A',
          border: '1px solid #E4E0D6', borderRadius: 2,
          fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 16, padding: '14px 16px',
        }}
      />
      <button
        onClick={() => void send()}
        disabled={!valid || state === 'sending'}
        style={{
          marginTop: 12, width: '100%', minHeight: 52,
          background: valid ? '#000000' : '#E4E0D6',
          color: valid ? '#FBFAF7' : '#9A9A9A',
          border: 'none', borderRadius: 2,
          fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
          textTransform: 'uppercase', letterSpacing: '0.14em', padding: '18px 24px',
          cursor: valid && state !== 'sending' ? 'pointer' : 'not-allowed',
        }}
      >
        {state === 'sending' ? 'Sending…' : 'Request a founding seat'}
      </button>
      {state === 'failed' && (
        <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#1A1A1A' }}>
          That didn&rsquo;t send. Give it a second and try again.
        </p>
      )}
    </div>
  );
}
