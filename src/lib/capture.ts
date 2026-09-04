import { supabase, UNIQUE_VIOLATION } from './supabase';
import { ensureUser } from './session';

/**
 * Record a captured email in Supabase.
 *
 * The `emails` table is write-only from the client: insert is open to anon and
 * authenticated, and there is no select policy, so nothing can read the list back
 * through the API. `email` is unique — a repeat submission is the same lead, not a
 * failure, so a unique violation resolves as success.
 *
 * Non-blocking by design. Capture must never stand between someone and their
 * blueprint, so this resolves either way and only logs on real failure.
 */
export async function captureEmail(email: string, source: string): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!address) return;

  // Best-effort attribution. A null user_id is allowed, so capture still lands if
  // the anonymous session has not settled yet.
  const uid = await ensureUser();

  const { error } = await supabase
    .from('emails')
    .insert({ email: address, user_id: uid, source });

  if (error && error.code !== UNIQUE_VIOLATION) {
    console.warn('Email capture failed:', error.message);
  }

  // Attach the address to the anonymous auth user itself, not just to the emails
  // row. Without this the account has no email, and the morning link has nothing
  // to authenticate against — Supabase's own magic-link OTP needs the address to
  // belong to the user, and a self-minted token would be a bearer credential to
  // someone's entire Ledger sitting in an inbox.
  //
  // Non-fatal on its own: the blueprint still works for a session that never
  // links. It only costs them the return path.
  await linkEmailToAccount(address);
}

/**
 * Promote the anonymous account to one that owns an email address.
 *
 * Anonymous linking is enabled on the project. Supabase sends a confirmation to
 * the new address; the account keeps the same uid throughout, so every existing
 * users row, ledger entry, and RLS policy continues to match without migration.
 */
export async function linkEmailToAccount(email: string): Promise<boolean> {
  const address = email.trim().toLowerCase();
  if (!address) return false;

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return false;

  // Already linked, to this address or another. Do not clobber it.
  if (user.email) return user.email.toLowerCase() === address;

  const { error } = await supabase.auth.updateUser(
    { email: address },
    // Supabase requires confirmation before the address becomes user.email, so
    // this send is a real email the person has to click. Land them back on the
    // Ledger rather than on a bare Supabase page.
    { emailRedirectTo: `${window.location.origin}/ledger` }
  );
  if (error) {
    console.warn('Email link failed:', error.message);
    return false;
  }
  return true;
}
