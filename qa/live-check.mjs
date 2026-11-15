// Smoke-check the deployed Varsen site at iPhone size: it loads, builds the bike, the geometry passes, no errors, and
// the bike is VISIBLE in every plate (the yellow paint counted in a screenshot of each: hero, build, In detail, Find
// yours). A blank or unpresented canvas fails: the pixels are read from the screenshot, not from the page's state.
// node qa/live-check.mjs [chrome|webkit] [url]
//   chrome: adaptive quality live, plus one forced quality step at rest (the canvas is resized and must be redrawn).
//   webkit: quality locked (?qa=1): Playwright's Windows WebKit cannot present a resized WebGL canvas at all
//           (qa/probe/resize.html reproduces it with raw WebGL), so a quality step there blanks the screenshot.
import { webkit, chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const engine = process.argv[2] || 'chrome';
const base = process.argv[3] || 'https://shockwawe10.github.io/Varsen/';
const url = engine === 'webkit' ? base + (base.includes('?') ? '&' : '?') + 'qa=1' : base;
const type = engine === 'webkit' ? webkit : chromium;
const launch = engine === 'webkit' ? {} : { channel: 'chrome', args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] };
const b = await type.launch(launch), page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const res = await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
await page.waitForFunction(() => window.__bike?.ready === true && window.__bike.sizesReady === true, null, { timeout: 90_000 });
await page.waitForTimeout(800);
const s = await page.evaluate(() => ({ geometryOK: window.__bike.geometryOK, glReady: document.documentElement.classList.contains('gl-ready'), title: document.title }));
mkdirSync('qa/results', { recursive: true });
// paint pixels (LOOK.paint #ffbe00 under the studio light) inside a plate's rectangle of a screenshot
const paint = (f, r) => Number(execFileSync('py', ['-3.11', '-W', 'ignore', '-c', `from PIL import Image
im=Image.open(r'${f}').convert('RGB');k=im.size[0]/390
box=tuple(int(v*k) for v in (${r.x},${r.y},${r.x + r.width},${r.y + r.height}))
print(sum(1 for (R,G,B) in im.crop(box).getdata() if R>170 and G>110 and B<90 and R-B>110))`]).toString());
const visible = {};
const shoot = async (name, plate) => {
  await page.evaluate(sel => { const el = document.querySelector(sel), r = el.getBoundingClientRect(); scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2); }, `[data-plate="${plate}"]`);
  await page.waitForTimeout(1200); await page.evaluate(() => window.__bike.settled());
  const f = `qa/results/live-${engine}-${name}.png`;
  await page.screenshot({ path: f });
  const r = await page.locator(`[data-plate="${plate}"]`).boundingBox();
  const vis = { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(390, r.x + r.width) - Math.max(0, r.x), height: Math.min(844, r.y + r.height) - Math.max(0, r.y) };
  visible[name] = { paintPixels: paint(f, vis), quality: await page.evaluate(() => window.__bike.quality.i) };
};
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800); await page.evaluate(() => window.__bike.settled());
{ const f = `qa/results/live-${engine}-hero.png`; await page.screenshot({ path: f }); visible.hero = { paintPixels: paint(f, await page.locator('[data-plate="front"]').boundingBox()), quality: await page.evaluate(() => window.__bike.quality.i) }; }
await shoot('build', 'build');
await shoot('detail', 'detail');
await shoot('yours', 'yours');
if (engine === 'chrome') {                           // force one adaptive step at rest: the canvas is resized and must be redrawn
  await page.evaluate(async () => { window.__bike.setQuality(1); for (let k = 0; k < 4; k++) await new Promise(r => requestAnimationFrame(r)); });
  await page.waitForTimeout(300);
  const f = 'qa/results/live-chrome-after-quality-step.png'; await page.screenshot({ path: f });
  const r = await page.locator('[data-plate="yours"]').boundingBox();
  visible.afterQualityStep = { paintPixels: paint(f, { x: 0, y: Math.max(0, r.y), width: 390, height: Math.min(844, r.y + r.height) - Math.max(0, r.y) }), quality: await page.evaluate(() => window.__bike.quality.i) };
}
const ok = res.status() === 200 && s.geometryOK && s.glReady && errors.length === 0 && Object.values(visible).every(v => v.paintPixels > 2000);
console.log(JSON.stringify({ engine, url, status: res.status(), ...s, visible, errors, ok }));
await b.close();
process.exit(ok ? 0 : 1);
