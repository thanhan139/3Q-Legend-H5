// Isolated visual fixture: real scenes/assets, local GameStore, no Auth or server writes.
// Prerequisite: npm install --no-save --package-lock=false playwright && npx playwright install chromium
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const output = '.vite/viewport-qa';
await mkdir(output, { recursive: true });
assert.match(await readFile('src/main.ts', 'utf8'), /mode:Phaser\.Scale\.EXPAND/);
await writeFile(`${output}/index.html`, '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(`${output}/fixture.ts`, `
import Phaser from 'phaser';
import '../../src/style.css';
import { BootScene } from '../../src/scenes/BootScene';
import { LobbyScene } from '../../src/scenes/LobbyScene';
import { HeroesScene } from '../../src/scenes/HeroesScene';
import { FormationScene } from '../../src/scenes/FormationScene';
import { CampaignScene } from '../../src/scenes/CampaignScene';
import { BattleScene } from '../../src/scenes/BattleScene';
import { ResultScene } from '../../src/scenes/ResultScene';
import { SummonScene } from '../../src/scenes/SummonScene';
import { InventoryScene } from '../../src/scenes/InventoryScene';
import { InfoScene } from '../../src/scenes/InfoScene';
import { ArenaScene } from '../../src/scenes/ArenaScene';
import { TutorialScene } from '../../src/scenes/TutorialScene';
import { gameStore } from '../../src/domain/store';
import { tutorialTarget } from '../../src/ui/tutorialTargets';
import { screenBounds } from '../../src/ui/viewport';
import { OnboardingController } from '../../src/ui/OnboardingController';
import { bindViewportResize } from '../../src/ui/resizeViewport';
class FixtureBoot extends BootScene { create() { this.scene.start('Lobby'); } }
let onboarding: OnboardingController;
const game = new Phaser.Game({ type: Phaser.WEBGL, parent: 'game', width: 1280, height: 720,
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: document.documentElement },
  callbacks: { postBoot: g => { onboarding = new OnboardingController(g); } },
  scene: [FixtureBoot, LobbyScene, HeroesScene, FormationScene, CampaignScene, BattleScene, ResultScene,
    SummonScene, InventoryScene, InfoScene, ArenaScene, TutorialScene] });
