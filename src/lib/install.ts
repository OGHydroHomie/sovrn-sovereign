/* Whether this product can be kept, and how.
 *
 * Two routes exist and no others. Chrome fires `beforeinstallprompt`, which can
 * be held and fired later against a real control. iOS Safari fires nothing and
 * has no API at all — it can only be told what to tap. Everything else cannot
 * install a web app, and on those the screen does not appear: an instruction
 * nobody can follow is worse than no instruction.
 *
 * The event fires early and once, well before anyone has committed anything, so
 * it is caught at module load and held. Listening only when the screen mounts
 * means listening after the event has already gone.
 */

export interface InstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPrompt | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferred = e as unknown as InstallPrompt;
  });
  /* If it is installed while the tab is open, the offer stops being true. */
  window.addEventListener('appinstalled', () => { deferred = null; });
}

export function getInstallPrompt(): InstallPrompt | null {
  return deferred;
}

export function clearInstallPrompt(): void {
  deferred = null;
}

/** Already kept. Nothing to ask for. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iOS Safari, which can be told but not asked. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iDevice = /iPad|iPhone|iPod/.test(ua);
  /* An iPad on iPadOS 13+ reports itself as a Mac; the touch points give it
     away. */
  const iPadAsMac = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  if (!iDevice && !iPadAsMac) return false;
  /* Chrome and Firefox on iOS cannot add to the home screen at all. */
  return !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/* How many times the screen has been shown and dismissed. It appears after the
   first act and, if dismissed, once more when a second day exists. After that it
   is gone for good — a third asking is nagging, and this one is free to refuse. */
const SHOWN = 'sovrn_install_shown';

export function timesShown(): number {
  if (typeof localStorage === 'undefined') return 99;
  return Number(localStorage.getItem(SHOWN) ?? '0') || 0;
}

/* Set, not incremented.
 *
 * Incrementing made the count depend on how many times the component mounted
 * rather than on how many times a person was asked — React's development mode
 * double-invokes effects, which took the count from 1 straight to 3 and burned
 * the second occasion without anyone seeing it. The occasion is a number the
 * caller already knows; recording it is idempotent. */
export function markShown(occasion: 1 | 2): void {
  try { localStorage.setItem(SHOWN, String(occasion)); } catch { /* private mode */ }
}

/** Never again, whatever the count — they kept it, or they said no twice. */
export function stopAsking(): void {
  try { localStorage.setItem(SHOWN, '99'); } catch { /* private mode */ }
}

/**
 * Whether to put the screen up now.
 *
 * `occasion` is 1 after the first act is committed and 2 once a second day
 * exists. It has to match the number of times this has already been shown, so a
 * person who has seen it once does not see it again until the second occasion,
 * and someone who never saw the first one does not get shown it out of order.
 */
export function shouldOfferInstall(occasion: 1 | 2): boolean {
  if (isStandalone()) return false;
  if (!isIOS() && !getInstallPrompt()) return false;
  return timesShown() === occasion - 1;
}
