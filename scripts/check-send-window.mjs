/* isDue, from the real module.
 *
 * Bundled out of api/morning.ts and imported — not retyped here. A copy of the
 * rule in the harness would only ever prove the copy is fine.
 *
 * The front page tells a stranger "tomorrow at six". This is the check that the
 * six is theirs: every zone fires on its own morning, and none of them fire on
 * Central's. Also the window edges, a DST crossing, and the no-timezone
 * fallback.
 *
 *   node scripts/check-send-window.mjs
 */
import { bundled, SERVERLESS } from './lib/bundle.mjs';

const { isDue } = await bundled('api/morning.ts', { external: SERVERLESS });

const SEND_HOUR = 6;
let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

/* The instant at which it is exactly HH:MM in `tz`, on a fixed date. Built by
   search rather than arithmetic so DST is whatever the zone says it is. */
function instantAt(tz, y, m, d, hh, mm) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  for (let guess = -14; guess <= 14; guess += 0.25) {
    const t = new Date(Date.UTC(y, m - 1, d, hh, mm) - guess * 3600_000);
    const p = Object.fromEntries(fmt.formatToParts(t).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    if (+p.year === y && +p.month === m && +p.day === d && +p.hour === hh && +p.minute === mm) return t;
  }
  return null;
}

const ZONES = [
  ['America/Chicago',    'Central, the one it was built in'],
  ['Europe/Berlin',      'CEST, +7 from Central'],
  ['Asia/Tokyo',         'JST, +15, no DST'],
  ['Australia/Sydney',   'AEST, across the date line'],
  ['America/Los_Angeles','Pacific, -2'],
  ['Asia/Kolkata',       'IST, a half-hour offset'],
  ['Pacific/Chatham',    'a 45-minute offset'],
];

console.log('\n  Does 6am fire at their six?\n');
for (const [tz, note] of ZONES) {
  const at6 = instantAt(tz, 2026, 9, 18, SEND_HOUR, 2);
  check(`${tz} fires at its own 06:02`, at6 !== null && isDue(tz, at6), note);
}

console.log('\n  And does it stay silent at everyone else\'s six?\n');
const chicago6 = instantAt('America/Chicago', 2026, 9, 18, SEND_HOUR, 2);
for (const [tz] of ZONES.filter(([z]) => z !== 'America/Chicago')) {
  check(`${tz} does NOT fire at Central 06:02`, !isDue(tz, chicago6),
    `their local hour is ${new Intl.DateTimeFormat('en-US',{timeZone:tz,hour12:false,hour:'2-digit'}).format(chicago6)}`);
}

console.log('\n  The window, and the edges.\n');
const berlin = (hh, mm) => instantAt('Europe/Berlin', 2026, 9, 18, hh, mm);
check('opens at 06:00',        isDue('Europe/Berlin', berlin(6, 0)));
check('still open at 06:14',   isDue('Europe/Berlin', berlin(6, 14)));
check('shut at 06:15',        !isDue('Europe/Berlin', berlin(6, 15)));
check('shut at 05:59',        !isDue('Europe/Berlin', berlin(5, 59)));

console.log('\n  Across a DST boundary (Berlin falls back 2026-10-25).\n');
check('fires the morning before the change', isDue('Europe/Berlin', instantAt('Europe/Berlin', 2026, 10, 24, 6, 2)));
check('fires the morning of the change',     isDue('Europe/Berlin', instantAt('Europe/Berlin', 2026, 10, 25, 6, 2)));
check('fires the morning after the change',  isDue('Europe/Berlin', instantAt('Europe/Berlin', 2026, 10, 26, 6, 2)));

console.log('\n  With no stored timezone it falls back to UTC.\n');
check('null timezone fires at 06:02 UTC', isDue(null, new Date(Date.UTC(2026, 8, 18, 6, 2))));
check('and not at 13:02 UTC',            !isDue(null, new Date(Date.UTC(2026, 8, 18, 13, 2))));

console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
