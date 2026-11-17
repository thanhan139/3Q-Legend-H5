// Real BattleScene + BattleEngine; isolated local fixture, no account/server writes.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const phase=process.env.CHIBI_QA_PHASE??'full',out='.vite/chibi-'+phase+'-qa';await mkdir(out,{recursive:true});
await writeFile(`${out}/index.html`,'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(`${out}/fixture.ts`,`
import Phaser from 'phaser';import '../../src/style.css';
import {BattleScene} from '../../src/scenes/BattleScene';import {gameStore,baseSave} from '../../src/domain/store';
import {heroAnimationTexture} from '../../src/ui/HeroAnimationController';
import {BATTLE_SPRITES} from '../../src/ui/battleSprites';import {PORTRAITS} from '../../src/ui/heroPresentation';
import {SKILL_TEXTURES,skillTextureKey,skillTexturePath} from '../../src/data/skillVfx';
import {makeArenaPracticeBattle} from '../../src/domain/battle';
import {battleFormationPosition} from '../../src/data/battleLayout';
import {CHIBI_SOURCES,chibiFoot} from '../../src/data/chibiBattle';
import {bindViewportResize} from '../../src/ui/resizeViewport';import {screenBounds} from '../../src/ui/viewport';
const selected=new URLSearchParams(location.search).get('heroes')?.split(',').filter(id=>CHIBI_SOURCES[id]);
const roster=selected?.length===6?selected:['guan-yu','liu-bei','zhang-fei','zhao-yun','dian-wei','lu-bu'];const save=baseSave();
save.heroes=roster;save.formation=roster;gameStore.useCloudSave(save);
let finishes=0;class Arena extends Phaser.Scene{constructor(){super('Arena');}create(){finishes++;}}
class Boot extends Phaser.Scene{constructor(){super('Boot');}preload(){
 for(const id of ['guan-yu','liu-bei','zhang-fei'])this.load.spritesheet(heroAnimationTexture(id),'/assets/battle/heroes/'+id+'/poses.webp',{frameWidth:256,frameHeight:256});
 this.load.spritesheet(BATTLE_SPRITES,'/assets/heroes/battle-sprites.webp',{frameWidth:256,frameHeight:256});
 this.load.spritesheet(PORTRAITS,'/assets/heroes/portraits.webp',{frameWidth:256,frameHeight:256});
 this.load.image('battle-courtyard','/assets/battle/backgrounds/courtyard.webp');
 for(const id of SKILL_TEXTURES)this.load.image(skillTextureKey(id),'/'+skillTexturePath(id));
}create(){
 this.scene.start('Battle',{arenaPractice:true});}}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,
 // No delta warm-up in the software-rendered QA fixture; production FPS config is unchanged.
 fps:{target:60,smoothStep:false},scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,BattleScene,Arena]});
