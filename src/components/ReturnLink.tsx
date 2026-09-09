import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const LINK_BUTTON: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, color: '#6E6A66',
  textDecoration: 'underline', textUnderlineOffset: 3,
};

type State = 'checking' | 'signed-in' | 'closed' | 'open' | 'sending' | 'sent' | 'failed';

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
  const [state, setState] = useState<State>('checking');

  /* If this browser is already signed in there is nothing to send. Asking for an
     email to reach a Ledger the session can already open is a dead end dressed as
     a form — and it appeared next to a "View Your Blueprint" button that worked. */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? 'signed-in' : 'closed');
    });
  }, []);
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
    /* Every sentence sits under the same conditional, so this is identical for an
       address that has a Ledger and one that has never been seen. Saying "check
       your email" of an account that does not exist tells a stranger nothing —
       naming the account would. */
    return (
      <>
      <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, lineHeight: 1.65, color: '#6E6A66', textAlign: 'center' }}>
        If that address has a Ledger, the link is on its way &mdash; check your email now.
        Open it on this device, because that is where it signs you in. Links expire, so if
        you have asked more than once, use the newest one.
      </p>

      {/* A typo used to be the end of it. Both routes lead back to the same
          form with the address still in it, so correcting one character does
          not mean typing the whole thing again. */}
      <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, color: '#9A9A9A', textAlign: 'center' }}>
        <button onClick={() => setState('open')} style={LINK_BUTTON}>Use a different address</button>
        <span style={{ padding: '0 8px' }}>·</span>
        <button onClick={() => void send()} style={LINK_BUTTON}>Send it again</button>
      </p>
      </>
    );
  }

  if (state === 'checking') return null;

  if (state === 'signed-in') {
    return (
      <a
        href="/ledger"
        style={{
          display: 'inline-block', padding: '8px 2px',
          fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#6E6A66',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        Open your Ledger
      </a>
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
      <p
        style={{
          marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300,
          fontSize: 13, lineHeight: 1.6, color: '#6E6A66',
        }}
      >
        There is no password. Your Ledger opens from a link sent to the address you used.
      </p>
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
