// Probe the actual middle of a reveal; reuses the isolated fixture from qa-summon.mjs.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const server = await createServer({ server: { host: '127.0.0.1', port: 5179 }, clearScreen: false });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ ...(process.platform === 'win32' ? { executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5179/.vite/summon-qa/index.html');
  await page.waitForFunction(() => window.qa?.game.scene.getScene('Summon')?.content?.fields.length > 30);
  const before = await page.evaluate(() => JSON.stringify(window.qa.gameStore.snapshot));
  await page.evaluate(() => {
    const sample = () => {
      const s = window.qa.game.scene.getScene('Summon'), all = window.qa.all();
      const g = all.find(o => o.name === 'summon.reveal.0'), p = all.find(o => o.name === 'summon.portrait.da-qiao');
      if (!p || !g || g.alpha <= .05 || g.alpha >= .95) return;
      const mask = p.mask.geometryMask;
      window.motionMiddle = { alpha: g.alpha, x: g.x, y: g.y, scaleX: g.scaleX, scaleY: g.scaleY,
        mask: { x: mask.x, y: mask.y, scaleX: mask.scaleX, scaleY: mask.scaleY },
        textAlphas: s.content.fields.filter(f => f.id.startsWith('card.')).map(f => f.text.alpha),
        revealTweens: s.tweens.getTweensOf(g).length, fields: s.content.audit().fields };
      window.qa.game.events.off('poststep', sample);
      window.qa.game.loop.sleep();
    };
    window.qa.game.events.on('poststep', sample);
    window.qa.render(true, false, 'SR');
  });
  await page.waitForFunction(() => window.motionMiddle, null, { timeout: 30000 });
  const middle = await page.evaluate(() => window.motionMiddle);
  assert.ok(middle.alpha > 0 && middle.alpha < 1);
  for (const key of ['x', 'y', 'scaleX', 'scaleY']) assert.ok(Math.abs(middle[key] - middle.mask[key]) < .0001);
  assert.equal(middle.scaleX, middle.scaleY); assert.equal(middle.revealTweens, 1);
  assert.ok(middle.textAlphas.every(alpha => alpha === 1));
  assert.ok(middle.fields.every(field => field.fits));
  await page.screenshot({ path: '.vite/summon-qa/reveal-mid.png', timeout: 60000 });
  await page.evaluate(() => window.qa.game.loop.wake());
  await page.waitForFunction(() => window.qa.all().find(o => o.name === 'summon.reveal.0')?.alpha === 1);
  assert.equal(await page.evaluate(() => JSON.stringify(window.qa.gameStore.snapshot)), before);
  assert.deepEqual(errors, []);
  await writeFile('.vite/summon-qa/motion-report.json', JSON.stringify({ middle, errors }, null, 2));
  console.log('SUMMON_MOTION_QA_PASS: synchronized mask/frame/text, one reveal tween, uniform scale, unchanged resources');
} finally { await browser?.close(); await server.close(); }
