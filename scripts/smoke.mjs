#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Hits the DEPLOYED /api/generate with a real payload and checks that a
 * parseable blueprint comes back. This exists because on 2026-09-03 the
 * endpoint was dead for three hours behind an ESM import error while every
 * other check passed: tsc --noEmit passes (moduleResolution bundler allows
 * extensionless relative imports), `npm run build` passes (Vite only builds
 * src/, never api/), and the local safety harness passed because it ran on a
 * copy with the import rewritten. Nothing that runs on a laptop can catch a
 * function that only fails once it is deployed.
 *
 *   npm run smoke                      # production
 *   npm run smoke -- --url <origin>    # a preview deployment
 *   npm run smoke -- --retries 40      # wait longer for a deploy to land
 */

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const ORIGIN = (flag('url', 'https://sovrn-sovereign.vercel.app')).replace(/\/+$/, '');
const RETRIES = Number(flag('retries', '20'));
const DELAY_MS = 15_000;

const PAYLOAD = {
  name: 'Smoke',
  birthDate: '1990-04-05',
  birthTime: '08:30',
  birthTimeUnknown: false,
  birthPlace: 'Detroit, USA',
  email: 'smoke@example.com',
  deepestFear:
    'That if I actually put the work out, people will find out I am not as good as they assumed.',
  desiredReality:
    'The work is out in the world under my own name and I am not apologising for it.',
  repeatingPattern:
    'I finish it, decide it needs one more pass, and start again. Fourteen months of almost.',
  chartData: [
    '=== CALCULATED BIRTH CHART ===',
    'Zodiac: Tropical | Houses: Whole Sign',
    'Houses verified: YES',
    'Birth time known: YES',
    '',
    'Sun: Aries 14.7° — House 1',
    'Moon: Pisces 3.1° — House 12',
    'Mars: Virgo 22.8° — House 6',
    'Saturn: Scorpio 19.3° — House 8',
    '',
    'North Node: Gemini 4.6°',
    'South Node: Sagittarius 4.6°',
    '',
    'ASCENDANT (Rising Sign): Aries 8.2°',
    'MIDHEAVEN (MC): Capricorn 14.0°',
    '',
    'Dominant Element: Fire',
    'Dominant Modality: Cardinal',
    '',
    'Sun square Saturn (orb: 6.9°)',
  ].join('\n'),
};

/* The vocabulary the reading is not allowed to use. Kept deliberately narrow —
   this is a smoke test, not the full compliance sweep. */
const LEAKS = [
  /\d+(\.\d+)?\s*°/,
  /\bHouse\s+\d+/i,
  /\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/,
  /\b(Mercury|Venus|Saturn|Jupiter|Ascendant|Midheaven|North Node|South Node)\b/,
  /\bchart\b/i,
];

const fail = (msg) => {
  console.error(`\nSMOKE FAILED: ${msg}`);
  process.exit(1);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`smoke: POST ${ORIGIN}/api/generate`);

let res;
let body;
for (let attempt = 1; attempt <= RETRIES; attempt++) {
  try {
    res = await fetch(`${ORIGIN}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PAYLOAD),
    });
    body = await res.text();
  } catch (err) {
    console.log(`  attempt ${attempt}: network error (${err.message})`);
    await sleep(DELAY_MS);
    continue;
  }
  if (res.status === 200) break;
  // A fresh deploy can serve the previous build, or 404 while it propagates.
  console.log(`  attempt ${attempt}: HTTP ${res.status}`);
  if (attempt === RETRIES) fail(`never returned 200. Last body: ${body.slice(0, 400)}`);
  await sleep(DELAY_MS);
}

let text;
try {
  const json = JSON.parse(body);
  if (json.error) fail(`endpoint returned an error: ${json.error}`);
  text = json.text;
} catch {
  fail(`response was not JSON: ${body.slice(0, 400)}`);
}
if (!text || typeof text !== 'string') fail('response had no text');

const lines = text.split('\n').filter((l) => l.trim());
const becoming = lines[0] ?? '';
const loop = (text.match(/right now you'?re the\s+(.+?)\.?$/im) ?? [])[1] ?? '';
const words = text.trim().split(/\s+/).length;

const problems = [];
if (!/^[A-Z][A-Z\s]+$/.test(becoming)) problems.push(`first line is not a becoming name: ${JSON.stringify(becoming)}`);
if (!loop) problems.push('no "Right now you\'re the ..." loop line');
for (const section of ['WHO YOU ARE', 'THE PATTERN', 'ONE ACT']) {
  if (!text.includes(section)) problems.push(`missing section: ${section}`);
}
const acts = {};
for (const [key, label] of [['hard', 'THE HARD ONE'], ['next', 'THE NEXT ONE']]) {
  const m = text.match(new RegExp(`${label}\\s*[—–-]\\s*([^\\n]+)`));
  if (!m) problems.push(`missing act: ${label}`);
  else acts[key] = m[1].trim();
}
if (words < 300 || words > 900) problems.push(`word count out of range: ${words}`);
for (const re of LEAKS) {
  const m = text.match(re);
  if (m) problems.push(`leaked vocabulary: ${JSON.stringify(m[0])}`);
}

console.log(`\n  becoming : ${becoming}`);
console.log(`  loop     : ${loop}`);
console.log(`  words    : ${words}`);
console.log(`  hard     : ${(acts.hard ?? '—').slice(0, 72)}`);
console.log(`  next     : ${(acts.next ?? '—').slice(0, 72)}`);

if (problems.length) fail(`\n  - ${problems.join('\n  - ')}`);
console.log('\nSMOKE PASSED');
