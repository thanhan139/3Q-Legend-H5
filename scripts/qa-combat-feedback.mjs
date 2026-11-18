import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createServer} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const root='.vite/combat-feedback-qa',out='docs/combat-vfx/qa';await mkdir(root,{recursive:true});await mkdir(out,{recursive:true});
const correctionOnly=process.argv.includes('--correction');
const old=await readFile('scripts/qa-chibi-battle.mjs','utf8');let fixture=old.split('await writeFile(`${out}/fixture.ts`,')[1].slice(1).split('\n`);')[0];
fixture=fixture.replace("['guan-yu','liu-bei','zhang-fei','zhao-yun','dian-wei','lu-bu']","['guan-yu','zhao-yun','zhang-fei','zhuge-liang','da-qiao','pei-yuan-shao']").replace('fps:{target:60,smoothStep:false}','render:{preserveDrawingBuffer:true},fps:{target:60,smoothStep:false}').replace('s.bridge.cancel();s.tweens.killAll();','s.bridge.cancel();s.combatFeedback.clear();s.tweens.killAll();');
await writeFile(root+'/fixture.ts',fixture);await writeFile(root+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
const server=await createServer({server:{host:'127.0.0.1',port:5199,strictPort:true,watch:null},clearScreen:false});await server.listen();let browser;
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});await page.route('https://*.supabase.co/**',r=>r.abort());await page.goto('http://127.0.0.1:5199/'+root+'/index.html');await page.waitForFunction(()=>window.qa?.game.scene.getScene('Battle').views.size===12,null,{timeout:90000});
// Captured action frames render normally; long cleanup advances use Phaser's real
// headless update to avoid redrawing hundreds of unseen frames on the QA GPU.
const step=frames=>page.evaluate(n=>{const game=window.qa.game;let t=performance.now();for(let i=0;i<n;i++){t+=1000/60;if(n>80)game.headlessStep(t,1000/60);else game.step(t,1000/60);}},frames);
const snapshot=()=>page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');return{events:window.qa.events,core:s.engine.units.map(u=>({uid:u.uid,hp:u.hp,rage:u.rage})),fx:s.children.list.filter(o=>o.name?.startsWith('combat.feedback.')).map(o=>({name:o.name,x:o.x,y:o.y,frame:o.frame.name})),units:window.qa.audit().units};});
const reports=[];
for(const [width,height] of correctionOnly?[]:[[1280,720],[1920,1080],[844,390]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(160);
 for(const [slot,skill,label] of [[0,false,'melee'],[5,false,'projectile'],[3,false,'magic'],[0,true,'quan-vu'],[1,true,'trieu-van'],[2,true,'truong-phi'],[3,true,'gia-cat-luong'],[4,true,'heal']]){
  await page.evaluate(({slot,skill})=>{window.qa.game.loop.sleep();window.qa.reset();const s=window.qa.game.scene.getScene('Battle');for(const u of s.engine.units){u.nextActionAt=u.uid==='player-'+slot?0:1e6;if(u.side==='player'&&slot===4)u.hp=4000;if(u.uid==='player-'+slot)u.rage=skill?100:0;}s.syncHud(s.engine);window.qa.advance();},{slot,skill});
  const initial=await snapshot();await step(label==='projectile'?21:skill?64:31);const middle=await snapshot();
  if(label==='projectile')assert.ok(middle.fx.some(o=>o.name.includes('projectile_arrow')));
  await page.screenshot({path:out+'/'+label+'-'+width+'x'+height+'.jpg',type:'jpeg',quality:94});await step(400);const end=await snapshot();assert.deepEqual(end.core,initial.core,'presentation must not alter resolved Core');assert.ok(end.units.every(u=>u.dead||u.x===u.home.x&&u.y===u.home.y));reports.push({width,height,label,events:middle.events,fx:middle.fx});
 }
}
// Existing Lu Bu / Diao Chan and the corrected weapon mappings, never invented heroes.
await page.goto('http://127.0.0.1:5199/'+root+'/index.html?heroes=lu-bu,diao-chan,ma-chao,gan-ning,huang-yueying,pei-yuan-shao');
await page.waitForFunction(()=>window.qa?.game.scene.getScene('Battle').views.size===12,null,{timeout:90000});
for(const [width,height] of [[1280,720],[1920,1080],[844,390]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(150);
 for(const [slot,skill,label] of [[0,true,'lu-bu'],[1,true,'diao-chan'],[2,false,'ma-chao'],[3,false,'gan-ning'],[4,false,'huang-yueying'],[5,false,'pei-yuan-shao']]){
  await page.evaluate(({slot,skill})=>{window.qa.game.loop.sleep();window.qa.reset();const s=window.qa.game.scene.getScene('Battle');for(const u of s.engine.units){u.nextActionAt=u.uid==='player-'+slot?0:1e6;if(slot===1&&u.side==='player')u.hp=4000;if(u.uid==='player-'+slot)u.rage=skill?100:0;}s.syncHud(s.engine);window.qa.advance();},{slot,skill});
  const before=await snapshot();await step(skill?64:21);const middle=await snapshot();
  if(['huang-yueying','pei-yuan-shao'].includes(label))assert.ok(middle.fx.some(f=>f.name.includes('projectile_arrow')));
  if(['ma-chao','gan-ning'].includes(label))assert.ok(!middle.fx.some(f=>f.name.includes('projectile_arrow')));
  if(['lu-bu','diao-chan'].includes(label))assert.ok(!middle.fx.some(f=>f.name.includes('green_dragon_slash')||f.name.includes('blossom_heal')));
  if(label==='lu-bu')assert.ok(!middle.fx.some(f=>f.name==='combat.feedback.melee_slash_arc'));
  await page.screenshot({path:out+'/'+label+'-'+width+'x'+height+'.jpg',type:'jpeg',quality:94});await step(400);assert.deepEqual((await snapshot()).core,before.core);
  reports.push({width,height,label,events:middle.events,fx:middle.fx});
 }
}
for(const speed of [1,2,3,4]){
 await page.evaluate(rate=>{window.qa.reset();const s=window.qa.game.scene.getScene('Battle');s.speed=rate;s.applyPlaybackRate();s.engine.units.find(u=>u.uid==='enemy-0').hp=1;s.syncHud(s.engine);window.qa.advance();},speed);await step(200);const data=await snapshot();assert.ok(data.units.find(u=>u.uid==='enemy-0').dead);assert.equal(data.units.find(u=>u.uid==='enemy-0').visible,false);assert.equal(data.units.find(u=>u.uid==='enemy-0').hud,false);assert.equal(data.fx.length,0);
}
// Exercise every imported animation and verify finite lifetime / owner cleanup.
const imported=await page.evaluate(async()=>{const m=await import('/src/data/combatVfxManifest.json');return m.default.data.map(s=>s.id);});assert.equal(imported.length,28);
for(const id of imported){await page.evaluate(id=>{const s=window.qa.game.scene.getScene('Battle');s.combatFeedback.setRate(1);s.time.timeScale=1;s.combatFeedback.play(id,{x:640,y:360},120,'qa-owner');},id);await step(100);assert.equal((await snapshot()).fx.length,0);}
await page.evaluate(()=>{window.qa.reset();window.qa.advance();});await step(24);await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Battle');s.endBattle('player',true);s.endBattle('player',true);});await step(35);assert.equal(await page.evaluate(()=>window.qa.finishes()),1);
assert.deepEqual(errors,[]);await writeFile(out+(correctionOnly?'/correction-report.json':'/report.json'),JSON.stringify({reports,errors,speeds:[1,2,3,4],imported,skipOnce:true,coreUnchanged:true,realAccount:false},null,2));console.log('COMBAT_FEEDBACK_QA_PASS');
}finally{await browser?.close();await server.close();}
