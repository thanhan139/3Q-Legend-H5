// Real Phaser and CloudRepository, isolated transport/UID fixtures; no remote payment or account writes.
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const out='.vite/vip-qa';await mkdir(out,{recursive:true});
await writeFile(`${out}/index.html`,'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(`${out}/fixture.ts`,`
import Phaser from 'phaser';import '../../src/style.css';
import {VIPScene} from '../../src/scenes/VIPScene';import {LobbyScene} from '../../src/scenes/LobbyScene';
import {baseSave,gameStore} from '../../src/domain/store';import {legacyTutorial} from '../../src/domain/tutorial';
import {VIP_LEVELS} from '../../src/data/vipConfig';import {vipLevel} from '../../src/domain/vip';
import {cloudRepository} from '../../src/cloud/cloudRepository';import {bindViewportResize} from '../../src/ui/resizeViewport';
import {screenBounds} from '../../src/ui/viewport';import {LOBBY_ASSETS} from '../../src/data/lobbyAssets';
import {PORTRAITS} from '../../src/ui/heroPresentation';import {BATTLE_SPRITES} from '../../src/ui/battleSprites';
const players=JSON.parse(localStorage.getItem('vip-qa-players')??'{}');let owner=localStorage.getItem('vip-qa-owner')??'qa-a';
const create=(level=0,gifts=false)=>({save:baseSave(),revision:'0',tutorial:legacyTutorial(),vip:{paidBaseKnbTotal:VIP_LEVELS[level].threshold,
 offers:gifts?['level','daily','weekly'].map(kind=>({kind,tier:level,period:kind==='level'?'once':kind==='daily'?'2026-11-17':'2026-W47',rewards:{golden_key:1},claimed:false})):[]}});
players[owner]??=create();const receipts=new Map();const api=cloudRepository as any;
const persist=()=>{localStorage.setItem('vip-qa-players',JSON.stringify(players));localStorage.setItem('vip-qa-owner',owner);};
const reply=()=>({status:'ok',...structuredClone(players[owner])});
api.owner=owner;api.current=structuredClone(players[owner]);gameStore.useCloudSave(players[owner].save);
api.send=async(intent:any)=>{
 if(!navigator.onLine)throw new Error('Không thể kết nối máy chủ');
 await new Promise(r=>setTimeout(r,45));
 if(intent.action==='load'&&window.qa?.holdLoad)await new Promise(resolve=>{window.qa.releaseLoad=resolve;});
 if(intent.action==='load')return window.qa?.missing?{...reply(),vip:undefined}:reply();
 if(intent.action!=='command'||intent.command.type!=='vipClaim')return{status:'rejected'};
 const state=players[owner],key=owner+intent.requestId;
 if(receipts.has(key))return{...reply(),receipt:receipts.get(key)};
 if(state.revision!==intent.revision)return{...reply(),status:'conflict'};
 const offer=state.vip.offers.find((o:any)=>o.tier===intent.command.tier&&o.kind===intent.command.kind&&o.period===intent.command.period);
 if(!offer||offer.claimed||offer.tier>vipLevel(state.vip.paidBaseKnbTotal))return{status:'rejected'};
 offer.claimed=true;state.save.goldKeys+=1;state.revision=String(Number(state.revision)+1);
 const receipt={rewards:offer.rewards};receipts.set(key,receipt);persist();
 if(window.qa.loseNextReply){window.qa.loseNextReply=false;throw new Error('Không thể kết nối máy chủ');}
 return{...reply(),receipt};
};
class Boot extends Phaser.Scene{constructor(){super('Boot');}preload(){
 for(const art of Object.values(LOBBY_ASSETS))this.load.image(art.key,art.url);
 this.load.spritesheet(PORTRAITS,'/assets/heroes/portraits.webp',{frameWidth:256,frameHeight:256});
 this.load.spritesheet(BATTLE_SPRITES,'/assets/heroes/battle-sprites.webp',{frameWidth:256,frameHeight:256});
}create(){this.scene.start('VIP');}}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,fps:{target:8,forceSetTimeOut:true},
 render:{antialias:true,pixelArt:false},scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,VIPScene,LobbyScene]});
