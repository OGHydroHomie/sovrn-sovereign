import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * /wall — the public page.
 *
 * Server-rendered HTML, cached at the edge, readable with JavaScript turned off.
 * This is the most linkable thing the product has, so it is a document rather
 * than an application: no bundle to download before anything appears, nothing
 * that needs an account, nothing that waits on a round trip after paint.
 *
 * Nobody can be identified or contacted from this page. There are no names, no
 * avatars, no handles, no per-person counts, no likes, no comments and no
 * ranking. What is shown is the stripped version of an act — written once at
 * commit, with every identifying thing already removed — and whether it was done.
 *
 * A miss renders exactly like a crossing: same type, same colour, same place in
 * the order. Sorting the misses to the bottom, or greying them, would make this
 * a scoreboard, and the whole claim of the page is that it is not one.
 */

export const config = { runtime: 'nodejs' };

const PAPER = '#FBFAF7';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/**
 * The viewer's day.
 *
 * Vercel puts the requester's timezone on the request, which means the local day
 * can be worked out on the server and the first paint is already right — no
 * script, no correction after the fact, no flash of a different number. Where
 * the header is absent the day is UTC, which is the honest fallback and what the
 * spec asks for.
 */
function viewerDay(req: VercelRequest): { from: Date; to: Date; zone: string } {
  const zone = (req.headers['x-vercel-ip-timezone'] as string) || 'UTC';
  const now = new Date();
  let offsetMs = 0;
  try {
    /* What the wall clock says there, minus what it says in UTC. */
    const there = new Date(now.toLocaleString('en-US', { timeZone: zone }));
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    offsetMs = there.getTime() - utc.getTime();
  } catch {
    offsetMs = 0;
  }
  const local = new Date(now.getTime() + offsetMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return {
    from: new Date(startLocal - offsetMs),
    to: new Date(startLocal - offsetMs + 24 * 60 * 60 * 1000),
    zone: offsetMs === 0 && zone === 'UTC' ? 'UTC' : zone,
  };
}

function clockTime(iso: string, zone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone,
    }).format(new Date(iso)).replace(' ', '').toLowerCase();
  } catch {
    return '';
  }
}

/* A deterministic short key per row.
 *
 * The only thing on this page a person can use to find themselves. It is a hash
 * of the entry id, so it says nothing to anyone who does not already hold that
 * id — which is only ever the person whose act it is. No account is needed to
 * read the page and none is consulted to render it; the marking happens in the
 * viewer's own browser, against their own ledger, or not at all. */
function ownerKey(id: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < id.length; i++) {
    h1 = Math.imul(h1 ^ id.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + id.charCodeAt(i) * (i + 1), 2246822519) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).slice(0, 10);
}

/* The field, drawn once on the server.
 *
 * The same near-black ground as every other screen, at the density the door
 * hands over on. It is inline SVG rather than the canvas the app uses because
 * the canvas needs JavaScript, and this page has to be dark on the first paint
 * whether or not any arrives. Deterministic, so the edge cache does not serve a
 * different sky to every reader. */
function starfield(): string {
  const stars: string[] = [];
  let seed = 0x2f6e2b1;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let i = 0; i < 300; i++) {
    const x = rnd() * 100;
    const y = rnd() * 100;
    /* Out of the column the words are in. Everywhere else in this product the
       field is held off the type, and a page that is almost entirely type needs
       that more, not less: at full density the counter read through a screen of
       dots. They live in the margins, and on a narrow screen that means very few
       of them, which is correct — the reading matters more than the sky. */
    if (x > 6 && x < 94) continue;
    const dim = rnd() > 0.6;
    stars.push(`<rect x="${x.toFixed(2)}%" y="${y.toFixed(2)}%" width="2" height="2" fill="${PAPER}" opacity="${dim ? 0.22 : 0.5}"/>`);
  }
  return `<svg class="sky" aria-hidden="true" preserveAspectRatio="none">${stars.join('')}</svg>`;
}

interface Row {
  id: string;
  committed_at: string;
  completed_at: string | null;
  filed_at: string | null;
  what_happened: string | null;
  day_number: number;
  public_act: string;
}

