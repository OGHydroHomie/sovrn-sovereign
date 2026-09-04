import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
  maxDuration: 300,
};

/**
 * The 6am send.
 *
 * For everyone with a day on the record — open or completed — generate the next
 * day from what they actually did, write it to ledger_entries, and email them a
 * magic link straight to it.
 *
 * Runs with SUPABASE_SECRET_KEY: it reads across users and writes entries on
 * their behalf, which is not reachable from the browser and must not be.
 *
 * Scheduled by vercel.json every 15 minutes. Each run sends only to the people
 * for whom it is 6am where they are, so the tick count is high and the send
 * count per tick is usually zero.
 *
 * Vercel sends CRON_SECRET as a bearer token on scheduled invocations; the
 * endpoint refuses anything else so it cannot be triggered by a stranger with
 * the URL.
 */

/* onboarding@resend.dev is Resend's shared sender. It only delivers to the
   address on the Resend account, which makes it right for a first end-to-end
   test and useless for launch — every other recipient fails silently. Set
   MORNING_FROM to an address on a verified domain before any real send.
   hello@sovrn.app was the previous default and does not exist in the account at
   all, so every send would have failed on an unverified sender. */
const FROM = process.env.MORNING_FROM ?? 'SOVRN <onboarding@resend.dev>';
const SITE = process.env.SITE_URL ?? 'https://sovrn-sovereign.vercel.app';

/* 6am in the recipient's own morning, not 6am UTC.

   The cron ticks every 15 minutes and each run sends only to the people whose
   local clock has just turned 6. A Ledger in Chicago and a Ledger in Delhi both
   arrive at 6am rather than at whatever hour 6am UTC happens to be where the
   person actually lives.

   Every current UTC offset is a whole multiple of 15 minutes — including the
   :30 and :45 zones, India, Nepal, Chatham — so every zone lands on a tick. An
   hourly schedule would silently never fire for any of them.

   The window is the full quarter hour rather than the instant, because a
   scheduled invocation is not guaranteed to fire on the second. If drift puts
   two ticks inside one window, the day_number check further down is what stops
   the second one from sending anything. */
const SEND_HOUR = 6;
const WINDOW_MINUTES = 15;

/** Wall-clock hour and minute in a zone, or null if the zone is unusable. */
function localClock(timezone: string, at: Date): { hour: number; minute: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
    }).formatToParts(at);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { hour, minute };
  } catch {
    return null;
  }
}

/* A missing or unrecognised zone falls back to UTC rather than being dropped.
   Everyone who signed up before the timezone column existed is in that bucket,
   and mail at the wrong hour is a smaller failure than no mail at all. */
export function isDue(timezone: string | null | undefined, at: Date): boolean {
  const clock = (timezone ? localClock(timezone, at) : null)
    ?? { hour: at.getUTCHours(), minute: at.getUTCMinutes() };
  return clock.hour === SEND_HOUR && clock.minute < WINDOW_MINUTES;
}

interface Entry {
  id: string;
  user_id: string;
  day_number: number;
  mission_text: string;
  committed_at: string;
  completed_at: string | null;
  what_happened: string | null;
}

/* Model-written text goes into an HTML document, so it gets escaped. An
   ampersand in someone's declaration would otherwise open an entity and eat the
   next few characters of their own line. */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Plain text on paper. No images, no columns, no tracking pixel — this is one
   line, one mission, one link, and it should look the same in every client. */
