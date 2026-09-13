/**
 * What the generated steps actually cost, on production.
 *
 * Two checks have now died four times waiting on the narrowing and on the acts,
 * with no runtime error either time — which means the question is not "did it
 * throw" but "how long does it take, and how wide is the spread". A mean is not
 * the useful number here; the tail is, because the tail is what a timeout hits.
 *
 *   node scripts/time-endpoints.mjs [runs]
 */
import { readFile, unlink } from 'node:fs/promises';
import { probe, stateFile } from './lib/probe.mjs';

const URL_ = process.env.SOVRN_URL ?? 'https://www.sovrn.online';
const RUNS = Number(process.argv[2] ?? 5);

const ms = (t) => `${Math.round(t)}ms`;
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return {
    min: s[0], max: s.at(-1),
    median: s[Math.floor(s.length / 2)],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
  };
};

await probe({ url: URL_, name: 'timing' }, async ({ page, url }) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  const token = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('sovrn_auth')).access_token);

  const time = async (label, body) => {
    const t0 = performance.now();
    const res = await page.request.post(`${url}/api/cycle`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: body, timeout: 300000,
    });
    const dt = performance.now() - t0;
    let out = null;
    try { out = await res.json(); } catch { /* not json */ }
    return { label, dt, status: res.status(), out };
  };

  /* Concurrently, because the four real failures were all on runs started back
     to back, and a check that only ever waits for success cannot tell a slow
     call from a failed one. */
  if (process.env.CONCURRENT) {
    console.log(`\n  /api/cycle  action=admit   — ${RUNS} at once`);
    const t0 = performance.now();
    const all = await Promise.all(Array.from({ length: RUNS }, () => time('admit', {
      action: 'admit',
      target: 'Leave my job and start a business',
      cost: 'I am forty-one and I keep saying next year. My kids will remember me as someone who talked about it.',
    })));
    for (const [i, r] of all.entries()) {
      console.log(`    ${String(i + 1).padStart(2)}  ${String(ms(r.dt)).padStart(8)}  HTTP ${r.status}` +
        `  ${r.status === 200 ? 'ok' : JSON.stringify(r.out)}`);
    }
    console.log(`    wall clock ${ms(performance.now() - t0)}; ${all.filter((r) => r.status !== 200).length} of ${RUNS} did not return 200`);
    return;
  }

  /* admit -> open, the two steps a person actually takes, in order. `open`
     writes a cycle, so this runs on a throwaway account the probe deletes. */
  if (process.env.OPEN) {
    console.log(`\n  /api/cycle  admit then open`);
    const a = await time('admit', {
      action: 'admit',
      target: 'Leave my job and start a business',
      cost: 'I am forty-one and I keep saying next year. My kids will remember me as someone who talked about it.',
    });
    console.log(`    admit  ${String(ms(a.dt)).padStart(8)}  HTTP ${a.status}`);
    if (a.status !== 200) { console.log(`      ${JSON.stringify(a.out)}`); return; }
    for (let i = 0; i < RUNS; i++) {
      const o = await time('open', {
        action: 'open',
        target_stated: 'Leave my job and start a business',
        target_admitted: a.out.admitted,
        rubric: a.out.rubric,
        cost: 'I am forty-one and I keep saying next year.',
      });
      console.log(`    open   ${String(ms(o.dt)).padStart(8)}  HTTP ${o.status}  ${JSON.stringify(o.out).slice(0, 110)}`);
    }
    return;
  }

  console.log(`\n  /api/cycle  action=admit   — the narrowing, ${RUNS} runs`);
  const admits = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await time('admit', {
      action: 'admit',
      target: 'Leave my job and start a business',
      cost: 'I am forty-one and I keep saying next year. My kids will remember me as someone who talked about it.',
    });
    admits.push(r.dt);
    console.log(`    ${String(i + 1).padStart(2)}  ${String(ms(r.dt)).padStart(8)}  HTTP ${r.status}` +
      `  ${r.out?.rubric ? `"${String(r.out.rubric).slice(0, 52)}…"` : JSON.stringify(r.out)?.slice(0, 60)}`);
  }
  const a = stats(admits);
  console.log(`    min ${ms(a.min)}  median ${ms(a.median)}  mean ${ms(a.mean)}  max ${ms(a.max)}`);
  console.log(`    the check gave this 120000ms; the worst seen here is ${ms(a.max)}`);
});

await unlink(stateFile('timing')).catch(() => {});
