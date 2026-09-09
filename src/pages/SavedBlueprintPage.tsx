import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile, parseBlueprint, saveBlueprintRecord, type Profile } from '../lib/blueprint';
import { getBlueprint } from '../utils/storage';
import BlueprintPage from './BlueprintPage';
import PaperPage from '../components/PaperPage';
import ArchetypeMark from '../components/ArchetypeMark';
import SaveCard from '../components/SaveCard';
import { NavLink } from '../components/SurfaceNav';

type State = 'loading' | 'signed-out' | 'ready';

/**
 * /blueprint — the reading, reachable from any device the magic link opens.
 *
 * Two sources, in order. The browser that generated it still has the full text
 * in localStorage and needs no session at all. Everywhere else it comes off the
 * users row, which is why blueprint_text exists.
 *
 * A reading made before that column existed is on neither path for a new device,
 * so this degrades to the record that does survive — the name, the loop, both
 * acts — rather than showing an error. Opening this page on the original device
 * writes the text back, and after that it is reachable everywhere.
 */
export default function SavedBlueprintPage() {
  const [state, setState] = useState<State>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [text, setText] = useState<string>('');

  const load = useCallback(async () => {
    const local = getBlueprint()?.text ?? '';
    const me = await getProfile();
    setProfile(me);

    const full = local || me?.blueprintText || '';
    setText(full);
    setState('ready');

    // Backfill: this device has the reading and the record does not.
    if (local && me && !me.blueprintText) {
      void saveBlueprintRecord(parseBlueprint(local), me.chosen, undefined, local);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // The generating device can read its own copy without a session.
      if (!data.session && !getBlueprint()?.text) {
        setState('signed-out');
        return;
      }
      void load();
    });
  }, [load]);

  if (state === 'loading') {
    return (
      <PaperPage title="Your Blueprint" nav={<NavLink href="/ledger">Your Ledger</NavLink>}>
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, color: '#6E6A66' }}>
          Looking it up.
        </p>
      </PaperPage>
    );
  }

  if (state === 'signed-out') {
    return (
      <PaperPage title="Your Blueprint" nav={<NavLink href="/ledger">Your Ledger</NavLink>}>
        <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#1A1A1A' }}>
          This browser isn&rsquo;t signed in, and it doesn&rsquo;t have a copy of your reading.
        </p>
        <p style={{ marginTop: 12, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
          Open the newest link from your email, on the device you actually want to use.
        </p>
      </PaperPage>
    );
  }

  // The whole reading. Same layout as the reveal, with the acts as a record.
  if (text) {
    return <BlueprintPage text={text} readOnly chosen={profile?.chosen ?? null} />;
  }

  // The reading predates blueprint_text and this is not the device that made it.
  // What survives is still worth showing, and the card still works from it.
  if (profile?.becoming) {
    return (
      <PaperPage title="Your Blueprint" becoming={profile.becoming} nav={<NavLink href="/ledger">Your Ledger</NavLink>}>
        <div style={{ textAlign: 'center', padding: '4vh 0 2vh' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <ArchetypeMark becoming={profile.becoming} size="clamp(180px, 48vw, 240px)" />
          </div>
          <h2
            style={{
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(32px, 10vw, 48px)', lineHeight: 1.05,
              letterSpacing: '0.01em', color: '#000000', textTransform: 'uppercase',
            }}
          >
            {profile.becoming}
          </h2>
          {profile.loop && (
            <p style={{ marginTop: 18, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, color: '#6E6A66' }}>
              Right now you&rsquo;re the {profile.loop}.
            </p>
          )}
        </div>

        {(profile.acts.hard || profile.acts.next) && (
          <div style={{ marginTop: 24 }}>
            <p className="sv-label" style={{ fontSize: 11, color: '#1A1A1A', letterSpacing: '0.18em' }}>
              ONE ACT
            </p>
            {([['hard', 'THE HARD ONE'], ['next', 'THE NEXT ONE']] as const).map(([k, label]) =>
              profile.acts[k] ? (
                <div
                  key={k}
                  style={{
                    marginTop: 12, padding: '16px 16px 18px',
                    border: '1px solid #E4E0D6', borderRadius: 2,
                    borderLeft: profile.chosen === k ? '3px solid #000000' : '1px solid #E4E0D6',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#6E6A66' }}>
                    {label}
                  </span>
                  <span style={{ display: 'block', marginTop: 8, fontSize: 16, lineHeight: 1.5, color: '#1A1A1A' }}>
                    {profile.acts[k]}
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <SaveCard becoming={profile.becoming} loop={profile.loop} />
        </div>

        <p style={{ marginTop: 26, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, lineHeight: 1.7, color: '#6E6A66' }}>
          The written reading was made before it was kept on the server, so it only
          exists in the browser that generated it. Open this page there once and it
          will be here from then on.
        </p>
      </PaperPage>
    );
  }

  return (
    <PaperPage title="Your Blueprint" nav={<NavLink href="/ledger">Your Ledger</NavLink>}>
      <p style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.7, color: '#6E6A66' }}>
        There is no reading on this account yet.
      </p>
    </PaperPage>
  );
}