bindViewportResize(game,document.getElementById('game')!);
const scene=()=>game.scene.getScene('Battle') as any;
const ink=(view:any,id:string)=>{
 const source=CHIBI_SOURCES[id],sprite=view.sprite,box=source.clipBounds&&sprite.texture.key.startsWith('battle-poses-')?
  source.clipBounds[Number(sprite.frame.name)]:source.staticBounds;
 const matrix=sprite.getWorldTransformMatrix(),a=matrix.transformPoint(box[0]-sprite.displayOriginX,box[1]-sprite.displayOriginY),
  b=matrix.transformPoint(box[2]-sprite.displayOriginX,box[3]-sprite.displayOriginY);
 return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};
};
const hud=(view:any)=>{
 const boxes=view.card.list.filter((o:any)=>o.visible&&!(o.type==='Text'&&!o.text)).map((o:any)=>o.getBounds());
 const x=Math.min(...boxes.map((b:any)=>b.x)),y=Math.min(...boxes.map((b:any)=>b.y));
 return{x,y,width:Math.max(...boxes.map((b:any)=>b.right))-x,height:Math.max(...boxes.map((b:any)=>b.bottom))-y};
};
window.qa={game,gameStore,screenBounds,roster,done:false,events:[],finishes:()=>finishes,
 restart:()=>{game.scene.stop('Arena');game.scene.stop('Battle');game.scene.start('Battle',{arenaPractice:true});},
 reset:(natural=false)=>{const s=scene();s.bridge.cancel();s.tweens.killAll();s.time.removeAllEvents();s.intro?.destroy();s.intro=undefined;
  s.cutIn?.destroy();s.cutIn=undefined;s.skillVfx.clear();
  for(const child of [...s.children.list])if((child.type==='Image'&&child.texture.key.startsWith('skill-vfx-'))||
   (child.type==='Text'&&child.text.startsWith('TỔNG SÁT THƯƠNG')))child.destroy();
  for(const popup of s.floatingPool)popup.setVisible(false).setActive(false);
  s.lines=[];s.log.setText('');s.engine=makeArenaPracticeBattle(roster,{});s.ending=false;
  s.speed=1;s.paused=false;s.presenting=true;s.applyPlaybackRate();
  for(const u of s.engine.units){u.hp=u.maxHp=10000;if(!natural)u.nextActionAt=u.uid==='player-0'?0:100;u.rage=0;
   const v=s.views.get(u.uid);v.hit.setAlpha(0);v.character.revive();v.character.settle();v.animation.revive();}
  s.syncHud(s.engine);window.qa.done=false;
 },
 advance:()=>{const s=scene();window.qa.done=false;const events=s.engine.step();window.qa.events=structuredClone(events);
  const duration=s.presentAction(s.engine,events);s.bridge.after(duration+85,()=>{s.syncHud(s.engine);window.qa.done=true;});return duration;},
 audit:()=>{const s=scene(),c=game.canvas.getBoundingClientRect(),r=c.width/game.scale.width;
  return{canvas:{width:c.width,height:c.height},turn:s.engine.turn,vs:!!s.children.getByName('battle.intro-vs'),
   units:[...s.views.entries()].map(([uid,v]:any)=>({uid,dead:v.character.dead,visible:v.art.visible,hud:v.card.visible,
    x:v.art.x,y:v.art.y,home:v.character.footAnchor,state:v.animation.currentState,animated:v.animation.available,
    rig:!!v.sprite.getData('remasterRig'),scale:v.sprite.scaleX,origin:{x:v.sprite.originX,y:v.sprite.originY},
    playing:v.animation.isPlaying??v.sprite.anims?.isPlaying,frame:v.sprite.getData('remasterRig')?JSON.stringify(v.animation.debug().pose):v.sprite.frame.name,
    texture:v.sprite.getData('remasterRig')?'remaster.'+v.sprite.heroId:v.sprite.texture.key,hpRatio:v.hp.scaleX,
    bodyWorld:ink(v,s.engine.units.find((u:any)=>u.uid===uid).heroId),hudWorld:hud(v),
    nameFits:v.card.list[1].width<=v.card.list[0].displayWidth*.77+1&&v.card.list[1].height<=v.card.list[0].displayHeight,
    bounds:screenBounds(ink(v,s.engine.units.find((u:any)=>u.uid===uid).heroId),s.cameras.main),uniform:Math.abs(v.sprite.scaleX)===Math.abs(v.sprite.scaleY)})),
   counts:s.aliveCounts,fields:s.ui.content.audit().fields,removedUi:s.children.list.filter((o:any)=>o.type==='Text'&&/QUÂN TA|QUÂN ĐỊCH|Tạm dừng|Tiếp tục/.test(o.text)).map((o:any)=>o.text),fps:game.loop.actualFps,ratio:r,log:structuredClone(s.engine.log)};
 }};
