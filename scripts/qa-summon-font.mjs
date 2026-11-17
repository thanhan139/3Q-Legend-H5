// Verify the real bundled Vietnamese font and Phaser canvas typography; isolated fixture only.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('.vite/summon-font', {recursive:true});
await writeFile('.vite/summon-font/index.html', await readFile('.vite/summon-qa/index.html'));
const fixture = (await readFile('.vite/summon-qa/fixture.ts','utf8')).replace(
  "this.scene.start('Summon',{draws,instant:true});",
  "this.scene.start('Summon',{draws:[{...draws.find(d=>d.heroId==='da-qiao'),shards:0}],instant:true});");
await writeFile('.vite/summon-font/fixture.ts',fixture);
const server = await createServer({ server: { host: '127.0.0.1', port: 5180 }, clearScreen: false });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ ...(process.platform === 'win32' ? { executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5180/.vite/summon-font/index.html');
  await page.waitForFunction(() => window.qa?.game.scene.getScene('Summon')?.content?.fields.length >= 8);
  const before = await page.evaluate(() => JSON.stringify(window.qa.gameStore.snapshot));
  await page.waitForFunction(() => window.qa.all().filter(o => o.name.startsWith('summon.card.')).length === 1 && window.qa.all().some(o => o.name === 'summon.portrait.da-qiao'));
  const typography = await page.evaluate(() => {
    const scene = window.qa.game.scene.getScene('Summon');
    return { fontLoaded: [...document.fonts].some(f => f.family === 'SummonNotoSerif' && f.status === 'loaded' && f.weight === '700'),
      fields: scene.content.fields.map(f => ({id:f.id,value:f.text.text,font:f.text.style.fontFamily,
        resolution:f.text.style.resolution,canvasWidth:f.text.canvas.width,width:f.text.width,
        contextFont:f.text.context.font,expectedFont:f.text.style._font})), audit:scene.content.audit() };
  });
  assert.equal(typography.fontLoaded, true);
  assert.ok(typography.fields.every(f => f.font === 'SummonNotoSerif' && f.resolution === 2));
  assert.ok(typography.fields.every(f => Math.abs(f.canvasWidth-f.width*2) < 1.1));
  assert.ok(typography.fields.every(f => f.contextFont === f.expectedFont));
  assert.equal(typography.fields.find(f => f.id === 'card.0.name').value, '\u0110\u1ea1i Ki\u1ec1u');
  assert.ok(typography.audit.fields.every(f => f.fits));
  await page.evaluate(() => window.qa.game.loop.sleep());
  assert.equal(await page.evaluate(() => JSON.stringify(window.qa.gameStore.snapshot)), before);
  assert.deepEqual(errors, []);
  await writeFile('.vite/summon-qa/font-report.json', JSON.stringify({typography,errors},null,2));
  console.log('SUMMON_FONT_QA_PASS: loaded local Vietnamese font, 2x text, correct NFC name and canvas font, all bounds fit');
} finally { await browser?.close(); await server.close(); }