bindViewportResize(game,document.getElementById('game')!);
const all=(items:any[]):any[]=>items.flatMap(o=>o.type==='Container'?[o,...all(o.getAll())]:[o]);
window.qa={game,gameStore,cloudRepository,screenBounds,players,missing:false,loseNextReply:false,holdLoad:false,releaseLoad:undefined,
 all:()=>all(game.scene.getScene('VIP').children.list),
 set:(level:number,gifts=false,uid=owner)=>{owner=uid;players[owner]=create(level,gifts);persist();
  api.owner=owner;api.current=structuredClone(players[owner]);api.pending=undefined;
  api.cache.update(owner,()=>({confirmed:api.current}));gameStore.useCloudSave(players[owner].save);
  const s=game.scene.getScene('VIP') as any;s.selected=level;s.start=Math.max(0,Math.min(12,level-3));s.tab='privileges';s.render();},
 select:(level:number)=>{const s=game.scene.getScene('VIP') as any;s.selected=level;s.start=Math.max(0,Math.min(12,level-3));s.render();},
};
`);
const server=await createServer({server:{host:'127.0.0.1',port:5182,watch:{ignored:['**/.vite/vip-qa/**']}},clearScreen:false});await server.listen();
let browser,page;const errors=[],reports=[];
try{
 browser=await chromium.launch({...(process.platform==='win32'?{executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});page.on('pageerror',e=>{errors.push(e.message);console.error('VIP browser:',e.message);});
 await page.route('https://*.supabase.co/**',route=>route.abort());
 await page.goto('http://127.0.0.1:5182/.vite/vip-qa/index.html');
 const ready=()=>page.waitForFunction(()=>window.qa?.game.scene.isActive('VIP')&&window.qa.game.scene.getScene('VIP').content?.fields.length>15,null,{timeout:60000});await ready();
 const step=()=>page.evaluate(()=>new Promise(resolve=>window.qa.game.events.once('postrender',()=>resolve(true))));
 const shot=async(name)=>{await step();await page.evaluate(()=>window.qa.game.loop.sleep());try{await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:94,timeout:60000});}finally{await page.evaluate(()=>window.qa.game.loop.wake());}};
 const audit=()=>page.evaluate(()=>{const s=window.qa.game.scene.getScene('VIP'),c=window.qa.game.canvas.getBoundingClientRect(),ratio=c.width/window.qa.game.scale.width,all=window.qa.all();
  return {...s.content.audit(),canvas:c.toJSON(),selected:s.selected,owner:window.qa.cloudRepository.uid,level:window.qa.cloudRepository.vip?.paidBaseKnbTotal,
   badges:all.filter(o=>o.name.includes('badge')).map(o=>({name:o.name,texture:o.texture.key,scale:o.scaleX*ratio,uniform:o.scaleX===o.scaleY,bounds:window.qa.screenBounds(o.getBounds(),s.cameras.main)})),
   hits:all.filter(o=>o.input).map(o=>{const b=window.qa.screenBounds(o.getBounds(),s.cameras.main);return{name:o.name,x:b.x*ratio,y:b.y*ratio,w:b.width*ratio,h:b.height*ratio};}),
   paths:window.qa.game.textures.getTextureKeys().map(key=>window.qa.game.textures.get(key).getSourceImage()?.src??'')};});
 const check=(a,w,h)=>{assert.ok(Math.abs(a.canvas.width-w)<1&&Math.abs(a.canvas.height-h)<1);assert.deepEqual(a.fields.filter(f=>!f.fits),[]);
  assert.ok(a.badges.every(b=>b.uniform&&b.scale<=1.001));assert.ok(!a.paths.some(p=>p.includes('source_atlases')));
  const crestWidths=a.badges.filter(b=>b.name.startsWith('vip.tier-badge.')).map(b=>b.bounds.width);
  assert.ok(Math.max(...crestWidths)/Math.min(...crestWidths)<1.02,'VIP rail crests must share a common visible width');
  for(const hit of a.hits)assert.ok(hit.x>=-1&&hit.y>=-1&&hit.x+hit.w<=w+1&&hit.y+hit.h<=h+1,hit.name);
  for(const field of a.fields)assert.ok(!/[\uFFFD?]/.test(field.displayed));};
 const hit=async(name,double=false)=>{const point=await page.evaluate(name=>{const o=window.qa.all().find(o=>o.name===name),s=window.qa.game.scene.getScene('VIP'),b=window.qa.screenBounds(o.getBounds(),s.cameras.main),c=window.qa.game.canvas.getBoundingClientRect(),r=c.width/window.qa.game.scale.width;return{x:c.x+(b.x+b.width/2)*r,y:c.y+(b.y+b.height/2)*r};},name);
  if(double)await page.mouse.dblclick(point.x,point.y,{delay:5});else await page.touchscreen.tap(point.x,point.y);await step();};
 for(const [w,h] of [[1920,1080],[1280,720],[844,390]]){
  await page.setViewportSize({width:w,height:h});await step();
  for(const level of [0,5,7,10,15,16,17,18]){
   await page.evaluate(level=>window.qa.set(level),level);await step();const a=await audit();check(a,w,h);
   assert.equal(a.selected,level);assert.ok(a.badges.some(b=>b.name==='vip.selected-badge'&&b.texture===`vip.badge.${level}`));
   await shot(`vip-${level}-${w}x${h}`);reports.push({case:'privileges',w,h,level,...a});
  }
  await hit('vip.tab.gifts');let a=await audit();check(a,w,h);assert.ok(a.fields.some(f=>f.displayed==='Đang phát triển'));await shot(`gifts-empty-${w}x${h}`);
  await hit('vip.tab.shop');a=await audit();check(a,w,h);await shot(`shop-${w}x${h}`);
  console.log(`VIP_VISUAL_PASS ${w}x${h}: 0/5/7/10/15/16/17/18, gifts, shop`);
 }
 // Browse every badge through actual hitboxes/arrows; count all nineteen, not one atlas.
 await page.evaluate(()=>window.qa.set(0));await step();
 const visited=new Set();
 for(const start of [0,7,12]){
  if(start)await hit('vip.next');
  const levels=await page.evaluate(()=>window.qa.all().filter(o=>o.name.startsWith('vip.tier.')).map(o=>Number(o.name.split('.').pop())));
  for(const level of levels){await hit(`vip.tier.${level}`);visited.add(level);assert.equal((await audit()).selected,level);}
 }
 assert.equal(visited.size,19);
 await page.evaluate(async()=>{window.qa.set(5);window.qa.players[window.qa.cloudRepository.uid].vip.paidBaseKnbTotal=400000;await window.qa.cloudRepository.refresh();});await step();
 assert.ok((await audit()).fields.some(f=>f.id==='progress'&&f.fullValue.includes('100.000')));await shot('progress-mid-mobile');
 // A repeat click, dropped reply/retry and reload must never grant a second gift.
 // The redesigned overview exposes the actual level gift directly beside privileges.
 await page.evaluate(()=>window.qa.set(5,true,'qa-a'));await step();
 const before=await page.evaluate(()=>window.qa.gameStore.snapshot.goldKeys);
 await hit('vip.claim.level',true);await page.waitForFunction(()=>!window.qa.game.scene.getScene('VIP').busy);
 assert.equal(await page.evaluate(()=>window.qa.gameStore.snapshot.goldKeys),before+1);
 await shot('gift-claimed-mobile');
 await hit('vip.tab.gifts');
 await page.evaluate(()=>{window.qa.loseNextReply=true;});await hit('vip.claim.daily');await page.waitForFunction(()=>!window.qa.game.scene.getScene('VIP').busy);
 assert.equal(await page.evaluate(()=>window.qa.gameStore.snapshot.goldKeys),before+1);
 await hit('vip.claim.daily');await page.waitForFunction(()=>!window.qa.game.scene.getScene('VIP').busy);
 assert.equal(await page.evaluate(()=>window.qa.gameStore.snapshot.goldKeys),before+2);
 await page.reload();await ready();assert.equal(await page.evaluate(()=>window.qa.gameStore.snapshot.goldKeys),before+2);
 await hit('vip.tab.gifts');assert.ok((await audit()).fields.filter(f=>f.displayed==='Đã nhận').length>=2);
 await page.evaluate(()=>window.qa.set(0,false,'qa-b'));await hit('vip.tab.gifts');
 assert.equal(await page.evaluate(()=>window.qa.gameStore.snapshot.goldKeys),before);assert.ok(!(await audit()).fields.some(f=>f.displayed==='Đã nhận'));
 await page.evaluate(()=>window.qa.select(18));await step();await shot('locked-mobile');
 await page.evaluate(()=>{window.qa.holdLoad=true;void window.qa.game.scene.getScene('VIP').refresh();});
 await page.waitForFunction(()=>window.qa.game.scene.getScene('VIP').loading);await shot('loading-mobile');
 await page.evaluate(()=>{window.qa.holdLoad=false;window.qa.releaseLoad();});await page.waitForFunction(()=>!window.qa.game.scene.getScene('VIP').loading);
 await page.context().setOffline(true);await hit('vip.refresh');await page.waitForFunction(()=>!window.qa.game.scene.getScene('VIP').loading);
 assert.ok((await audit()).fields.some(f=>f.fullValue==='Không thể kết nối máy chủ'));await shot('offline-mobile');await page.context().setOffline(false);
 await page.evaluate(()=>{window.qa.missing=true;});await hit('vip.refresh');await page.waitForFunction(()=>!window.qa.game.scene.getScene('VIP').loading);await shot('backend-pending-mobile');
 await page.evaluate(()=>{window.qa.missing=false;window.qa.set(0);window.qa.game.scene.getScene('VIP').scene.start('Lobby');});
 await page.waitForFunction(()=>window.qa.game.scene.isActive('Lobby')&&window.qa.game.scene.getScene('Lobby').content?.fields.length>10);
 const button=await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Lobby'),walk=items=>items.flatMap(o=>o.type==='Container'?[o,...walk(o.getAll())]:[o]),o=walk(s.children.list).find(o=>o.name==='lobby.vip'),c=window.qa.game.canvas.getBoundingClientRect(),r=c.width/window.qa.game.scale.width,b=o.getBounds();return{x:(b.x+b.width/2)*r,y:(b.y+b.height/2)*r};});
 await page.mouse.click(button.x,button.y);await ready();await shot('lobby-vip-entry-mobile');
 // Badge perimeter audit against light/dark checkerboards, using the actual individual source PNGs.
 const badges=Array.from({length:19},(_,i)=>`<figure><img src="/assets/vip/badges/vip_${String(i).padStart(2,'0')}.png"><figcaption>VIP ${i}</figcaption></figure>`).join('');
 await writeFile(`${out}/badge-audit.html`,`<!doctype html><meta charset="utf-8"><style>body{background:#21121a;color:#ffe5a1;font:16px Arial}main{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}figure{margin:0;padding:10px;background:repeating-conic-gradient(#e7d9c8 0% 25%,#341820 0% 50%) 0/20px 20px}img{width:100%;height:150px;object-fit:contain}figcaption{background:#21121a;text-align:center}</style><main>${badges}</main>`);
 await page.setViewportSize({width:1400,height:900});await page.goto('http://127.0.0.1:5182/.vite/vip-qa/badge-audit.html');
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await page.screenshot({path:`${out}/badge-audit.jpg`,type:'jpeg',quality:95});
 assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({reports,errors,all19BadgesVisited:visited.size,realPaymentGatewayTested:false,realAccountLoginTested:false},null,2));
 console.log('VIP_QA_PASS: all 19 badges, real repository + isolated transport, duplicate/lost-reply/UID/reload/offline and Lobby entry');
}finally{await browser?.close();await server.close();}
