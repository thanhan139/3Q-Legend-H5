// Real Phaser renderer and production assets; fixtures never authenticate or mutate Supabase.
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const output = '.vite/summon-qa';
await mkdir(output, { recursive: true });
await writeFile(`${output}/index.html`, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="game"></div><script type="module" src="./fixture.ts"></script></body></html>');
await writeFile(`${output}/fixture.ts`, `
import Phaser from 'phaser';
import '../../src/style.css';
import { SummonScene } from '../../src/scenes/SummonScene';
import { HeroesScene } from '../../src/scenes/HeroesScene';
import { baseSave, gameStore } from '../../src/domain/store';
import { HEROES } from '../../src/data/heroes';
import { PORTRAITS, PORTRAIT_TILE } from '../../src/ui/heroPresentation';
import { bindViewportResize } from '../../src/ui/resizeViewport';
import { screenBounds } from '../../src/ui/viewport';
const heroes = ['pei-yuan-shao','xing-dao-rong','guan-ping','cheng-yuan-zhi','huang-yueying','pan-feng','xiahou-dun','zhuge-liang','guan-yu','lu-bu'];
const draws = heroes.map((heroId, i) => ({heroId,rarity:HEROES.find(h=>h.id===heroId)!.rarity,shards:i%3===1?10:0,pityAfter:0,legendaryPityAfter:0,guaranteed:false}));
const saved={...baseSave(),goldKeys:20,clearedStages:['1-1','1-2','1-3'],lastSummon:draws};
gameStore.useCloudSave(saved);
class Boot extends Phaser.Scene {
 constructor(){super('Boot');}
 preload(){this.load.spritesheet(PORTRAITS, '/assets/heroes/portraits.webp', {frameWidth:PORTRAIT_TILE,frameHeight:PORTRAIT_TILE});}
 create(){this.scene.start('Summon',{draws,instant:true});}
}
const game = new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,fps:{target:20,forceSetTimeOut:true},
 scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,SummonScene,HeroesScene]});
bindViewportResize(game,document.getElementById('game')!);
window.qa={game,gameStore,draws, saved, screenBounds, long:(enabled:boolean)=>{
 for(const id of heroes){const h=HEROES.find(h=>h.id===id)!; if(!h.originalName) h.originalName=h.name;h.name=enabled?'Đặng Trường Nguyễn Hoàng Phượng':h.originalName;}
}, render:(single=false,instant=true)=>game.scene.getScene('Summon').scene.restart({draws:single?[draws[6]]:draws,instant})};
`);
const server=await createServer({server:{host:'127.0.0.1',port:5178},clearScreen:false});await server.listen();
let browser,page;const errors=[],report=[];
try {
 browser=await chromium.launch({...(process.platform==='win32'?{executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5178/.vite/summon-qa/index.html');
 await page.waitForFunction(()=>window.qa?.game.scene.getScene('Summon')?.content?.fields.length>30,null,{timeout:90000});
 const ready=async()=>{await page.waitForTimeout(350);await page.evaluate(()=>new Promise(resolve=>window.qa.game.events.once('postrender',()=>resolve(true))));};
 const audit=()=>page.evaluate(()=>{
  const g=window.qa.game,s=g.scene.getScene('Summon'),c=s.cameras.main;
  return {...s.content.audit(),canvas:g.canvas.getBoundingClientRect().toJSON(),
   hits:s.children.list.filter(o=>o.input).map(o=>({name:o.name,...window.qa.screenBounds(o.getBounds(),c)})),
   distorted:s.children.list.filter(o=>o.type==='Image'&&Math.abs(o.scaleX-o.scaleY)>.001).map(o=>o.texture.key),
   portraits:s.children.list.filter(o=>o.name.startsWith('summon.portrait')).map(o=>({name:o.name,frame:o.frame.name})),width:g.scale.width,height:g.scale.height};
 });
 const check=(a,w,h)=>{
  assert.ok(Math.abs(a.canvas.width-w)<1&&Math.abs(a.canvas.height-h)<1);
  assert.deepEqual(a.fields.filter(f=>!f.fits),[]);assert.deepEqual(a.distorted,[]);
  for(const f of a.fields){assert.ok(!/[?\uFFFD]/u.test(f.fullValue),`encoding: ${f.id}`);assert.equal(f.fullValue,f.fullValue.normalize('NFC'));}
  for(const b of a.hits)assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=a.width+.5&&b.y+b.height<=a.height+.5,JSON.stringify(b));
  for(const p of a.portraits)assert.notEqual(p.frame,'__BASE');
 };
 const click=async(name,touch=false)=>{const p=await page.evaluate(name=>{const g=window.qa.game,s=g.scene.getScene('Summon'),o=s.children.list.find(o=>o.name===name);const b=window.qa.screenBounds(o.getBounds(),s.cameras.main),r=g.canvas.getBoundingClientRect();return{x:(b.x+b.width/2)*r.width/g.scale.width,y:(b.y+b.height/2)*r.height/g.scale.height};},name);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await ready();};
 for(const [w,h] of [[1920,1080],[1280,720],[844,390]]){
  await page.setViewportSize({width:w,height:h});await ready();
  for(const mode of ['ten','single','long']){
   await page.evaluate(mode=>{window.qa.long(mode==='long');window.qa.render(mode==='single');},mode);await ready();
   const a=await audit();check(a,w,h);report.push({w,h,mode,...a});
   await page.screenshot({path:`${output}/${mode}-${w}x${h}.png`});
  }
  await page.evaluate(()=>{window.qa.long(false);window.qa.render(false,false);});await ready();
  await click('summon.skip',w===844);
  await click('summon.back',w===844);
  await page.waitForFunction(()=>window.qa.game.scene.getScene('Summon').children.list.some(o=>o.name==='summon.recent'));
  await click('summon.recent',w===844);
  assert.equal((await audit()).portraits.length,10);
  const before=await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot));
  // Real command path with no authenticated session: cannot grant or consume anything.
  await page.context().setOffline(true);await click('summon.one',w===844);await page.context().setOffline(false);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot)),before);
  await page.evaluate(()=>window.qa.render());await ready();
  console.log(`SUMMON_QA_PASS ${w}x${h} ten/single/long/reveal/input/network`);
 }
 await page.evaluate(()=>window.qa.game.scene.getScene('Summon').content.setDebug(true));await ready();
 await page.screenshot({path:`${output}/debug-844x390.png`});
 assert.deepEqual(errors,[]);await writeFile(`${output}/report.json`,JSON.stringify({report,errors},null,2));console.log('SUMMON_VISUAL_QA_PASS');
} catch(e){if(page)await page.screenshot({path:`${output}/failure.png`});throw e;}
finally{await browser?.close();await server.close();}
