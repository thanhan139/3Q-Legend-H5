// Runs the real Phaser scene with the real command handler and an in-memory save.
// Supabase requests are blocked. Run with Playwright installed.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const folder = '.vite/jewelry-qa';
await mkdir(folder, { recursive: true });
await writeFile(folder + '/index.html', '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(folder + '/fixture.ts', `
import Phaser from 'phaser';
import '../../src/style.css';
import { JewelryScene } from '../../src/scenes/JewelryScene';
import { gameStore, baseSave } from '../../src/domain/store';
import { cloudRepository } from '../../src/cloud/cloudRepository';
import { legacyTutorial } from '../../src/domain/tutorial';
import { JEWELRY_ITEMS } from '../../src/domain/jewelry';
import { STAGES } from '../../src/data/campaign';
import { handleGameRequest } from '../../supabase/functions/game-command/handler';
import { bindViewportResize } from '../../src/ui/resizeViewport';
const save = baseSave();
save.heroes = ['zhang-fei','guan-yu','liu-bei','zhao-yun','lu-bu','diao-chan'];
save.clearedStages = STAGES.map(stage => stage.id);
save.jewelryEssence = 75;
save.jewelry = JEWELRY_ITEMS.map((item, i) => ({uid: crypto.randomUUID(), itemId: item.id, level: 10,
  ...(['ring_ssr_phoenix','necklace_ssr_phoenix'].includes(item.id) ? {heroId:'guan-yu'} : {})}));
const owner = 'jewelry-fixture';
let state = save, revision = 1, fail = false;
const cloud = cloudRepository as any;
cloud.owner = owner;
const reply = () => ({status:'ok', save:state, revision:String(revision), tutorial:legacyTutorial()});
cloud.apply(reply());
const backend = {
  user: async () => ({id:owner,email_confirmed_at:'confirmed'}),
  read: async () => ({state,revision}),
  receipt: async () => false,
  commit: async (_uid,_request,_revision,_cmd,next,receipt) => { state = next; revision++; return {...reply(),receipt}; }
};
cloud.send = async intent => {
  if (fail) { fail = false; throw Error('Mất kết nối thử nghiệm'); }
  return handleGameRequest(intent, 'fixture-token', backend);
};
const game = new Phaser.Game({ type:Phaser.WEBGL, parent:'game', width:1280, height:720,
  scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH}, scene:[JewelryScene] });
bindViewportResize(game,document.getElementById('game')!);
window.qa = {game, gameStore, fail:()=>fail=true, revision:()=>revision,
  replace: next => { state=next; revision++; cloud.apply(reply()); game.scene.getScene('Jewelry').scene.restart(); }};
`);

const vite = await createServer({ server: { host: '127.0.0.1', port: 5203, strictPort: true, watch: null }, clearScreen: false });
await vite.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/assets/') && response.status() >= 400) errors.push(response.url()); });
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.goto('http://127.0.0.1:5203/' + folder + '/index.html');
  const click = async (name, touch = false) => {
    const point = await page.evaluate(name => {
      const scene = window.qa.game.scene.getScene('Jewelry');
      const object = scene.children.list.find(entry => name.startsWith('#') ? entry.name === name.slice(1) : entry.text?.startsWith(name));
      if (!object) throw Error('Missing control ' + name);
      const rect = scene.game.canvas.getBoundingClientRect(), camera = scene.cameras.main;
      return { x: rect.x + (object.x - camera.scrollX) * rect.width / scene.scale.width,
        y: rect.y + (object.y - camera.scrollY) * rect.height / scene.scale.height };
    }, name);
    await (touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y));
    await page.waitForTimeout(280);
  };
  const expectText = text => page.waitForFunction(text =>
    window.qa.game.scene.getScene('Jewelry').children.list.some(object => object.text?.includes(text)), text);
  const capture = async (width, height) => {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(320);
    const issues = await page.evaluate(() => {
      const scene = window.qa.game.scene.getScene('Jewelry'), camera = scene.cameras.main;
      const canvas = scene.game.canvas.getBoundingClientRect();
      const inside = box => box.left >= camera.scrollX && box.top >= camera.scrollY &&
        box.right <= camera.scrollX + scene.scale.width && box.bottom <= camera.scrollY + scene.scale.height;
      return {
        clipped: scene.children.list.filter(o => o.type === 'Text' || o.input?.enabled)
          .filter(o => !inside(o.getBounds())).map(o => o.text ?? o.name),
        stretched: scene.children.list.filter(o => o.type === 'Image' && Math.abs(o.scaleX - o.scaleY) > .001).map(o => o.texture.key),
        viewport: [Math.round(canvas.width), Math.round(canvas.height)],
      };
    });
    assert.deepEqual(issues, { clipped: [], stretched: [], viewport: [width, height] });
    await page.screenshot({ path: `${folder}/jewelry-${width}x${height}.png` });
  };
  await expectText('Kho Trang Sức');
  await click('#jewelry.hero.guan-yu');
  await expectText('Chu Tước · 2/2');
  for (const [w,h] of [[1920,1080],[1280,720],[844,390]]) await capture(w,h);
  await click('Phẩm:', true);
  await expectText('2 món');
  await click('#jewelry.filter.necklace', true);
  await expectText('1 món');
  const item = await page.evaluate(() => window.qa.gameStore.snapshot.jewelry.find(item => item.itemId === 'necklace_r_blue'));
  await page.evaluate(() => window.qa.fail());
  await click('#jewelry.commit.equip', true);
  await expectText('Mất kết nối thử nghiệm');
  assert.equal(await page.evaluate(() => window.qa.revision()), 1);
  await click('#jewelry.commit.equip', true);
  await expectText('Đã trang bị.');
  assert.equal(await page.evaluate(uid => window.qa.gameStore.snapshot.jewelry.find(i => i.uid === uid).heroId, item.uid), 'guan-yu');
  await click('#jewelry.commit.enhance', true);
  await expectText('Đã cường hóa');
  assert.equal(await page.evaluate(uid => window.qa.gameStore.snapshot.jewelry.find(i => i.uid === uid).level, item.uid), 11);
  await click('#jewelry.commit.unequip', true);
  await expectText('Đã tháo');
  assert.equal(await page.evaluate(uid => window.qa.gameStore.snapshot.jewelry.find(i => i.uid === uid).heroId, item.uid), undefined);
  await page.evaluate(() => window.qa.replace({...window.qa.gameStore.snapshot,jewelry:[]}));
  await expectText('Kho chưa có trang sức');
  await click('Nhận mốc', true);
  await expectText('Đã nhận trang sức');
  assert.equal(await page.evaluate(() => window.qa.gameStore.snapshot.jewelry.length), 1);
  assert.deepEqual(errors, []);
  console.log('Jewelry scene passed at 1920x1080, 1280x720 and 844x390. Screenshots: ' + folder);
} finally {
  await browser?.close();
  await vite.close();
}