export function emailHtml(declaration: string, read: string, mission: string, link: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#FBFAF7;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;font-family:Geist,Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1A1A;">
    <div style="font-size:13px;letter-spacing:0.22em;font-weight:700;color:#1A1A1A;">SOVRN</div>
    <div style="height:1px;background:#E4E0D6;margin:14px 0 32px;"></div>
    ${declaration ? `<p style="margin:0 0 22px;font-size:17px;line-height:1.55;font-weight:400;color:#1A1A1A;">${esc(declaration)}</p>` : ''}
    ${read ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.65;font-weight:300;color:#6E6A66;">${esc(read)}</p>` : ''}
    <p style="margin:0;font-size:19px;line-height:1.5;font-weight:400;color:#1A1A1A;">${esc(mission)}</p>
    <a href="${link}" style="display:inline-block;margin-top:32px;padding:16px 28px;background:#000000;color:#FBFAF7;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:2px;">Open your Ledger</a>
    <div style="height:1px;background:#E4E0D6;margin:40px 0 16px;"></div>
    <p style="margin:0;font-size:12px;color:#9A9A9A;">
      <a href="${SITE}/privacy" style="color:#6E6A66;">Privacy</a> ·
      <a href="${SITE}/delete" style="color:#6E6A66;">Delete my data</a>
    </p>
  </div></body></html>`;
}

export function emailText(declaration: string, read: string, mission: string, link: string): string {
  return `${declaration ? declaration + '\n\n' : ''}${read ? read + '\n\n' : ''}${mission}\n\nOpen your Ledger: ${link}\n\n—\n${SITE}/delete to remove everything.`;
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  // NOTE: without RESEND_API_KEY set in Vercel this is the only thing that stops.
  // Generation and the ledger write above have already happened, so the day is
  // ready and waiting the next time they open the app.
  if (!key) return { sent: false, reason: 'RESEND_API_KEY not set' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!res.ok) return { sent: false, reason: `resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return { sent: true, reason: '' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Fail closed. This endpoint spends model tokens, writes entries on people's
  // behalf, and sends mail, so an absent CRON_SECRET must refuse rather than
  // wave everyone through — the permissive version answered 200 to an
  // unauthenticated POST in production.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization ?? '';
  if (!secret) {
    console.error('[morning] refused: CRON_SECRET is not configured');
    return res.status(503).json({ error: 'Scheduler not configured' });
  }
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Server configuration error' });

  /* Read-only config check. Reports what this build actually resolved, so a
     misconfigured sender or site URL is caught before 6am rather than by a
     morning of failed sends. Presence only for anything secret — never a value.
     Generates nothing, writes nothing, sends nothing. */
  if (req.query.dry === '1') {
    return res.status(200).json({
      dry: true,
      from: FROM,
      site: SITE,
      resendKeyPresent: Boolean(process.env.RESEND_API_KEY),
      supabaseUrlHost: new URL(url).host,
      morningFromIsExplicit: Boolean(process.env.MORNING_FROM),
      siteUrlIsExplicit: Boolean(process.env.SITE_URL),
      sendHour: SEND_HOUR,
      windowMinutes: WINDOW_MINUTES,
    });
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const report = { due: 0, considered: 0, generated: 0, sent: 0, skipped: [] as string[] };

  /* force=1 ignores the 6am window. The endpoint is otherwise unrunnable by hand
     outside a 15-minute slice of the day, which makes it untestable; the bearer
     token above is still required either way. The schedule never sets it. */
  const force = req.query.force === '1';
  const now = new Date();

  const { data: zoneRows, error: zoneErr } = await admin.from('users').select('id, timezone');
  if (zoneErr) return res.status(500).json({ error: zoneErr.message });

  const dueIds = ((zoneRows ?? []) as { id: string; timezone: string | null }[])
    .filter((row) => force || isDue(row.timezone, now))
    .map((row) => row.id);
  report.due = dueIds.length;

  // Most of the 96 daily ticks are nobody's morning, and cost exactly the one
  // query above.
  if (!dueIds.length) {
    console.log('[morning]', JSON.stringify(report));
    return res.status(200).json(report);
  }

  /* Their most recent day is what today reads. Filtering by id keeps this to the
     people actually being written to — it does put the due list in the query
     string, so this wants to become a server-side filter before any single zone
     holds more users than a URL can carry. */
  const { data: entries, error } = await admin
    .from('ledger_entries')
    .select('id, user_id, day_number, mission_text, committed_at, completed_at, what_happened')
    .in('user_id', dueIds)
    .order('day_number', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const latest = new Map<string, Entry>();
  for (const e of (entries ?? []) as Entry[]) if (!latest.has(e.user_id)) latest.set(e.user_id, e);

  for (const [uid, previous] of latest) {
    report.considered += 1;

    const { data: userRow } = await admin
      .from('users').select('archetype, blueprint_json, timezone, declaration_line').eq('id', uid).maybeSingle();
    const row = userRow as {
      archetype?: string; blueprint_json?: unknown;
      timezone?: string | null; declaration_line?: string | null;
    } | null;
    const bp = (row?.blueprint_json ?? {}) as {
      becoming?: string; loop?: string; acts?: { hard?: string; next?: string }; chosen?: string;
    };

    const { data: authUser } = await admin.auth.admin.getUserById(uid);
    const address = authUser?.user?.email;
    if (!address) { report.skipped.push(`${uid}: no confirmed email on the account`); continue; }

    const nextDay = previous.day_number + 1;
    const { data: exists } = await admin
      .from('ledger_entries').select('id').eq('user_id', uid).eq('day_number', nextDay).maybeSingle();
    if (exists) { report.skipped.push(`${uid}: day ${nextDay} already exists`); continue; }

    const genRes = await fetch(`${SITE}/api/day2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayNumber: nextDay,
        becoming: bp.becoming ?? row?.archetype ?? 'THE HEADLINER',
        loop: bp.loop ?? 'Opening Act',
        previous,
        // Without this the model renders UTC and tells someone in Detroit they
        // committed at 3am when their own Ledger says 10:06 PM.
        timezone: row?.timezone ?? null,
        notChosen: bp.chosen === 'hard' ? bp.acts?.next : bp.acts?.hard,
      }),
    });
    if (!genRes.ok) { report.skipped.push(`${uid}: generation ${genRes.status}`); continue; }
    const day = await genRes.json();
    report.generated += 1;

    // THE HARD ONE is the one that ships. The second option is a choice the app
    // offers; an email is one line and one act.
    const { error: insErr } = await admin.from('ledger_entries').insert({
      user_id: uid, day_number: nextDay, mission_text: day.hard,
      committed_at: new Date().toISOString(),
      // The read is the app noticing what they did. It used to exist only in
      // this email and was thrown away afterwards; it now travels with the day
      // so the Ledger can lead with it.
      read_line: (day.read ?? '').trim() || null,
    });
    if (insErr) { report.skipped.push(`${uid}: insert ${insErr.message}`); continue; }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink', email: address,
      options: { redirectTo: `${SITE}/ledger` },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      report.skipped.push(`${uid}: link ${linkErr?.message ?? 'no action_link'}`);
      continue;
    }
    const link = linkData.properties.action_link;

    /* Their own declaration opens the email, above the read. It is the line they
       wrote themselves into on day one, and it is the reason the act underneath
       it is theirs rather than an instruction from an app. */
    const declaration = (row?.declaration_line ?? '').trim();
    const out = await sendViaResend(
      address,
      `Day ${nextDay}`,
      emailHtml(declaration, day.read ?? '', day.hard, link),
      emailText(declaration, day.read ?? '', day.hard, link)
    );
    if (out.sent) report.sent += 1;
    else report.skipped.push(`${uid}: ${out.reason}`);
  }

  console.log('[morning]', JSON.stringify(report));
  return res.status(200).json(report);
}
