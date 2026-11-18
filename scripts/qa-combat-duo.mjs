import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createServer} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const root='.vite/combat-duo-v11-qa',out='docs/combat-duo-v11/qa';await mkdir(root,{recursive:true});await mkdir(out,{recursive:true});
const old=await readFile('scripts/qa-chibi-battle.mjs','utf8');let fixture=old.split('await writeFile(`${out}/fixture.ts`,')[1].slice(1).split('\n`);')[0];
fixture=fixture.replace("['guan-yu','liu-bei','zhang-fei','zhao-yun','dian-wei','lu-bu']","['lu-bu','diao-chan','zhang-fei','guan-yu','zhao-yun','da-qiao']").replace('fps:{target:60,smoothStep:false}','render:{preserveDrawingBuffer:true},fps:{target:60,smoothStep:false}').replace('s.bridge.cancel();s.tweens.killAll();','s.bridge.cancel();s.combatFeedback.clear();s.duoVfx.clear();s.tweens.killAll();');
fixture+="\nimport {RAGE_CONFIG} from '../../src/data/rageConfig';window.qa.rageThreshold=RAGE_CONFIG.skillThreshold;";
await writeFile(root+'/fixture.ts',fixture);await writeFile(root+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
const server=await createServer({server:{host:'127.0.0.1',port:5200,strictPort:true,watch:null},clearScreen:false});await server.listen();let browser;
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],reports=[];
page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});await page.route('https://*.supabase.co/**',r=>r.abort());await page.goto('http://127.0.0.1:5200/'+root+'/index.html');await page.waitForFunction(()=>window.qa?.game.scene.getScene('Battle').views.size===12,null,{timeout:90000});
const step=async(n,render=false)=>page.evaluate(({n,render})=>{const g=window.qa.game;let t=performance.now();for(let i=0;i<n;i++){t+=1000/60;if(render&&i===n-1)g.step(t,1000/60);else g.headlessStep(t,1000/60);}},{n,render});
const snap=()=>page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');return{core:JSON.stringify(s.engine.units),fx:s.children.list.filter(o=>o.name?.startsWith('combat.duo.')).map(o=>({name:o.name,frame:o.frame.name})),actors:[...s.views.entries()].map(([uid,v])=>({uid,texture:v.sprite.texture.key,frame:v.sprite.frame.name,scaleX:v.sprite.scaleX,scaleY:v.sprite.scaleY,x:v.art.x,y:v.art.y,home:v.character.footAnchor,dead:v.character.dead,visible:v.art.visible,hud:v.card.visible})),events:window.qa.events};});
const setup=async(slot,mode)=>page.evaluate(({slot,mode})=>{window.qa.game.loop.sleep();window.qa.reset();const s=window.qa.game.scene.getScene('Battle');for(const u of s.engine.units){u.nextActionAt=u.uid==='player-'+slot?0:1e6;if(u.side==='player'&&slot===1)u.hp=4000;if(u.uid==='player-'+slot)u.rage=['ready','skill'].includes(mode)?window.qa.rageThreshold:0;}s.syncHud(s.engine);if(mode!=='ready')window.qa.advance();},{slot,mode});
for(const [width,height] of [[1280,720],[1920,1080],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(140);
 for(const slot of [0,1]){const id=slot?'diao-chan':'lu-bu';
  for(const mode of ['ready','attack','skill']){
   await setup(slot,mode);const before=await snap();await step(mode==='attack'?42:mode==='skill'?64:15,true);const mid=await snap();
   assert.ok(mid.actors.every(a=>a.scaleX===a.scaleY));assert.ok(mid.actors.find(a=>a.uid==='player-'+slot).texture==='combat.duo.actor.'+id);
   if(mode==='ready'){assert.ok(!mid.fx.some(f=>f.name==='combat.duo.rage_full'));assert.ok(await page.evaluate(slot=>window.qa.game.scene.getScene('Battle').views.get('player-'+slot).art.list.some(o=>o.name==='combat.duo.rage_ready'),slot));}
   if(mode==='skill')assert.ok(mid.events.some(e=>e.kind==='action'&&e.skill===true));
   await page.screenshot({path:out+'/'+id+'-'+mode+'-'+width+'x'+height+'.jpg',type:'jpeg',quality:94});await step(240);
   assert.equal((await snap()).core,before.core);reports.push({id,mode,width,height,fx:mid.fx,events:mid.events});
  }
 }
}
// Capture actual canvas frames for the requested GIFs; no asset-preview GIF is used.
await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);
for(const slot of process.argv.includes('--no-gif')?[]:[0,1]){const id=slot?'diao-chan':'lu-bu',dir=root+'/'+id;await mkdir(dir,{recursive:true});let frame=0;
 for(const mode of ['attack','ready','skill']){await setup(slot,mode);for(let i=0;i<(mode==='ready'?10:mode==='attack'?24:36);i++){
  await step(5,true);const bytes=await page.evaluate(()=>window.qa.game.canvas.toDataURL('image/png').split(',')[1]);await writeFile(dir+'/'+String(frame++).padStart(3,'0')+'.png',Buffer.from(bytes,'base64'));
 }}console.log('GIF frames',id,frame);
}
for(const rate of [1,2,3,4]){await setup(0,'attack');await page.evaluate(rate=>{const s=window.qa.game.scene.getScene('Battle');s.speed=rate;s.applyPlaybackRate();},rate);await step(200);const data=await snap();assert.ok(data.actors.every(a=>a.dead||a.x===a.home.x&&a.y===a.home.y));}
for(const slot of [0,1]){await page.evaluate(slot=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');for(const u of s.engine.units){u.nextActionAt=u.uid==='enemy-0'?0:1e6;if(u.side==='player')u.hp=u.slot===slot?1:0;}s.syncHud(s.engine);window.qa.advance();},slot);await step(180,true);const a=(await snap()).actors.find(a=>a.uid==='player-'+slot);assert.ok(a.dead&&!a.visible&&!a.hud);await page.screenshot({path:out+'/'+(slot?'diao-chan':'lu-bu')+'-death.jpg',type:'jpeg',quality:94});}
await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');s.endBattle('player',true);s.endBattle('player',true);});await step(40);assert.equal(await page.evaluate(()=>window.qa.finishes()),1);
assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({reports,errors,speeds:[1,2,3,4],skipOnce:true,realAccount:false},null,2));console.log('COMBAT_DUO_QA_PASS');
}finally{await browser?.close();await server.close();}