`);
const server=await createServer({server:{host:'127.0.0.1',port:5186,watch:null},clearScreen:false});await server.listen();
 let browser;const errors=[],reports=[];
try{
 browser=await chromium.launch({...(process.platform==='win32'?{executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});page.on('pageerror',e=>{errors.push(e.message);console.error('Battle browser:',e.message);});
 const artRequests=[];page.on('request',r=>{if(/remaster|characterRig|RigAnimation/.test(r.url()))artRequests.push(r.url());});
 await page.route('https://*.supabase.co/**',r=>r.abort());await page.goto('http://127.0.0.1:5186/'+out+'/index.html');
 await page.waitForFunction(()=>window.qa?.game.scene.getScene('Battle').views?.size===12,null,{timeout:90000});
 const wait=ms=>page.waitForTimeout(ms),audit=()=>page.evaluate(()=>window.qa.audit());
 const resize=async(width,height)=>{await page.setViewportSize({width,height});await page.waitForFunction(({width,height})=>{
  const box=window.qa.game.canvas.getBoundingClientRect();return Math.abs(box.width-width)<1&&Math.abs(box.height-height)<1;
 },{width,height});await page.evaluate(()=>new Promise(resolve=>window.qa.game.events.once('postrender',()=>resolve(true))));};
 const tap=async(x,y)=>{const p=await page.evaluate(({x,y})=>{const s=window.qa.game.scene.getScene('Battle'),b=window.qa.screenBounds({x,y,width:0,height:0},s.cameras.main),c=window.qa.game.canvas.getBoundingClientRect(),r=c.width/window.qa.game.scale.width;return{x:c.x+b.x*r,y:c.y+b.y*r};},{x,y});await page.touchscreen.tap(p.x,p.y);};
 const shot=async name=>{await page.evaluate(()=>window.qa.game.loop.sleep());try{await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:94,timeout:60000});}finally{await page.evaluate(()=>window.qa.game.loop.wake());}};
 await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');s.paused=true;s.applyPlaybackRate();});
 assert.equal((await audit()).vs,true);await shot('intro-vs');
 await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');s.paused=false;s.applyPlaybackRate();});
 await page.waitForFunction(()=>!window.qa.game.scene.getScene('Battle').intro);
 for(const [width,height] of [[1920,1080],[1280,720],[844,390]]){
  await resize(width,height);await page.evaluate(()=>window.qa.reset(true));await wait(350);
  const a=await audit();await shot('remaster-layout-'+width+'x'+height);assert.equal(a.units.length,12);assert.equal(a.vs,false);assert.ok(a.units.every(u=>u.uniform));
  assert.ok(Math.abs(a.canvas.width-width)<1&&Math.abs(a.canvas.height-height)<1);
  assert.deepEqual(a.removedUi,[]);assert.deepEqual(a.fields.filter(f=>!f.fits),[]);
  assert.equal(a.units.filter(u=>u.animated).length,6);assert.equal(a.units.filter(u=>u.rig).length,0);
  assert.ok(a.units.every(u=>u.nameFits));
  for(const side of ['player','enemy']){const units=a.units.filter(u=>u.uid.startsWith(side));assert.equal(new Set(units.map(u=>u.x)).size,2);assert.equal(new Set(units.map(u=>u.y)).size,3);}
  for(const u of a.units){const b=u.bounds;assert.ok(b.x>=0&&b.y>=80&&b.x+b.width<=windowWidth(a)&&b.y+b.height<603,u.uid);}
  for(const u of a.units)for(const other of a.units){if(u.uid===other.uid||u.x!==other.x||u.y>=other.y)continue;
   assert.ok(u.hudWorld.y+u.hudWorld.height<=other.bodyWorld.y+1,JSON.stringify({hud:u.uid,bottom:u.hudWorld.y+u.hudWorld.height,next:other.uid,top:other.bodyWorld.y}));}
  await shot('idle-'+width+'x'+height);reports.push({width,height,...a});
  await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');for(const u of s.engine.units)if(u.side==='player'&&[2,5].includes(u.slot))u.hp=0;s.syncHud(s.engine);});
  await page.waitForFunction(()=>window.qa.audit().units.filter(u=>u.visible).length===10);
  const sparse=await audit();assert.equal(sparse.units.filter(u=>u.visible).length,10);assert.equal(sparse.counts.player,4);
  await shot('4v6-'+width+'x'+height);await page.evaluate(()=>window.qa.reset(true));
 }
 // Required two-hero gate, using actual resolved actions for strike, hit and KO.
 for(const [width,height] of phase==='pilot'?[[1920,1080],[1280,720],[844,390]]:[[1280,720],[844,390]]){
  await resize(width,height);
  for(const slot of [0,3])for(const mode of ['attack','hit','death']){
   await page.evaluate(({slot,mode})=>{
    window.qa.reset();const game=window.qa.game,s=game.scene.getScene('Battle');game.loop.sleep();
    const receiving=mode!=='attack',actor=receiving?'enemy-0':'player-'+slot;
    for(const u of s.engine.units){u.nextActionAt=u.uid===actor?0:1e6;
     if(receiving&&u.side==='player'&&u.slot!==slot)u.hp=0;
     if(u.uid==='player-'+slot&&mode==='death')u.hp=1;}
    s.syncHud(s.engine);window.qa.advance();let time=performance.now();
    const frames=mode==='attack'?20:mode==='hit'?40:82;
    for(let i=0;i<frames;i++){time+=16.667;game.step(time,16.667);}
    s.paused=true;s.applyPlaybackRate();
   },{slot,mode});
   const data=await audit(),unit=data.units.find(u=>u.uid==='player-'+slot);
   assert.ok(data.units.every(u=>u.uniform));assert.ok(data.units.every(u=>!u.rig));
   if(mode==='death')assert.ok(unit.dead&&!unit.visible&&!unit.hud);
   else assert.equal(unit.state,mode==='attack'?'attack':'hit');
   const name='pilot-'+(slot===0?'guan-yu':'zhao-yun')+'-'+mode+'-'+width+'x'+height;
   await shot(name);await writeFile(out+'/'+name+'.json',JSON.stringify(data,null,2));
  }
 }
 await page.evaluate(()=>window.qa.reset());
 const first=await audit();
 await page.waitForFunction(frames=>window.qa.audit().units.some((u,i)=>u.animated&&u.playing&&u.frame!==frames[i]),first.units.map(u=>u.frame),{timeout:10000});
 await tap(970,668);assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Battle').speed),2);
 await tap(970,668);assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Battle').speed),1);
 await resize(1280,720);await page.evaluate(()=>{
  window.qa.reset();const game=window.qa.game;game.loop.sleep();window.qa.advance();
  let time=performance.now();for(let i=0;i<20;i++){time+=1000/60;game.step(time,1000/60);}
  const s=game.scene.getScene('Battle');s.paused=true;s.applyPlaybackRate();
 });
 let contactAudit=await audit();assert.equal(contactAudit.vs,false);
 const striker=contactAudit.units.find(u=>u.uid==='player-0');assert.equal(striker.state,'attack');
 assert.ok(Math.abs(striker.x-striker.home.x)>100);
 if(striker.rig)assert.ok(Math.abs(striker.rigDebug.pose.nearArm+18)>2);
 else assert.ok(Number(striker.frame)>=8&&Number(striker.frame)<=9);
 assert.ok(contactAudit.units.filter(u=>u.uid.startsWith('enemy')).every(u=>u.hpRatio===1),'HP must stay unchanged before contact');
 await shot('normal-strike');await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');s.paused=false;s.applyPlaybackRate();});
 await page.waitForFunction(()=>window.qa.done);let a=await audit();assert.ok(a.units.every(u=>u.x===u.home.x&&u.y===u.home.y));
 // Confirmed lethal hit, complete disappearance including HUD/shadow, and view-only restoration.
 await page.evaluate(()=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');s.engine.units.find(u=>u.uid==='enemy-0').hp=1;s.syncHud(s.engine);window.qa.advance();});
 await page.waitForFunction(()=>window.qa.done);a=await audit();const dead=a.units.find(u=>u.uid==='enemy-0');assert.ok(dead.dead&&!dead.visible&&!dead.hud);assert.equal(a.counts.enemy,5);await shot('ko-empty-slot');
 await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');s.engine.units.find(u=>u.uid==='enemy-0').hp=10000;s.syncHud(s.engine);});await wait(300);
 a=await audit();assert.equal(a.units.length,12);assert.equal(a.units.find(u=>u.uid==='enemy-0').visible,true);
 await page.evaluate(()=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');s.engine.units.find(u=>u.uid==='player-0').rage=100;window.qa.advance();});
 await page.waitForFunction(()=>!!window.qa.game.scene.getScene('Battle').skillVfx.dragon);
 await shot('ultimate-dragon');assert.equal((await audit()).vs,false);await page.waitForFunction(()=>window.qa.done);
 for(const slot of [1,2,3,4]){
  await page.evaluate(slot=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');
   for(const u of s.engine.units){u.nextActionAt=u.uid==='player-'+slot?0:100;if(u.uid==='player-'+slot)u.rage=100;}
   window.qa.advance();},slot);
  await page.waitForFunction(slot=>window.qa.audit().units.find(u=>u.uid==='player-'+slot).state==='ultimate',slot);
  await wait(170);
  await shot('ultimate-'+['guan-yu','liu-bei','zhang-fei','zhao-yun','dian-wei'][slot]);await page.waitForFunction(()=>window.qa.done);
 }
 // 100 actual resolved Core actions PER PILOT through the same bridge/clock. Rendering is disabled
 // only during this deterministic drift check; normal gameplay screenshots are separate.
 const drift=await page.evaluate(()=>{
  window.qa.reset();const game=window.qa.game,s=game.scene.getScene('Battle');game.loop.sleep();
  let time=performance.now(),actions=0;const render=game.renderer.render;game.renderer.render=()=>{};
  try{for(let slot=0;slot<5;slot++){
   window.qa.reset();for(const u of s.engine.units){u.hp=u.maxHp=1e9;u.nextActionAt=u.uid==='player-'+slot?0:1e9;}
   for(let n=0;n<100;n++){
   const duration=window.qa.advance();
   if(window.qa.events.find(e=>e.kind==='action')?.source!=='player-'+slot)throw new Error('Unexpected test actor');
   for(let i=0;i<Math.ceil((duration+180)/16.667);i++){time+=16.667;game.step(time,16.667);}
   if(!window.qa.done)throw new Error('Action did not finish');
   for(const v of s.views.values())if(v.art.x!==v.character.footAnchor.x||v.art.y!==v.character.footAnchor.y)throw new Error('Formation drift');
   actions++;
  }}}finally{game.renderer.render=render;game.loop.wake();}
  return{actions,actionsPerHero:100,heroIds:window.qa.roster.slice(0,5),units:s.views.size};
 });assert.equal(drift.actions,500);assert.equal(drift.units,12);
 // Same Core stream under all supported presentation rates; rate is forced only in this isolated fixture.
 const streams=[];
 for(const speed of [1,2,3,4]){
  await page.evaluate(speed=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');s.speed=speed;s.applyPlaybackRate();window.qa.advance();},speed);
  await page.waitForFunction(()=>window.qa.done);streams.push((await audit()).log);
 }
 streams.forEach(log=>assert.deepEqual(log,streams[0]));
 await page.evaluate(()=>window.qa.reset(true));await resize(1280,720);
 const performanceSample=await page.evaluate(()=>new Promise(resolve=>{
  const game=window.qa.game,s=game.scene.getScene('Battle'),deltas=[];let started=0;
  const sample=(_time,delta)=>{if(!started)started=performance.now();deltas.push(delta);
   if(deltas.length<180)return;s.events.off('update',sample);
   const sorted=deltas.slice(10).sort((a,b)=>a-b),gl=game.renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');
   resolve({frames:180,wallFps:179000/(performance.now()-started),p95DeltaMs:sorted[Math.floor(sorted.length*.95)],
    renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unreported',rigs:window.qa.audit().units.filter(u=>u.rig).length,
    realDevice:false,viewport:[1280,720]});
  };s.events.on('update',sample);
 }));
 await page.evaluate(()=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');s.presenting=false;s.elapsed=0;});
 await page.waitForFunction(()=>window.qa.game.scene.getScene('Battle').engine.turn>=2);
 await page.evaluate(()=>{window.qa.reset();window.qa.advance();const s=window.qa.game.scene.getScene('Battle');s.paused=true;s.applyPlaybackRate();});
 await wait(150);const paused=await audit();await wait(450);assert.deepEqual((await audit()).units.map(u=>[u.frame,u.x,u.y]),paused.units.map(u=>[u.frame,u.x,u.y]));
 await resize(844,390);await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');s.paused=false;s.applyPlaybackRate();});
 await page.waitForFunction(()=>window.qa.done);assert.ok((await audit()).units.every(u=>u.x===u.home.x&&u.y===u.home.y));
 // Synthetic document visibility event exercises the real suspend/resume handler.
 await page.evaluate(()=>{window.qa.reset();window.qa.advance();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await wait(150);const hidden=await audit();await wait(350);
 assert.deepEqual((await audit()).units.map(u=>[u.frame,u.x,u.y]),hidden.units.map(u=>[u.frame,u.x,u.y]));
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.qa.done);
 await page.evaluate(()=>{localStorage.setItem('3q-lobby-preferences',JSON.stringify({effects:false,quality:'Thấp'}));window.qa.previousBridge=window.qa.game.scene.getScene('Battle').bridge;window.qa.restart();});
 await page.waitForFunction(()=>{const s=window.qa.game.scene.getScene('Battle');return s.views?.size===12&&s.bridge!==window.qa.previousBridge;});
 await page.evaluate(()=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');s.engine.units.find(u=>u.uid==='player-0').rage=100;window.qa.advance();});
 await page.waitForFunction(()=>window.qa.done);
 assert.ok(await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');return s.reducedMotion&&!s.cutIn&&s.skillVfx.images.size===0&&s.skillVfx.emitters.size===0;}));
 // Skip twice while a strike is queued: only one transition, no late presentation callback.
 const before=await page.evaluate(()=>window.qa.gameStore.snapshot);
 await page.evaluate(()=>{window.qa.reset();window.qa.advance();});await tap(1160,668);await tap(1160,668);
 await page.waitForFunction(()=>window.qa.game.scene.isActive('Arena'));await wait(1200);
 assert.equal(await page.evaluate(()=>window.qa.finishes()),1);assert.deepEqual(await page.evaluate(()=>window.qa.gameStore.snapshot),before);
 const rosterReports=[];
 if(phase==='full'){
  const ids=Object.keys(JSON.parse(await readFile('src/data/chibiBattleAssets.json','utf8')).heroes);
  for(let start=0;start<ids.length;start+=6)for(const [width,height] of [[1280,720],[844,390]]){
   const heroes=ids.slice(start,start+6);while(heroes.length<6)heroes.push(ids[0]);
   const rosterPage=await browser.newPage({viewport:{width,height}});rosterPage.on('pageerror',e=>errors.push(e.message));
   rosterPage.on('request',r=>{if(/remaster|characterRig|RigAnimation/.test(r.url()))artRequests.push(r.url());});
   await rosterPage.route('https://*.supabase.co/**',r=>r.abort());
   await rosterPage.goto('http://127.0.0.1:5186/'+out+'/index.html?heroes='+encodeURIComponent(heroes.join(',')));
   await rosterPage.waitForFunction(()=>window.qa?.game.scene.getScene('Battle').views?.size===12);
   await rosterPage.evaluate(()=>{window.qa.reset(true);const s=window.qa.game.scene.getScene('Battle');s.paused=true;s.applyPlaybackRate();});
   const layout=await rosterPage.evaluate(()=>window.qa.audit());
   assert.ok(layout.units.every(u=>u.nameFits&&u.uniform&&!u.rig));
   for(const u of layout.units){assert.ok(u.bodyWorld.y>=109&&u.bodyWorld.y+u.bodyWorld.height<=u.hudWorld.y+1);
    for(const next of layout.units)if(u.x===next.x&&u.y<next.y)assert.ok(u.hudWorld.y+u.hudWorld.height<=next.bodyWorld.y+1);}
   await rosterPage.screenshot({path:out+'/roster-'+start+'-'+width+'x'+height+'.jpg',type:'jpeg',quality:94,timeout:60000});
   rosterReports.push({heroes,width,height,namesFit:true,bodyAndHudSeparated:true});await rosterPage.close();
  }
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({reports,rosterReports,errors,coreStreamsEqualAtAllRates:true,autoBattleVerified:true,touchControlsVerified:true,visibilitySuspendVerified:true,reducedEffectsVerified:true,skipTransitions:1,
  drift,performanceSample,realNetwork:false,realAccount:false,restoredChibiHeroes:['zhao-yun','guan-yu','liu-bei','zhang-fei','dian-wei','lu-bu'],
  animationPipeline:'original-chibi-frames-and-safe-whole-sprite-movement',rigRequests:artRequests,
  trueFrameAnimations:['guan-yu','liu-bei','zhang-fei'],originalArtPreserved:true},null,2));
 assert.deepEqual(artRequests,[]);console.log('CHIBI_BATTLE_QA_PASS: original sprites, 6v6, 500 actions, speed, resize, KO and skip');
}finally{await browser?.close();await server.close();}
function windowWidth(a){return a.canvas.width/a.ratio;}
