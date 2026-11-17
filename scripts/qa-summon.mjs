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
const heroes = ['pei-yuan-shao','xing-dao-rong','guan-ping','cheng-yuan-zhi','da-qiao','pan-feng','xiahou-dun','zhuge-liang','guan-yu','lu-bu'];
const draws = heroes.map((heroId, i) => ({heroId,rarity:HEROES.find(h=>h.id===heroId)!.rarity,shards:i%3===1?10:0,pityAfter:0,legendaryPityAfter:0,guaranteed:false}));
const saved={...baseSave(),goldKeys:20,clearedStages:['1-1','1-2','1-3'],lastSummon:draws};
gameStore.useCloudSave(saved);
class Boot extends Phaser.Scene {
 constructor(){super('Boot');}
 preload(){this.load.spritesheet(PORTRAITS, '/assets/heroes/portraits.webp', {frameWidth:PORTRAIT_TILE,frameHeight:PORTRAIT_TILE});}
 create(){this.scene.start('Summon',{draws,instant:true});}
}
const game = new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,fps:{target:8,forceSetTimeOut:true},
 scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,SummonScene,HeroesScene]});
bindViewportResize(game,document.getElementById('game')!);
const descendants=(items:any[]):any[]=>items.flatMap(o=>o.type==='Container'?[o,...descendants(o.getAll())]:[o]);
window.qa={game,gameStore,draws, saved, screenBounds, all:()=>descendants(game.scene.getScene('Summon').children.list), long:(enabled:boolean)=>{
 for(const id of heroes){const h=HEROES.find(h=>h.id===id)!; if(!h.originalName) h.originalName=h.name;h.name=enabled?'Đặng Trường Nguyễn Hoàng Phượng':h.originalName;}
}, render:(single=false,instant=true,rarity='SSR')=>game.scene.getScene('Summon').scene.restart({draws:single?[rarity==='SR'?{...draws.find(d=>d.heroId==='da-qiao')!,shards:0}:draws.find(d=>d.rarity===rarity)!]:draws,instant})};
`);
const server=await createServer({server:{host:'127.0.0.1',port:5178,watch:{ignored:['**/.vite/summon-qa/**']}},clearScreen:false});await server.listen();
let browser,page;const errors=[],report=[];
try {
 browser=await chromium.launch({...(process.platform==='win32'?{executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({hasTouch:true});page.on('pageerror',e=>{errors.push(e.message);console.error('QA browser error:',e.message);});
 await page.goto('http://127.0.0.1:5178/.vite/summon-qa/index.html');
 await page.waitForFunction(()=>window.qa?.game.scene.getScene('Summon')?.content?.fields.length>30,null,{timeout:90000});
 const transparency=await page.evaluate(()=>{
  const image=window.qa.game.textures.get('summon-smooth-card-atlas').getSourceImage();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d');
  const sample=(x,y)=>{c.clearRect(0,0,1,1);c.drawImage(image,x,y,1,1,0,0,1,1);return c.getImageData(0,0,1,1).data[3];};
  return [0,1,2,3].map(i=>({window:sample((i%2+.5)*image.width/2,(Math.floor(i/2)+.3)*image.height/2),
   panel:sample((i%2+.5)*image.width/2,(Math.floor(i/2)+.8)*image.height/2)}));
 });
 assert.ok(transparency.every(cell=>cell.window===0&&cell.panel>240),'portrait windows must be transparent, panels opaque');
 const ready=async()=>{await page.waitForTimeout(350);await page.evaluate(()=>new Promise(resolve=>window.qa.game.events.once('postrender',()=>resolve(true))));};
 // Pause only the QA fixture after a rendered frame: SwiftShader stencil work otherwise competes
 // with CDP screenshot compositing on this Windows host. Production frame rate is unchanged.
 const shot=async (path,clip)=>{
  await page.evaluate(()=>window.qa.game.loop.sleep());
  try{await page.screenshot({path,type:'jpeg',quality:86,timeout:60000,...(clip?{clip}:{})});}
  finally{await page.evaluate(()=>window.qa.game.loop.wake());}
 };
 const audit=()=>page.evaluate(()=>{
  const g=window.qa.game,s=g.scene.getScene('Summon'),c=s.cameras.main,all=window.qa.all();
  return {...s.content.audit(),canvas:g.canvas.getBoundingClientRect().toJSON(),contextLost:g.renderer.gl.isContextLost(),
   hits:all.filter(o=>o.input).map(o=>({name:o.name,...window.qa.screenBounds(o.getBounds(),c)})),
   distorted:all.filter(o=>o.type==='Image'&&o.name!=='summon.ui-gradient'&&Math.abs(o.scaleX-o.scaleY)>.001).map(o=>o.texture.key),
   cardFrames:all.filter(o=>o.name.startsWith('summon.card.')).map(o=>({name:o.name,type:o.type,texture:o.texture.key,bounds:o.getBounds()})),
   glows:all.filter(o=>o.name.startsWith('summon.glow.')).map(o=>({name:o.name,alpha:o.alpha,rarity:o.getData('rarity'),animated:s.tweens.getTweensOf(o).length>0})),
   sparks:all.filter(o=>o.name.startsWith('summon.spark.')).length,
   maskCount:new Set(all.map(o=>o.mask).filter(Boolean)).size,
   groups:all.filter(o=>o.name.startsWith('summon.reveal.')).map(o=>({alpha:o.alpha,scaleX:o.scaleX,scaleY:o.scaleY,tweens:s.tweens.getTweensOf(o).length})),
   portraits:all.filter(o=>o.name.startsWith('summon.portrait')).map(o=>({name:o.name,frame:o.frame.name,source:o.texture.key})),width:g.scale.width,height:g.scale.height};
 });
 const check=(a,w,h)=>{
  assert.ok(Math.abs(a.canvas.width-w)<1&&Math.abs(a.canvas.height-h)<1);
  assert.equal(a.contextLost,false);
  assert.deepEqual(a.fields.filter(f=>!f.fits),[]);assert.deepEqual(a.distorted,[]);
  for(const f of a.fields){assert.ok(!/[?\uFFFD]/u.test(f.fullValue),`encoding: ${f.id}`);assert.equal(f.fullValue,f.fullValue.normalize('NFC'));}
  for(const b of a.hits)assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=a.width+.5&&b.y+b.height<=a.height+.5,JSON.stringify(b));
  for(const p of a.portraits)assert.notEqual(p.frame,'__BASE');
 };
 const click=async(name,touch=false)=>{const p=await page.evaluate(name=>{const g=window.qa.game,s=g.scene.getScene('Summon'),o=s.children.list.find(o=>o.name===name);const b=window.qa.screenBounds(o.getBounds(),s.cameras.main),r=g.canvas.getBoundingClientRect();return{x:(b.x+b.width/2)*r.width/g.scale.width,y:(b.y+b.height/2)*r.height/g.scale.height};},name);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await ready();};
 for(const [w,h] of (process.env.QA_FAST?[[1280,720]]:[[1920,1080],[1280,720],[844,390]])){
  await page.setViewportSize({width:w,height:h});await ready();
  for(const mode of (process.env.QA_FAST?['ten']:['ten','single-sr','single-ssr','single-sss','long','disabled'])){
   await page.evaluate(mode=>{window.qa.long(mode==='long');window.qa.gameStore.useCloudSave({...window.qa.saved,goldKeys:mode==='disabled'?0:20});window.qa.render(mode.startsWith('single'),!mode.startsWith('single'),mode==='single-sr'?'SR':mode==='single-sss'?'SSS+':'SSR');},mode);await ready();
   if(mode.startsWith('single')){
    await page.waitForFunction(mode=>{
     const s=window.qa.game.scene.getScene('Summon');
     if(mode==='single-sr')return s.content.fields.find(f=>f.id==='card.0.status')?.text.parentContainer.alpha===1;
     const glow=window.qa.all().find(o=>o.name==='summon.glow.0');
     return glow?.alpha>(mode==='single-sss'?.48:.4);
    },mode,{timeout:30000,polling:100});
   }
   const a=await audit();check(a,w,h);report.push({w,h,mode,...a});
   assert.equal(a.cardFrames.length,mode.startsWith('single')?1:10);
   assert.equal(a.maskCount,a.cardFrames.length,'only one shared portrait clip per card');
   assert.equal(a.groups.length,a.cardFrames.length);
   for(const group of a.groups){assert.equal(group.scaleX,group.scaleY);assert.ok(group.tweens<=1);}
   for(const frame of a.cardFrames){assert.equal(frame.type,'Image');assert.equal(frame.texture,'summon-smooth-card-atlas');}
   for(let i=0;i<a.portraits.length;i++){
    const body=a.regions.find(r=>r.id===`card.${i}`).bounds,art=a.regions.find(r=>r.id===`card.${i}.portrait`).bounds;
    assert.ok(art.width/body.width>.75&&art.height/body.height>.4,'portrait must fill card, not a thumbnail');
   }
   if(mode==='disabled') assert.ok(!a.hits.some(h=>['summon.one','summon.ten'].includes(h.name)));
   if(mode.startsWith('single')){
    assert.ok(!a.hits.some(h=>h.name==='summon.skip'),'single result must never have a reveal-all button');
   assert.equal(a.sparks,mode==='single-sss'?5:mode==='single-ssr'?3:0);
    if(mode!=='single-sr'){
     assert.ok(a.glows[0].animated,'rare result has an active glow tween');
     await page.waitForFunction(value=>{
      const glow=window.qa.all().find(o=>o.name==='summon.glow.0');
      return Math.abs(glow.alpha-value)>.003;
     },a.glows[0].alpha,{timeout:15000,polling:100});
     assert.notEqual((await audit()).glows[0].alpha,a.glows[0].alpha,'glow must actually animate');
    }
   }
   if(mode==='single-sr')assert.equal(a.portraits[0].source,'summon-smooth-da-qiao');
   await shot(`${output}/${mode}-${w}x${h}.jpg`);
   if(mode==='single-sr'){
    const clip=await page.evaluate(()=>{const g=window.qa.game,s=g.scene.getScene('Summon'),o=window.qa.all().find(o=>o.name==='summon.card.0');
     const b=window.qa.screenBounds(o.getBounds(),s.cameras.main),r=g.canvas.getBoundingClientRect(),k=r.width/g.scale.width;
     return{x:Math.floor(b.x*k),y:Math.floor(b.y*k),width:Math.ceil(b.width*k),height:Math.ceil(b.height*k)};});
    await shot(`${output}/da-qiao-card-${w}x${h}.jpg`,clip);
   }
  }
  if(process.env.QA_FAST)continue;
  await page.evaluate(()=>{window.qa.long(false);window.qa.gameStore.useCloudSave(window.qa.saved);window.qa.render(false,false);});await ready();
  await click('summon.skip',w===844);
  assert.ok((await audit()).glows.filter(g=>['SSR','SSS+'].includes(g.rarity)).every(g=>g.animated),'reveal-all must retain rare ambient glow');
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
 if(!process.env.QA_FAST){
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.qa.render(true,false,'SSS+'));await ready();
  const reduced=await audit();assert.equal(reduced.sparks,0);assert.equal(reduced.glows[0].animated,false);
  assert.ok(!reduced.hits.some(h=>h.name==='summon.skip'));
 }
 await page.evaluate(()=>window.qa.game.scene.getScene('Summon').content.setDebug(true));await ready();
 await shot(`${output}/debug-844x390.jpg`);
 if(!process.env.QA_FAST){
  for(const [w,h] of [[1920,1080],[1280,720],[844,390]]){
   await writeFile(`${output}/comparison.html`, `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#19121d;color:#ffe2a0;font:20px Arial}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}figure{margin:0}img{width:100%;height:600px;object-fit:contain}figcaption{text-align:center;padding:12px}</style><main><figure><figcaption>Approved concept (sample data)</figcaption><img src="../summon-kit/reference/APPROVED_results_screen_concept.png"></figure><figure><figcaption>Runtime ${w} x ${h} — policy 50 / 100</figcaption><img src="ten-${w}x${h}.jpg"></figure></main>`);
   await page.setViewportSize({width:1920,height:690});
   await page.goto('http://127.0.0.1:5178/.vite/summon-qa/comparison.html');
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   await page.screenshot({path:`${output}/comparison-${w}x${h}.jpg`,type:'jpeg',quality:90});
   await writeFile(`${output}/reference-comparison.html`, `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#19121d;color:#ffe2a0;font:20px Arial}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}figure{margin:0}img{width:100%;height:620px;object-fit:contain}figcaption{text-align:center;padding:8px}</style><main><figure><figcaption>User reference</figcaption><img src="reference-da-qiao.png"></figure><figure><figcaption>Actual Dai Qiao card ${w} x ${h}</figcaption><img src="da-qiao-card-${w}x${h}.jpg"></figure></main>`);
   await page.goto('http://127.0.0.1:5178/.vite/summon-qa/reference-comparison.html');
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   await page.screenshot({path:`${output}/reference-comparison-${w}x${h}.jpg`,type:'jpeg',quality:90});
  }
 }
 assert.deepEqual(errors,[]);await writeFile(`${output}/report.json`,JSON.stringify({report,errors},null,2));console.log(process.env.QA_FAST?'SUMMON_VISUAL_PREVIEW_READY':'SUMMON_VISUAL_QA_PASS');
} catch(e){if(page)await page.screenshot({path:`${output}/failure.png`});throw e;}
finally{await browser?.close();await server.close();}
