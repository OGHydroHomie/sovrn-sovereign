import { useEffect, useState } from 'react';

const DISMISSED = 'sovrn_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/* Add to home screen, offered once there is a Ledger worth returning to.

   This is not a growth prompt. Browser storage is the whole reason the sign-in
   problem exists — Safari evicts script-writable storage after seven days
   without interaction, which takes the anonymous session with it and turns a
   returning person into a stranger who has to find an email. An installed app is
   exempt from that eviction, and its start_url is /ledger, so the 6am act opens
   straight into it. Installing is the fix; the magic link is what you need when
   you have not.

   Dismissal is remembered. Asked twice is nagging. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED)) return;

    // iOS fires nothing — Safari has no install event, so the only option is to
    // say where the button is.
    if (isIos()) { setShow(true); return; }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED, '1');
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  return (
    <div style={{ marginTop: 40, borderTop: '1px solid #E4E0D6', paddingTop: 22 }}>
      <p
        style={{
          fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 11,
          letterSpacing: '0.14em', color: '#000000', textTransform: 'uppercase',
        }}
      >
        Stay signed in
      </p>
      <p
        style={{
          marginTop: 10, fontFamily: 'var(--sv-font)', fontWeight: 300,
          fontSize: 15, lineHeight: 1.7, color: '#6E6A66', maxWidth: 460,
        }}
      >
        {deferred
          ? 'Installed, SOVRN stays signed in and tomorrow’s act opens straight into it. Browsers clear their storage after a week. Installed apps keep it.'
          : 'Tap Share, then Add to Home Screen. SOVRN stays signed in and tomorrow’s act opens straight into it. Browsers clear their storage after a week. Installed apps keep it.'}
      </p>

      <div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'center' }}>
        {deferred && (
          <button
            onClick={() => void install()}
            style={{
              minHeight: 44, background: '#000000', color: '#FBFAF7',
              border: 'none', borderRadius: 2,
              fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 20px',
              cursor: 'pointer',
            }}
          >
            Add to home screen
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, color: '#6E6A66',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
