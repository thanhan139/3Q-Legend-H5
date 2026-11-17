// Isolated real-scene WebGL QA. Never authenticates or writes to Supabase.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const output = '.vite/inventory-qa';
await mkdir(output, {recursive:true});
await writeFile(`${output}/index.html`, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="game"></div><script type="module" src="./fixture.ts"></script></body></html>');
await writeFile(`${output}/fixture.ts`, `
import Phaser from 'phaser';
import '../../src/style.css';
import { InventoryScene } from '../../src/scenes/InventoryScene';
import { LobbyScene } from '../../src/scenes/LobbyScene';
import { gameStore, baseSave } from '../../src/domain/store';
import { cloudRepository } from '../../src/cloud/cloudRepository';
import { HEROES } from '../../src/data/heroes';
import { LOBBY_ASSETS } from '../../src/data/lobbyAssets';
import { PORTRAITS, PORTRAIT_TILE } from '../../src/ui/heroPresentation';
import { BATTLE_SPRITES } from '../../src/ui/battleSprites';
import { bindViewportResize } from '../../src/ui/resizeViewport';
import { screenBounds } from '../../src/ui/viewport';
const make=(kind:string)=>({...baseSave(),goldKeys:kind==='empty'?0:3,trainingExp:kind==='empty'?0:2550,
 gems:kind==='empty'?0:300,copper:500000,coins:98760,clearedStages:['1-1','1-2','1-3'],
 forge:{shards:kind==='empty'?0:20,stones:kind==='empty'?0:5,premiumClaimed:false,crafted:0,rewardedBattles:[]},
 heroShards:kind==='empty'?{}:kind==='few'?{'da-qiao':10}:Object.fromEntries(HEROES.map((hero,i)=>[hero.id,(i+1)*10]))});
const selected=localStorage.getItem('inventory-fixture-kind')??'many';
(cloudRepository as any).owner=localStorage.getItem('inventory-fixture-owner')??'qa-uid-a';
gameStore.useCloudSave(make(selected));
class Boot extends Phaser.Scene {
 constructor(){super('Boot');}
 preload(){
  for(const asset of Object.values(LOBBY_ASSETS)) this.load.image(asset.key,asset.url);
  this.load.spritesheet(PORTRAITS,'/assets/heroes/portraits.webp',{frameWidth:PORTRAIT_TILE,frameHeight:PORTRAIT_TILE});
  this.load.spritesheet(BATTLE_SPRITES,'/assets/heroes/battle-sprites.webp',{frameWidth:256,frameHeight:256});
 }
 create(){this.scene.start('Inventory');}
}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,
 fps:{target:8,forceSetTimeOut:true},render:{antialias:true,pixelArt:false},
 scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,InventoryScene,LobbyScene]});
bindViewportResize(game,document.getElementById('game')!);
const all=(items:any[]):any[]=>items.flatMap(o=>o.type==='Container'?[o,...all(o.getAll())]:[o]);
window.qa={game,gameStore,cloudRepository,screenBounds,make,HEROES,all:()=>all(game.scene.getScene('Inventory').children.list),
 set:(kind:string,owner='qa-uid-a')=>{localStorage.setItem('inventory-fixture-kind',kind);localStorage.setItem('inventory-fixture-owner',owner);
  (cloudRepository as any).owner=owner;gameStore.useCloudSave(make(kind));},
 long:()=>{for(const hero of HEROES) hero.name='Đặng Trường Nguyễn Hoàng Phượng';},
};
`);
const server=await createServer({server:{host:'127.0.0.1',port:5181,watch:{ignored:['**/.vite/inventory-qa/**']}},clearScreen:false});
await server.listen();let browser,page;const errors=[],report=[];
try {
 browser=await chromium.launch({...(process.platform==='win32'?{executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});
 page.on('pageerror',e=>{errors.push(e.message);console.error('Inventory browser error:',e.message);});
 await page.route('https://*.supabase.co/**',route=>route.abort());
 await page.goto('http://127.0.0.1:5181/.vite/inventory-qa/index.html');
 const ready=()=>page.waitForFunction(()=>window.qa?.game.scene.isActive('Inventory')&&window.qa.game.scene.getScene('Inventory').content?.fields.length>8,null,{timeout:60000});
 await ready();
 const step=()=>page.evaluate(()=>new Promise(resolve=>window.qa.game.events.once('postrender',()=>resolve(true))));
 const shot=async(name)=>{await step();await page.evaluate(()=>window.qa.game.loop.sleep());
  try{await page.screenshot({path:`${output}/${name}.jpg`,type:'jpeg',quality:92,timeout:60000});}
  finally{await page.evaluate(()=>window.qa.game.loop.wake());}};
 const audit=()=>page.evaluate(()=>{
  const s=window.qa.game.scene.getScene('Inventory'),all=window.qa.all(),canvas=window.qa.game.canvas.getBoundingClientRect();
  const ratio=canvas.width/window.qa.game.scale.width;
  return {...s.content.audit(),columns:s.layout.columns,count:s.entries.length,selected:s.selected,offset:s.offset,detailOpen:s.detailOpen,
   gameWidth:window.qa.game.scale.width,gameHeight:window.qa.game.scale.height,
   entries:s.entries,canvas:canvas.toJSON(),hits:all.filter(o=>o.input&&o.name.startsWith('inventory.')).map(o=>{const b=window.qa.screenBounds(o.getBounds(),s.cameras.main);
    return {name:o.name,x:b.x*ratio,y:b.y*ratio,width:b.width*ratio,height:b.height*ratio};}),
   icons:all.filter(o=>o.name.startsWith('inventory.icon.')).map(o=>({name:o.name,scaleX:o.scaleX,scaleY:o.scaleY,cssScale:o.scaleX*ratio})),
   background:all.find(o=>o.texture?.key==='inventory.background')?.getBounds(),
   loadedFont:[...document.fonts].some(f=>f.family==='InventoryVietnamese'&&f.status==='loaded'),
   textures:window.qa.game.textures.getTextureKeys()};
 });
 const check=(a,w,h)=>{
  assert.ok(Math.abs(a.canvas.width-w)<1&&Math.abs(a.canvas.height-h)<1);
  assert.ok(a.loadedFont);assert.deepEqual(a.fields.filter(f=>!f.fits),[]);
  assert.ok(a.icons.every(i=>i.scaleX<=1&&i.cssScale<=1.001&&i.scaleX===i.scaleY));
  assert.ok(a.background.width>=a.gameWidth&&a.background.height>=a.gameHeight);
  assert.ok(!a.textures.some(key=>/icons_reference|APPROVED_CONCEPT/.test(key)));
  for(const hit of a.hits) assert.ok(hit.x>=-1&&hit.y>=-1&&hit.x+hit.width<=w+1&&hit.y+hit.height<=h+1,`hit outside: ${hit.name}`);
 };
 const hit=async(name)=>{const p=await page.evaluate(name=>{
  const s=window.qa.game.scene.getScene('Inventory'),o=window.qa.all().find(o=>o.name===name),b=window.qa.screenBounds(o.getBounds(),s.cameras.main);
  const canvas=window.qa.game.canvas.getBoundingClientRect(),ratio=canvas.width/window.qa.game.scale.width;
  return {x:canvas.x+(b.x+b.width/2)*ratio,y:canvas.y+(b.y+b.height/2)*ratio};},name);await page.mouse.click(p.x,p.y);await step();};
 const cell=async(index)=>{const p=await page.evaluate(index=>{
  const s=window.qa.game.scene.getScene('Inventory'),b=s.layout.cell(index),canvas=window.qa.game.canvas.getBoundingClientRect();
  const point=window.qa.screenBounds({x:b.x,y:b.y-s.offset,width:b.width,height:b.height},s.cameras.main),ratio=canvas.width/window.qa.game.scale.width;
  return {x:canvas.x+(point.x+point.width/2)*ratio,y:canvas.y+(point.y+point.height/2)*ratio};},index);
  await page.touchscreen.tap(p.x,p.y);await step();};
 for(const [w,h] of [[1920,1080],[1280,720],[844,390]]) {
  await page.setViewportSize({width:w,height:h});await step();await page.evaluate(()=>window.qa.set('many'));await page.waitForTimeout(350);await step();
  let a=await audit();check(a,w,h);assert.equal(a.columns,w===844?3:5);assert.ok(a.count>20);
  await shot(`many-${w}x${h}`);report.push({case:'many',w,h,...a});
  const baseline=await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot));
  await hit('inventory.tab.fragments');a=await audit();assert.ok(a.entries.every(e=>e.category==='fragments'));
  await cell(0);a=await audit();check(a,w,h);assert.ok(a.fields.some(f=>f.id==='detail.name'));
  await shot(`fragment-${w}x${h}`);report.push({case:'fragment',w,h,...a});
  if(w===844){assert.ok(a.detailOpen);await hit('inventory.close-detail');assert.equal((await audit()).detailOpen,false);}
  for(const category of ['resources','items','divine']) {
   await hit(`inventory.tab.${category}`);a=await audit();check(a,w,h);
   assert.ok(a.entries.length>0&&a.entries.every(e=>e.category===category));
  }
  await hit('inventory.tab.all');
  const grid=await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Inventory'),c=window.qa.game.canvas.getBoundingClientRect(),r=c.width/window.qa.game.scale.width;
   return {x:(s.layout.viewport.x+30)*r,y:(s.layout.viewport.y+80)*r};});
  await page.mouse.move(grid.x,grid.y);await page.mouse.wheel(0,1600);await step();
  assert.ok((await audit()).offset>0);await shot(`scrolled-${w}x${h}`);
  // A drag must scroll without selecting or opening a detail overlay.
  await page.mouse.move(grid.x+40,grid.y+90);await page.mouse.down();await page.mouse.move(grid.x+40,grid.y-20,{steps:5});await page.mouse.up();await step();
  assert.equal((await audit()).detailOpen,false);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot)),baseline);
  await page.evaluate(()=>window.qa.set('few'));await page.waitForTimeout(350);await step();
  a=await audit();check(a,w,h);assert.equal(a.count,6);await shot(`few-${w}x${h}`);report.push({case:'few',w,h,...a});
  await page.evaluate(()=>window.qa.set('empty'));await page.waitForTimeout(350);await step();
  a=await audit();check(a,w,h);assert.equal(a.count,0);await shot(`empty-${w}x${h}`);report.push({case:'empty',w,h,...a});
  console.log(`INVENTORY_VISUAL_PASS ${w}x${h} grid/filter/detail/scroll/touch/empty`);
 }
 // Owner swap/reload use isolated UID snapshots, never real auth or server writes.
 await page.evaluate(()=>window.qa.set('few','qa-uid-b'));await page.waitForTimeout(350);await step();
 assert.equal((await audit()).entries.find(e=>e.heroId)?.heroId,'da-qiao');
 await page.reload();await ready();assert.equal((await audit()).count,6);
 const before=await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot));
 await page.context().setOffline(true);await hit('inventory.tab.fragments');await cell(0);await shot('offline-detail');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot)),before);await page.context().setOffline(false);
 await hit('inventory.close-detail');
 await page.evaluate(()=>{window.qa.long();window.qa.set('many','qa-uid-a');});await page.waitForTimeout(350);await step();
 await hit('inventory.tab.fragments');await cell(0);const long=await audit();assert.ok(long.fields.every(f=>f.fits));await shot('long-vietnamese-mobile');
 await hit('inventory.close-detail');
 await page.evaluate(()=>window.qa.game.scene.getScene('Inventory').scene.start('Lobby'));
 await page.waitForFunction(()=>window.qa.game.scene.isActive('Lobby')&&window.qa.game.scene.getScene('Lobby').content?.fields.length>10);
 const lobbyDock=await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Lobby'),l=s.layout(),c=window.qa.game.canvas.getBoundingClientRect(),r=c.width/window.qa.game.scale.width;
  return {x:l.dock[2]*r,y:l.dockY*r};});
 await page.mouse.click(lobbyDock.x,lobbyDock.y);await page.locator('.inventory-category-menu').waitFor();
 assert.equal(await page.locator('[data-category]').count(),13);
 await page.locator('[data-category="1"]').click();await page.getByRole('status').filter({hasText:'đang hoàn thiện'}).waitFor();
 await shot('lobby-menu-mobile');await page.keyboard.press('Escape');assert.equal(await page.locator('.inventory-category-menu').count(),0);
 await page.mouse.click(lobbyDock.x,lobbyDock.y);await page.locator('.inventory-category-menu').waitFor();await page.mouse.click(lobbyDock.x,lobbyDock.y);
 assert.equal(await page.locator('.inventory-category-menu').count(),0);
 await page.mouse.click(lobbyDock.x,lobbyDock.y);await page.locator('.inventory-category-menu').waitFor();await page.mouse.click(2,2);
 assert.equal(await page.locator('.inventory-category-menu').count(),0);
 await page.mouse.click(lobbyDock.x,lobbyDock.y);await page.locator('.inventory-category-menu').waitFor();
 await page.locator('[data-category="0"]').click();await ready();assert.equal(await page.locator('.inventory-category-menu').count(),0);
 // Reference extraction audit: show all 20 optional icons against a checkerboard; none enter runtime.
 const mapping=JSON.parse(await readFile('docs/inventory/PHASER_TEXTURE_MAPPING.json','utf8'));
 const icons=Object.values(mapping).filter(m=>m.file.startsWith('assets/icons_reference/'));
 await writeFile(`${output}/audit.html`,`<!doctype html><meta charset="utf-8"><style>body{background:#24151a;color:#fff;font:14px Arial}main{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}figure{margin:0;padding:8px;background:repeating-conic-gradient(#704b40 0% 25%,#2e1b23 0% 50%) 0/20px 20px}img{width:128px;height:128px}figcaption{background:#24151a}</style><main>${icons.map(m=>`<figure><img src="../inventory-kit/${m.file}"><figcaption>${m.file.split('/').pop()}</figcaption></figure>`).join('')}</main>`);
 await page.setViewportSize({width:1000,height:800});await page.goto('http://127.0.0.1:5181/.vite/inventory-qa/audit.html');
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.screenshot({path:`${output}/optional-icons-audit.jpg`,type:'jpeg',quality:95});
 await writeFile(`${output}/comparison.html`, `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#201216;color:#ffe1a0;font:18px Arial}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}figure{margin:0}img{width:100%;height:600px;object-fit:contain}figcaption{text-align:center;padding:10px}</style><main><figure><figcaption>Approved concept (illustrative quantities)</figcaption><img src="../inventory-kit/docs/APPROVED_CONCEPT_REFERENCE.jpg"></figure><figure><figcaption>Actual Inventory scene (isolated QA save)</figcaption><img src="many-1280x720.jpg"></figure></main>`);
 await page.setViewportSize({width:1920,height:650});await page.goto('http://127.0.0.1:5181/.vite/inventory-qa/comparison.html');
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.screenshot({path:`${output}/reference-comparison.jpg`,type:'jpeg',quality:95});
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/report.json`,JSON.stringify({report,errors,realSupabaseAuthTested:false},null,2));
 console.log('INVENTORY_QA_PASS: real renderer; fixture UID/reload/network isolation; lobby menu; no remote writes');
} finally {await browser?.close();await server.close();}