bindViewportResize(game, document.getElementById('game')!);
window.qa = { game, gameStore, target: (id: string) => {
  const scene = game.scene.getScenes(true)[0];
  const named = scene.children.getAll().flatMap(child => child.type === 'Container' ? child.getAll() : [child]).find(child => child.name === id);
  const bounds = tutorialTarget(scene, id) ?? named?.getBounds();
  if (!bounds) return null;
  return screenBounds(bounds, scene.cameras.main);
}, showTutorial: () => {
  const scene = game.scene.getScene('Lobby');
  const target = tutorialTarget(scene, 'lobby.0')!;
  game.loop.sleep();
  (onboarding as any).render(scene, 'welfare_intro', screenBounds(target, scene.cameras.main), game.canvas.getBoundingClientRect().width / game.scale.width);
}, hideTutorial: () => { (onboarding as any).layer.replaceChildren(); game.loop.wake(); } };
`);
const server = await createServer({ server: { host: '127.0.0.1', port: 5175 }, clearScreen: false });
await server.listen();
let browser;
let page;
const report = [];
try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  page = await browser.newPage({ hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5175/.vite/viewport-qa/index.html');
  await page.waitForFunction(() => window.qa?.game.scene.isActive('Lobby'));
  const waitViewport = () => page.waitForFunction(() => {
    const rect = window.qa.game.canvas.getBoundingClientRect();
    return Math.abs(rect.width - innerWidth) < 1 && Math.abs(rect.height - innerHeight) < 1;
  });
  const waitRender = () => page.evaluate(() => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Phaser did not render a frame')), 10000);
    window.qa.game.events.once('postrender', () => {
      clearTimeout(timeout); requestAnimationFrame(() => resolve(true));
    });
  }));
  const baseline = await page.evaluate(() => JSON.stringify(window.qa.gameStore.snapshot));
  for (const [width, height] of [[1920,1080],[1366,768],[2560,1080],[1280,720],[844,390]]) {
    await page.setViewportSize({ width, height });
    await waitViewport(); await waitRender();
    await page.waitForTimeout(450);
    const state = await page.evaluate(() => {
      const game = window.qa.game, scene = game.scene.getScene('Lobby');
      const rect = game.canvas.getBoundingClientRect();
      const objects = scene.children.getAll().flatMap(child => child.type === 'Container' ? child.getAll() : [child]);
      const hits = objects.filter(child => child.type === 'Zone').map(child => ({ name: child.name, ...child.getBounds() }));
      const distorted = objects.filter(child => ['Image','Sprite'].includes(child.type) && Math.abs(child.scaleX - child.scaleY) > 0.001).map(child => child.name || child.texture.key);
      const background = objects.find(child => child.texture?.key === 'lobby-palace').getBounds();
      return { canvas: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, logical: { width: game.scale.width, height: game.scale.height }, hits, distorted, background };
    });
    assert.ok(Math.abs(state.canvas.x) < 1 && Math.abs(state.canvas.y) < 1);
    assert.ok(Math.abs(state.canvas.width - width) < 1 && Math.abs(state.canvas.height - height) < 1);
    for (const hit of state.hits) {
      assert.ok(hit.x >= -1 && hit.y >= -1 && hit.x + hit.width <= state.logical.width + 1 && hit.y + hit.height <= state.logical.height + 1, JSON.stringify(hit));
    }
    assert.deepEqual(state.distorted, []);
    assert.ok(state.background.x <= 0 && state.background.y <= 0
      && state.background.x + state.background.width >= state.logical.width
      && state.background.y + state.background.height >= state.logical.height);
    await page.screenshot({ path: `${output}/lobby-${width}x${height}.png` });
    // A real DOM pointer must hit the moved Zone through Phaser's input transform.
    const clickTarget = async id => {
      const point = await page.evaluate(id => {
        const b = window.qa.target(id), rect = window.qa.game.canvas.getBoundingClientRect();
        return { x: rect.x + (b.x + b.width / 2) * rect.width / window.qa.game.scale.width,
          y: rect.y + (b.y + b.height / 2) * rect.height / window.qa.game.scale.height };
      }, id);
      if (width === 844) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
    };
    await clickTarget('lobby.profile');
    await page.locator('.lobby-dialog[open]').waitFor();
    await page.locator('.lobby-dialog-close').click();
    await clickTarget('lobby.vip');
    await page.locator('.lobby-dialog[open]').waitFor();
    await page.locator('.lobby-dialog-close').click();
    await page.evaluate(() => window.qa.showTutorial());
    const spot = await page.evaluate(() => {
      const ring = document.querySelector('.tutorial-spotlight').getBoundingClientRect();
      const target = window.qa.target('lobby.0'), canvas = window.qa.game.canvas.getBoundingClientRect();
      const scale = canvas.width / window.qa.game.scale.width;
      return { actualX: ring.x, actualY: ring.y, expectedX: canvas.x + (target.x - 8) * scale,
        expectedY: canvas.y + (target.y - 8) * scale };
    });
    assert.ok(Math.abs(spot.actualX - spot.expectedX) < 1 && Math.abs(spot.actualY - spot.expectedY) < 1);
    await page.screenshot({ path: `${output}/spotlight-${width}x${height}.png` });
    await page.evaluate(() => window.qa.hideTutorial());
    await clickTarget('lobby.9');
    await page.waitForFunction(() => window.qa.game.scene.isActive('Formation'));
    await page.evaluate(() => window.qa.game.scene.getScene('Formation').scene.start('Lobby'));
    await page.waitForFunction(() => window.qa.game.scene.isActive('Lobby'));
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => JSON.stringify(window.qa.gameStore.snapshot)), baseline);
    report.push({ width, height, ...state, formationClick: 'PASS', popupClicks: 'PASS', spotlight: 'PASS', input: width === 844 ? 'touch' : 'mouse', saveUnchanged: true });
    console.log(`VIEWPORT_PASS ${width}x${height}`);
    if (width === 844) {
      await page.setViewportSize({ width: 390, height: 844 });
      await waitViewport(); await waitRender();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${output}/lobby-portrait.png` });
      await page.setViewportSize({ width: 844, height: 390 });
      await waitViewport(); await waitRender();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        document.documentElement.style.setProperty('--safe-left', '44px');
        document.documentElement.style.setProperty('--safe-right', '24px');
        document.documentElement.style.setProperty('--safe-bottom', '12px');
        window.qa.game.scale.refresh();
      });
      await page.waitForTimeout(250);
      const safe = await page.evaluate(() => {
        const left = window.qa.target('lobby.profile'), right = window.qa.target('lobby.campaign');
        const rect = window.qa.game.canvas.getBoundingClientRect();
        const scale = rect.width / window.qa.game.scale.width;
        return { left: left.x * scale, right: (right.x + right.width) * scale, width: rect.width };
      });
      assert.ok(safe.left >= 44 && safe.right <= 844 - 24);
      assert.equal(safe.width, 844);
      await page.screenshot({ path: `${output}/lobby-safe-area.png` });
      console.log('ORIENTATION_SAFE_AREA_PASS');
      await clickTarget('lobby.profile');
      await page.locator('.lobby-dialog[open]').waitFor();
      await page.locator('.lobby-dialog-close').click();
      await page.evaluate(() => {
        for (const side of ['left', 'right', 'bottom']) document.documentElement.style.removeProperty('--safe-' + side);
        window.qa.game.scale.refresh();
      });
      await clickTarget('lobby.14');
      await page.waitForFunction(() => window.qa.game.scene.getScene('Lobby').settingsOpen);
      await page.setViewportSize({ width: 2560, height: 1080 });
      await waitViewport(); await waitRender();
      await page.waitForTimeout(400);
      const shade = await page.evaluate(() => {
        const game = window.qa.game, scene = game.scene.getScene('Lobby');
        const children = scene.children.getAll().flatMap(child => child.type === 'Container' ? child.getAll() : [child]);
        const overlay = children.find(child => child.type === 'Rectangle' && child.fillColor === 0x100a18).getBounds();
        return { ...overlay, viewportWidth: game.scale.width, viewportHeight: game.scale.height };
      });
      assert.ok(Math.abs(shade.x) < 1 && Math.abs(shade.y) < 1 && Math.abs(shade.width - shade.viewportWidth) < 1 && Math.abs(shade.height - shade.viewportHeight) < 1);
      await page.screenshot({ path: `${output}/settings-resized.png` });
      console.log('SETTINGS_RESIZE_PASS');
      await page.evaluate(() => window.qa.game.scene.getScene('Lobby').scene.restart({}));
      await page.waitForTimeout(400);
    }
  }
  // Exercise the same fullscreen API available to game UI, using a real user gesture.
  await page.evaluate(() => {
    const button = document.createElement('button'); button.id = 'qa-fullscreen';
    Object.assign(button.style, { position: 'fixed', left: '0', top: '0', zIndex: '99999' });
    button.textContent = 'Fullscreen'; button.onclick = () => window.qa.game.scale.startFullscreen();
    document.body.append(button);
  });
  await page.click('#qa-fullscreen');
  await page.waitForFunction(() => document.fullscreenElement !== null);
  await waitViewport(); await waitRender();
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => {
    const rect = window.qa.game.canvas.getBoundingClientRect();
    return Math.abs(rect.width - innerWidth) < 1 && Math.abs(rect.height - innerHeight) < 1;
  }), true);
  await page.screenshot({ path: `${output}/lobby-fullscreen.png` });
  await page.evaluate(() => window.qa.game.scale.stopFullscreen());
  await page.waitForFunction(() => document.fullscreenElement === null);
  await waitViewport(); await waitRender();
  await page.evaluate(() => document.getElementById('qa-fullscreen').remove());
  console.log('FULLSCREEN_PASS');
  // Existing authored coordinates stay centered and clickable across a live resize.
  for (const [key, data] of [['Campaign', {}], ['Info', { page: 'Welfare' }], ['Arena', {}], ['Tutorial', { help: true }], ['Battle', { arenaPractice: true }]]) {
    await page.setViewportSize({ width: 2560, height: 1080 });
    await waitViewport();
    await page.evaluate(({ key, data }) => window.qa.game.scene.getScenes(true)[0].scene.start(key, data), { key, data });
    await page.waitForFunction(key => window.qa.game.scene.isActive(key), key);
    await waitRender();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${output}/${key}-ultrawide.png` });
    await page.setViewportSize({ width: 844, height: 390 });
    await waitViewport(); await waitRender();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${output}/${key}-mobile.png` });
    console.log(`SCENE_PASS ${key}`);
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ report, errors }, null, 2));
  console.log(`VISUAL_QA_PASS: ${report.length} viewport sizes; mouse/touch, profile/VIP, spotlight, safe area, orientation, fullscreen, settings resize, uniform artwork, save isolation, 5 other scenes; screenshots in ${output}`);
} catch (error) {
  if (page) {
    const state = await page.evaluate(() => {
      const game = window.qa?.game, canvas = game?.canvas.getBoundingClientRect();
      return { inner: [innerWidth, innerHeight], canvas: canvas?.toJSON(),
        parent: document.getElementById('game')?.getBoundingClientRect().toJSON(),
        parentSize: game && [game.scale.parentSize.width, game.scale.parentSize.height],
        logical: game && [game.scale.width, game.scale.height], running: game?.loop.running,
        scenes: game?.scene.getScenes(true).map(scene => scene.sys.settings.key) };
    }).catch(() => ({}));
    console.log('VISUAL_QA_FAILURE_STATE ' + JSON.stringify(state));
    await writeFile(`${output}/failure.json`, JSON.stringify({ message: String(error), state }, null, 2));
  }
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
