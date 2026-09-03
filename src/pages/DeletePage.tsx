import { useEffect, useState } from 'react';
import PaperPage, { H2, P, UL } from '../components/PaperPage';
import { supabase } from '../lib/supabase';

type State = 'checking' | 'nothing' | 'ready' | 'confirming' | 'working' | 'done' | 'failed';

/* Everything this app writes to the browser lives under this prefix, including
   the auth session itself (storageKey 'sovrn_auth'). */
function clearLocalState() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sovrn_')) localStorage.removeItem(key);
  }
}

const BUTTON: React.CSSProperties = {
  minHeight: 48,
  padding: '14px 22px',
  borderRadius: 12,
  fontFamily: 'var(--sv-font)',
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

export default function DeletePage() {
  const [state, setState] = useState<State>('checking');

  useEffect(() => {
    // Read the existing session only. This page must never create an identity
    // just so there is something to delete.
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? 'ready' : 'nothing');
    });
  }, []);

  const runDelete = async () => {
    setState('working');

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setState('nothing');
      return;
    }

    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setState('failed');
        return;
      }
    } catch {
      setState('failed');
      return;
    }

    await supabase.auth.signOut().catch(() => undefined);
    clearLocalState();
    setState('done');
  };

  return (
    <PaperPage title="Delete my data">
      {state === 'done' ? (
        <>
          <P>Your data has been deleted.</P>
          <UL
            items={[
              'Your Blueprint is gone.',
              'Every Ledger entry is gone.',
              'Your email address is gone.',
              'The account itself is gone.',
            ]}
          />
          <P>
            Nothing about you remains on our side, and this browser has been signed
            out and cleared.
          </P>
        </>
      ) : state === 'nothing' ? (
        <>
          <P>There is nothing stored for this browser.</P>
          <P>
            SOVRN identifies you by a session held in this browser. If you completed
            a Blueprint in a different browser or on a different device, open this
            page there to delete it.
          </P>
        </>
      ) : (
        <>
          <P>This deletes everything SOVRN holds about you.</P>

          <H2>What is removed</H2>
          <UL
            items={[
              'Your Blueprint, including the birth date, time, and place it was generated from, and your answers to the eight questions.',
              'Every Ledger entry — each mission, each completion, and what you wrote about what happened.',
              'Your email address.',
              'The anonymous account that ties them together.',
            ]}
          />

          <H2>This cannot be undone</H2>
          <P>
            The deletion is immediate and permanent. There is no archive, no grace
            period, and no way for us to restore any of it afterwards. If you want a
            copy of your Blueprint, download it before you continue.
          </P>

          {state === 'failed' && (
            <P>
              The deletion did not complete and nothing was removed. Check your
              connection and try again.
            </P>
          )}

          <div style={{ marginTop: 28 }}>
            {state === 'confirming' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button
                  onClick={() => void runDelete()}
                  style={{ ...BUTTON, background: '#000000', color: '#FFFFFF', border: 'none' }}
                >
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setState('ready')}
                  style={{ ...BUTTON, background: 'transparent', color: '#1A1A1A', border: '1px solid #1A1A1A' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setState('confirming')}
                disabled={state !== 'ready' && state !== 'failed'}
                style={{
                  ...BUTTON,
                  background: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  opacity: state === 'working' ? 0.5 : 1,
                  cursor: state === 'working' ? 'not-allowed' : 'pointer',
                }}
              >
                {state === 'working' ? 'Deleting…' : 'Delete my data'}
              </button>
            )}
          </div>
        </>
      )}
    </PaperPage>
  );
}
