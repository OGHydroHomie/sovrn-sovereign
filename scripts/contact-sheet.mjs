/**
 * A contact sheet from a filmstrip.
 *
 * Every animation in this product is checked by cutting frames from a clock
 * started at the gesture and then looking at them side by side — a sequence is
 * about what happens relative to what, and a single screenshot cannot show that.
 * Drawn in a browser because that is the image decoder this machine has.
 *
 *   node scripts/contact-sheet.mjs <dir-of-pngs> <out.png>
 */
import { chromium } from 'playwright';
import { readdir, readFile } from 'node:fs/promises';
const dir = process.argv[2], out = process.argv[3];
const names = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();
const frames = [];
for (const n of names) frames.push({ label: n.replace('.png', ''), b64: (await readFile(`${dir}/${n}`)).toString('base64') });

const cols = 6, w = 188, gap = 8, labelH = 18;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: cols * (w + gap) + gap, height: 200 } });
await page.setContent(`<body style="margin:0;background:#111;font:11px ui-monospace,Menlo,monospace;color:#bbb">
<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:${gap}px;padding:${gap}px">
${frames.map((f) => `<div><img src="data:image/png;base64,${f.b64}" style="width:${w}px;display:block;border:1px solid #333"><div style="height:${labelH}px;line-height:${labelH}px">${f.label}</div></div>`).join('')}
</div></body>`);
await page.waitForTimeout(400);
const el = await page.locator('div').first();
await el.screenshot({ path: out });
await browser.close();
console.log(out);