function line(row: Row, zone: string): string {
  const committed = clockTime(row.committed_at, zone);
  /* Three states, one shape. Done carries the time it was done; a miss carries
     the day it was; an act still open says nothing, because nothing has
     happened to it yet. */
  const state = row.completed_at
    ? `<span class="state">done &middot; ${esc(clockTime(row.completed_at, zone))}</span>`
    : row.filed_at
      ? `<span class="state">not done &middot; day ${row.day_number}</span>`
      : '<span class="state"></span>';
  return `<li data-k="${ownerKey(row.id)}">
    <span class="when">committed ${esc(committed)}</span>
    <span class="act">${esc(row.public_act)}</span>
    ${state}
  </li>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  const { from, to, zone } = viewerDay(req);
  let committed = 0;
  let did = 0;
  let rows: Row[] = [];

  if (url && key) {
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const [countRes, doneRes, feedRes] = await Promise.all([
      admin.from('ledger_entries').select('id', { count: 'exact', head: true })
        .gte('committed_at', from.toISOString()).lt('committed_at', to.toISOString()),
      admin.from('ledger_entries').select('id', { count: 'exact', head: true })
        .gte('committed_at', from.toISOString()).lt('committed_at', to.toISOString())
        .not('completed_at', 'is', null),
      admin.from('ledger_entries')
        .select('id, committed_at, completed_at, filed_at, what_happened, day_number, public_act')
        .not('public_act', 'is', null)
        .order('committed_at', { ascending: false })
        .limit(120),
    ]);
    committed = countRes.count ?? 0;
    did = doneRes.count ?? 0;
    rows = (feedRes.data ?? []) as Row[];
  }

  const people = committed === 1 ? '1 person committed today.' : `${committed.toLocaleString('en-US')} people committed today.`;
  const didLine = `${did.toLocaleString('en-US')} did it.`;

  /* The same two numbers, as data, for the front page's counter.
     One source: the marketing site says what the wall says because it asks the
     wall, and a second query somewhere else would eventually disagree with this
     one on a day boundary and nobody would notice for a month. Same viewer-day
     logic, same cache, same Vary. */
  if (req.query.format === 'json') {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.setHeader('Vary', 'x-vercel-ip-timezone');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify({ committed, did, people, did_line: didLine }));
  }

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Wall &middot; SOVRN</title>
<meta name="description" content="What people committed to today, and whether they did it.">
<meta property="og:title" content="The Wall &middot; SOVRN">
<meta property="og:description" content="${esc(people)} ${esc(didLine)}">
<link rel="icon" href="/favicon.svg">
<style>
  :root { --paper: ${PAPER}; --mute: rgba(251,250,247,0.62); --faint: rgba(251,250,247,0.42); }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #000; }
  body {
    color: var(--paper); min-height: 100svh;
    font-family: Geist, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 300; -webkit-font-smoothing: antialiased;
  }
  .sky { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
  .wrap { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; padding: 56px 22px 96px; }
  .mark { font-size: 11px; font-weight: 700; letter-spacing: 0.22em; color: var(--mute); }
  h1 {
    margin: 44px 0 0; font-weight: 300; letter-spacing: -0.015em;
    font-size: clamp(30px, 8vw, 44px); line-height: 1.15; text-wrap: balance;
  }
  h1 .did { display: block; color: var(--mute); }
  .rule { height: 1px; background: rgba(251,250,247,0.16); margin: 40px 0 8px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li {
    display: grid; grid-template-columns: 1fr; gap: 3px;
    padding: 17px 0 17px 14px; border-bottom: 1px solid rgba(251,250,247,0.10);
    border-left: 1px solid transparent;
  }
  .when { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); }
  .act { font-size: 17px; line-height: 1.45; }
  .state { font-size: 12px; letter-spacing: 0.06em; color: var(--mute); min-height: 1px; }
  /* Yours. A rule at the edge and nothing else — it means something only to
     someone who already knows which line is theirs. */
  li.mine { border-left-color: rgba(251,250,247,0.55); }
  .foot { margin-top: 44px; font-size: 12px; line-height: 1.7; color: var(--faint); }
  .foot a { color: var(--mute); }
  @media (min-width: 560px) {
    li { grid-template-columns: 132px 1fr auto; align-items: baseline; gap: 16px; }
    .state { text-align: right; }
  }
</style>
</head><body>
${starfield()}
<div class="wrap">
  <div class="mark">SOVRN</div>
  <h1>${esc(people)}<span class="did">${esc(didLine)}</span></h1>
  <div class="rule"></div>
  <ul>
${rows.map((r) => line(r, zone)).join('\n')}
  </ul>
  <p class="foot">
    Acts are published with every identifying detail removed, and only when they
    can be. No names, no accounts, nobody to contact.
    <a href="/">SOVRN</a>
  </p>
</div>
<script>
/* The only script on the page, and everything above it is already readable
   without it. It marks the viewer's own lines, in their own browser, by hashing
   the entry ids their ledger already holds and matching the keys rendered here.
   Nothing is sent anywhere and nobody else's row can be identified this way. */
(function () {
  try {
    var raw = localStorage.getItem('sovrn_wall_mine');
    if (!raw) return;
    var mine = JSON.parse(raw);
    if (!Array.isArray(mine)) return;
    var want = Object.create(null);
    for (var i = 0; i < mine.length; i++) want[mine[i]] = 1;
    var rows = document.querySelectorAll('li[data-k]');
    for (var j = 0; j < rows.length; j++) {
      if (want[rows[j].getAttribute('data-k')]) rows[j].className = 'mine';
    }
  } catch (e) { /* nothing to mark */ }
})();
</script>
</body></html>`;

  /* Cached at the edge, and revalidated behind whoever asks first. The numbers
     are a day's worth of activity and do not need to be to the second; a page
     that recomputes per visitor is a page that falls over the day it is linked
     somewhere large. Varying on the timezone header keeps one region's "today"
     out of another's cache. */
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  res.setHeader('Vary', 'x-vercel-ip-timezone');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(200).send(html);
}
