import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844} });
const p = await ctx.newPage();
await p.goto('https://www.sovrn.online', { waitUntil:'networkidle' });
await p.getByRole('button', { name:/begin your blueprint/i }).first().click();
await p.waitForTimeout(500);
await p.getByRole('button', { name:/i create my fate/i }).click();
const A=['Probe','1990-04-05','08:30','Detroit, United States','That I am found out.',
  'To ship the thing under my own name.','I rebuild instead of sending.','elijahpitts+sparkprobe@gmail.com'];
for (let i=0;i<8;i++){
  await p.waitForTimeout(420);
  await p.locator('input:visible, textarea:visible').first().fill(A[i]);
  if(i===3){await p.waitForTimeout(1100);const o=p.locator('[role=option], li').first();if(await o.count())await o.click().catch(()=>{});}
  if(i===7){const c=p.locator('#sv-consent');if(await c.count())await c.check({force:true});}
  await p.getByRole('button', { name:/continue|reveal|blueprint|next/i }).first().click();
}
await p.getByRole('button', { name:/who you are/i }).first().waitFor({ timeout:240000 });
await p.waitForTimeout(2500);
await p.locator('textarea').first().fill('Publish the thing under my own name');
await p.getByRole('button', { name:/^next$/i }).click();
await p.waitForTimeout(400);
await p.locator('textarea').first().fill('Six years behind a pseudonym and it is costing me work.');
await p.getByRole('button', { name:/set the target/i }).click();
await p.getByRole('button', { name:/that's it/i }).waitFor({ timeout:120000 });
await p.getByRole('button', { name:/that's it/i }).click();
await p.waitForTimeout(3000);

const card = p.getByRole('button', { name:/the hard one/i }).first();
await card.waitFor({ timeout:20000 });

// Record every class change and every animation frame's dash offset, in-page.
await card.evaluate((el) => {
  const w = window;
  w.__spark = { classEvents: [], frames: [], t0: 0 };
  new MutationObserver(() => {
    w.__spark.classEvents.push({
      t: performance.now() - w.__spark.t0,
      flash: el.classList.contains('sv-commit-flash'),
      bg: getComputedStyle(el).backgroundColor,
    });
  }).observe(el, { attributes: true, attributeFilter: ['class'] });

  const rect = el.querySelector('rect');
  const tick = () => {
    if (rect) w.__spark.frames.push({
      t: performance.now() - w.__spark.t0,
      off: parseFloat(getComputedStyle(rect).strokeDashoffset) || 0,
      op: Number(getComputedStyle(rect).opacity),
    });
    if (performance.now() - w.__spark.t0 < 900) requestAnimationFrame(tick);
  };
  el.addEventListener('click', () => { w.__spark.t0 = performance.now(); requestAnimationFrame(tick); }, { once: true, capture: true });
});

await card.click();
await p.waitForTimeout(1600);
const spark = await p.evaluate(() => window.__spark);

console.log('  class changes:');
for (const e of spark.classEvents) console.log(`    ${e.t.toFixed(0).padStart(4)}ms  flash=${e.flash}  bg=${e.bg}`);
const on = spark.classEvents.find(e => e.flash);
const off = spark.classEvents.find(e => !e.flash && e.t > 0);
const drawn = spark.frames.filter(f => f.op > 0.5);
const first = drawn[0], last = drawn[drawn.length-1];
console.log('');
console.log(`  trace drawn over        ${first ? first.t.toFixed(0) : '?'}ms → ${last ? last.t.toFixed(0) : '?'}ms  (${drawn.length} frames)`);
console.log(`  dash offset             ${first ? first.off.toFixed(0) : '?'} → ${last ? last.off.toFixed(0) : '?'}`);
console.log(`  flash on at             ${on ? on.t.toFixed(0) + 'ms  ' + on.bg : 'NEVER'}`);
console.log(`  flash off at            ${off ? off.t.toFixed(0) + 'ms' : 'NEVER'}`);
console.log(`  flash duration          ${on && off ? (off.t - on.t).toFixed(0) + 'ms' : '—'}`);
await b.close();
