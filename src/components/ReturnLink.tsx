import { useState } from 'react';
import { supabase } from '../lib/supabase';

type State = 'closed' | 'open' | 'sending' | 'sent' | 'failed';

/**
 * The way back in.
 *
 * A Ledger lives on an anonymous session in one browser. Someone on a new phone,
 * or after clearing site data, has no route back except an email they may not
 * have kept — so the site itself has to offer one.
 *
 * shouldCreateUser: false is the load-bearing option. Without it, typing any
 * address here mints a brand new empty account, and the person is signed into a
 * Ledger that is not theirs while their real one becomes unreachable.
 *
 * The response is deliberately identical whether or not the address is known.
 * Telling a stranger "no account with that email" turns this box into a way to
 * test whether someone has used SOVRN.
 */
export default function ReturnLink() {
  const [state, setState] = useState<State>('closed');
  const [email, setEmail] = useState('');

  const valid = /\S+@\S+\.\S+/.test(email.trim());

  const send = async () => {
    if (!valid || state === 'sending') return;
    setState('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/ledger`,
      },
    });
    if (error && error.status !== 400) {
      console.warn('Return link failed:', error.message);
      setState('failed');
      return;
    }
    setState('sent');
  };

  if (state === 'sent') {
    return (
      <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, lineHeight: 1.6, color: '#6E6A66', textAlign: 'center' }}>
        If that address has a Ledger, a link is on its way.
      </p>
    );
  }

  if (state === 'closed') {
    return (
      <button
        onClick={() => setState('open')}
        style={{
          background: 'none', border: 'none', padding: '8px 2px', cursor: 'pointer',
          fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#6E6A66',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        Already started? Return to your Ledger
      </button>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '0 auto', textAlign: 'left' }}>
      <label
        htmlFor="return-email"
        style={{
          display: 'block', fontFamily: 'var(--sv-font)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.14em', color: '#1A1A1A', textTransform: 'uppercase',
        }}
      >
        Return to your Ledger
      </label>
      <input
        id="return-email"
        type="email"
        inputMode="email"
        autoFocus
        value={email}
        placeholder="your@email.com"
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
        className="sv-field"
        style={{ marginTop: 10 }}
      />
      <button
        onClick={() => void send()}
        disabled={!valid || state === 'sending'}
        style={{
          marginTop: 12, width: '100%', minHeight: 48,
          background: valid ? '#000000' : '#E4E0D6',
          color: valid ? '#FBFAF7' : '#9A9A9A',
          border: 'none', borderRadius: 2,
          fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
          textTransform: 'uppercase', letterSpacing: '0.12em', padding: '16px 24px',
          cursor: valid && state !== 'sending' ? 'pointer' : 'not-allowed',
        }}
      >
        {state === 'sending' ? 'Sending…' : 'Send me the link'}
      </button>
      {state === 'failed' && (
        <p style={{ marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, color: '#1A1A1A' }}>
          That didn&rsquo;t send. Give it a second and try again.
        </p>
      )}
    </div>
  );
}
