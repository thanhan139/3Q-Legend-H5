// Real Lobby/asset rendering in an isolated browser fixture. Never authenticates or writes to Supabase.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const output = '.vite/lobby-content-qa';
await mkdir(output, { recursive: true });
const existing = await readFile('scripts/qa-viewport.mjs', 'utf8');
let fixture = existing.match(/await writeFile\(`\$\{output\}\/fixture\.ts`, `([\s\S]*?)`\);/)?.[1];
assert.ok(fixture, 'Missing shared real-scene fixture');
// Load only genuine assets required by Lobby and its UI routes; Battle VFX are outside this QA scope.
fixture = fixture.replace("class FixtureBoot extends BootScene { create() { this.scene.start('Lobby'); } }", `
class FixtureBoot extends BootScene {
  preload() {
    loadHeroUi(this.load); loadFormationUi(this.load);
    this.load.spritesheet(PORTRAITS, '/assets/heroes/portraits.webp', { frameWidth: PORTRAIT_TILE, frameHeight: PORTRAIT_TILE });
    this.load.spritesheet(BATTLE_SPRITES, '/assets/heroes/battle-sprites.webp', { frameWidth: BATTLE_TILE, frameHeight: BATTLE_TILE });
    this.load.image('lobby-palace', '/assets/lobby/palace.webp');
    for (const id of SAMPLE_HERO_IDS) this.load.spritesheet(heroAnimationTexture(id), '/assets/battle/heroes/' + id + '/poses.webp', { frameWidth: 256, frameHeight: 256 });
  }
  create() { this.scene.start('Lobby'); }
}
`);
fixture += `
import { loadHeroUi } from '../../src/ui/heroUiAssets';
import { loadFormationUi } from '../../src/ui/formationAssets';
import { PORTRAITS, PORTRAIT_TILE } from '../../src/ui/heroPresentation';
import { BATTLE_SPRITES, BATTLE_TILE } from '../../src/ui/battleSprites';
import { SAMPLE_HERO_IDS } from '../../src/data/battleLayout';
import { heroAnimationTexture } from '../../src/ui/HeroAnimationController';
`;
await writeFile(`${output}/fixture.ts`, fixture);
await writeFile(`${output}/index.html`, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body><div id="game"></div><script type="module" src="./fixture.ts"></script></body></html>');
const server = await createServer({ server: { host: '127.0.0.1', port: 5177 }, clearScreen: false });
await server.listen();
const chromePath = process.env.CHROME_PATH ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
let browser, page;
const results = [], errors = [];
const browserMessages = [];
const overlap = (a, b) => a.x < b.x + b.width - 0.5 && a.x + a.width > b.x + 0.5 && a.y < b.y + b.height - 0.5 && a.y + a.height > b.y + 0.5;
try {
  browser = await chromium.launch({ ...(chromePath && existsSync(chromePath) ? { executablePath: chromePath } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  page = await browser.newPage({ hasTouch: true });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') browserMessages.push(message.text().slice(0, 160)); });
  await page.goto('http://127.0.0.1:5177/.vite/lobby-content-qa/index.html');
  await page.waitForFunction(() => window.qa?.game.scene.getScene('Lobby')?.content?.fields.length > 15, null, { timeout: 90000 });
  const waitFrame = async () => {
    await page.waitForFunction(() => {
      const r = window.qa.game.canvas.getBoundingClientRect();
      return Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1;
    });
    await page.evaluate(() => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('No rendered frame')), 10000);
      window.qa.game.events.once('postrender', () => { clearTimeout(timeout); requestAnimationFrame(() => resolve(true)); });
    }));
  };
  const readAudit = () => page.evaluate(() => {
    const game = window.qa.game, scene = game.scene.getScene('Lobby');
    const all = scene.children.getAll().flatMap(child => child.type === 'Container' ? child.getAll() : [child]);
    return { ...scene.content.audit(), canvas: game.canvas.getBoundingClientRect().toJSON(),
      width: game.scale.width, height: game.scale.height,
      hits: all.filter(child => child.type === 'Zone' && child.input).map(child => ({ name: child.name, ...child.getBounds() })),
      distorted: all.filter(child => ['Image', 'Sprite'].includes(child.type) && Math.abs(child.scaleX - child.scaleY) > 0.001).map(child => child.name || child.texture.key),
      bakedOverlays: all.filter(child => child.type === 'Text' && /^(Phúc Lợi|Nạp Đầu|Điểm Danh|Hộp Thư|Nhiệm Vụ|Cài Đặt|Đội Hình|Võ Tướng|Túi Đồ|Chiêu Mộ)$/.test(child.text)).map(child => child.text),
    };
  });
  const check = (audit, width, height) => {
    assert.ok(Math.abs(audit.canvas.width - width) < 1 && Math.abs(audit.canvas.height - height) < 1);
    assert.ok(Math.abs(audit.canvas.x) < 1 && Math.abs(audit.canvas.y) < 1);
    assert.deepEqual(audit.fields.filter(field => !field.fits).map(field => ({ id: field.id, text: field.textBounds, safe: field.contentRect })), []);
    assert.deepEqual(audit.distorted, []); assert.deepEqual(audit.bakedOverlays, []);
    for (const hit of audit.hits) assert.ok(hit.x >= 0 && hit.y >= 0 && hit.x + hit.width <= audit.width + 0.5 && hit.y + hit.height <= audit.height + 0.5, JSON.stringify(hit));
    const field = id => audit.fields.find(f => f.id === id).textBounds;
    assert.equal(overlap(field('profile.name'), field('profile.vip')), false);
    assert.equal(overlap(field('profile.level'), field('profile.name')), false);
    assert.equal(overlap(field('profile.level'), field('profile.power')), false);
    for (const currency of ['copper', 'gold']) {
      assert.equal(overlap(field(`currency.${currency}.label`), field(`currency.${currency}.value`)), false);
      assert.equal(overlap(field(`currency.${currency}.value`), field(`currency.${currency}.plus`)), false);
    }
    const campaign = audit.regions.find(r => r.id === 'campaign').bounds;
    for (const hit of audit.hits.filter(h => /^lobby\.(9|10|11|5)$/.test(h.name))) assert.equal(overlap(campaign, hit), false);
    const dock = ['lobby.9', 'lobby.10', 'lobby.11', 'lobby.5'].map(id => audit.hits.find(h => h.name === id));
    assert.ok(Math.abs((dock[1].x - dock[0].x) - (dock[3].x - dock[2].x)) < 0.1);
  };
  const click = async (name, touch = false) => {
    const point = await page.evaluate(name => {
      const scene = window.qa.game.scene.getScene('Lobby');
      const all = scene.children.getAll().flatMap(child => child.type === 'Container' ? child.getAll() : [child]);
      const bounds = all.find(child => child.name === name && child.input).getBounds();
      const r = window.qa.game.canvas.getBoundingClientRect();
      return { x: r.x + (bounds.x + bounds.width / 2) * r.width / window.qa.game.scale.width,
        y: r.y + (bounds.y + bounds.height / 2) * r.height / window.qa.game.scale.height };
    }, name);
    if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
  };
  const back = async () => {
    await page.evaluate(() => window.qa.game.scene.getScenes(true)[0].scene.start('Lobby'));
    await page.waitForFunction(() => window.qa.game.scene.getScene('Lobby').content.fields.length > 15);
    await waitFrame(); await page.waitForTimeout(200);
  };
  const initial = await page.evaluate(() => window.qa.gameStore.snapshot);
  for (const [width, height] of [[1920,1080], [1846,864], [1280,720], [844,390]]) {
    await page.setViewportSize({ width, height }); await waitFrame(); await page.waitForTimeout(250);
    const audit = await readAudit(); check(audit, width, height);
    await page.screenshot({ path: `${output}/lobby-${width}x${height}.png` });
    await page.evaluate(() => window.qa.game.scene.getScene('Lobby').content.setDebug(true)); await waitFrame();
    await page.screenshot({ path: `${output}/debug-${width}x${height}.png` });
    await page.evaluate(() => window.qa.game.scene.getScene('Lobby').content.setDebug(false));
    for (const name of ['lobby.profile', 'lobby.vip', 'lobby.currency.copper', 'lobby.currency.gold']) {
      await click(name, width === 844);
      await page.locator('.lobby-dialog[open]').waitFor();
      if (name.includes('currency')) assert.match(await page.locator('.lobby-dialog h3').innerText(), /Số dư:/);
      await page.locator('.lobby-dialog-close').click();
    }
    await click('lobby.9', width === 844);
    await page.waitForFunction(() => window.qa.game.scene.isActive('Formation')); await back();
    assert.deepEqual(await page.evaluate(() => window.qa.gameStore.snapshot), initial);
    results.push({ width, height, fields: audit.fields, uniformTextures: true, noBakedOverlays: true, input: width === 844 ? 'touch' : 'mouse', saveUnchanged: true });
    console.log(`CONTENT_QA_PASS ${width}x${height}: ${audit.fields.length} fields, clean/debug screenshots, popup and navigation input`);
  }
  // Local browser-only stress fixture; never sent to Auth/Supabase or stored in the project.
  await page.setViewportSize({ width: 1846, height: 864 });
  await page.evaluate(() => {
    const save = window.qa.gameStore.snapshot;
    save.playerName = 'W'.repeat(24); save.coins = Number.MAX_SAFE_INTEGER; save.copper = Number.MAX_SAFE_INTEGER;
    window.qa.gameStore.useCloudSave(save); window.qa.game.scene.getScene('Lobby').scene.restart({});
  });
  await waitFrame(); await page.waitForTimeout(300);
  const stressed = await readAudit(); check(stressed, 1846, 864);
  assert.equal(stressed.fields.find(f => f.id === 'profile.name').fullValue, 'W'.repeat(24));
  await page.screenshot({ path: `${output}/stress-long-name-wallet.png` });
  await click('lobby.currency.gold');
  assert.ok((await page.locator('.lobby-dialog h3').innerText()).includes(Number.MAX_SAFE_INTEGER.toLocaleString('vi-VN')));
  await page.locator('.lobby-dialog-close').click();
  await page.evaluate(save => { window.qa.gameStore.useCloudSave(save); window.qa.game.scene.getScene('Lobby').scene.restart({}); }, initial);
  await waitFrame(); await page.waitForTimeout(250);
  for (const [target, destination] of [['lobby.campaign','Campaign'], ['lobby.0','Info'], ['lobby.7','Arena']]) {
    await click(target); await page.waitForFunction(key => window.qa.game.scene.isActive(key), destination); await back();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ results, stress: stressed.fields, errors, routes: 'PASS' }, null, 2));
  console.log('LOBBY_CONTENT_VISUAL_QA_PASS');
} catch (error) {
  if (page) { await page.screenshot({ path: `${output}/failure.png` }).catch(() => {}); }
  const state = await page?.evaluate(() => ({ hasQA: Boolean(window.qa), running: window.qa?.game.isRunning,
    scenes: window.qa?.game.scene.getScenes(false).map(scene => ({ key: scene.sys.settings.key, status: scene.sys.settings.status, progress: scene.load.progress })) })).catch(() => ({}));
  console.error('LOBBY_CONTENT_QA_FAILURE', String(error), JSON.stringify({ errors, browserMessages, state }));
  throw error;
} finally {
  await browser?.close(); await server.close();
}
