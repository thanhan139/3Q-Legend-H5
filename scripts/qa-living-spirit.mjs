import {createServer} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const pilot=process.argv.includes('--pilot'),expansion=process.argv.includes('--expansion'),painted=process.argv.includes('--painted');
const out=painted?'docs/living-spirit-painted/qa':expansion?'docs/living-spirit-2b/qa':'docs/living-spirit-2a/qa',root='.vite/living-spirit-qa';
const heroes=pilot?['guan-yu']:painted?['zhuge-liang','diao-chan']:expansion?['guan-yu','zhao-yun','lu-bu','zhuge-liang','diao-chan']:['guan-yu','zhao-yun'];
const slugs={'guan-yu':'quan_vu','zhao-yun':'trieu_van','lu-bu':'lu_bo','zhuge-liang':'gia_cat_luong','diao-chan':'dieu_thuyen'};
await mkdir(out,{recursive:true});await mkdir(root,{recursive:true});
const existing=await readFile('scripts/qa-hero-system.mjs','utf8');
const fixture=existing.split("await writeFile(fixture+'/fixture.ts',`")[1].split('`);')[0];
await writeFile(root+'/fixture.ts',fixture);
await writeFile(root+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
// Intercept ONLY the local QA server's command boundary. Never shipped by Vite build.
const server=await createServer({plugins:[{name:'qa-confirmation-boundary',enforce:'pre',load(id){
 if(!id.replaceAll('\\','/').endsWith('/src/cloud/cloudRepository.ts'))return;
 return `export const cloudRepository={uid:'qa-owner-a',active:true};
 export function playCommand(command){window.qaCommandCalls=(window.qaCommandCalls??0)+1;
 return new Promise((resolve,reject)=>{window.qaPending=command;window.qaFinish=(result)=>{
  window.qaPending=undefined;if(result==='network'){reject(new Error('QA network disconnected'));return;}
  if(result==='ok'){const save=window.qa.gameStore.snapshot;save.equipment.find(g=>g.uid===command.uid).level++;window.qa.gameStore.useCloudSave(save);resolve(true);}else resolve(false);
 };});}`;
 }}],server:{host:'127.0.0.1',port:5198,strictPort:true,watch:null},clearScreen:false});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],requests=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});page.on('request',r=>{if(r.url().includes('/spirits/'))requests.push(r.url());});
 await page.route('https://*.supabase.co/**',r=>r.abort());
 await page.goto('http://127.0.0.1:5198/'+root+'/index.html');
 await page.waitForFunction(()=>window.qa?.game.scene.getScene('Equipment').data.get('livingSpirit'),null,{timeout:90000});
 const state=()=>page.evaluate(()=>{const s=window.qa.game.scene.getScenes(true)[0],o=s.children.getByName('equipment.spiritLoop'),hero=s.children.getByName('equipment.fullbody.'+s.data.get('equipmentHeroView').selectedHeroId);return{...s.data.get('livingSpirit'),texture:o?.texture.key,frame:Number(o?.frame.name),playing:o?.anims.isPlaying,completeListeners:o?.listenerCount('animationcomplete'),count:s.children.list.filter(o=>o.name==='equipment.spiritLoop').length,behind:s.children.getIndex(o)<s.children.getIndex(hero),uniform:o?.scaleX===o?.scaleY};});
 const start=async(heroId,scene='Equipment',bag=false)=>{await page.evaluate(({heroId,scene,bag})=>new Promise(resolve=>{const s=window.qa.game.scene.getScenes(true)[0];window.qa.game.scene.getScene(scene).events.once('create',()=>resolve(true));s.sys.settings.key===scene?s.scene.restart({heroId,bag}):s.scene.start(scene,{heroId,bag});}),{heroId,scene,bag});await page.waitForTimeout(100);};
 const tap=async(name)=>{const p=await page.evaluate(name=>{const s=window.qa.game.scene.getScenes(true)[0],o=s.children.getByName(name),r=s.game.canvas.getBoundingClientRect();return{x:r.x+(o.x-s.cameras.main.scrollX)*r.width/s.scale.width,y:r.y+(o.y-s.cameras.main.scrollY)*r.height/s.scale.height};},name);await page.mouse.click(p.x,p.y);};
 const shot=async name=>{await page.evaluate(()=>window.qa.game.loop.sleep());await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:95});await page.evaluate(()=>window.qa.game.loop.wake());};
 const waitClip=clip=>page.waitForFunction(clip=>window.qa.game.scene.getScenes(true)[0]?.data.get('livingSpirit')?.clip===clip,clip);
 const reports=[],performance=[];
 assert.ok(requests.length===3&&requests.every(p=>p.includes('/quan_vu/atlas/')&&p.endsWith('.png')));
 for(const id of heroes){
  await start(id);await waitClip('idle');
  const frames=await page.evaluate(async()=>{const s=window.qa.game.scene.getScenes(true)[0],o=s.children.getByName('equipment.spiritLoop'),frames=new Set();const fn=(_a,f)=>frames.add(f.textureFrame);o.on('animationupdate',fn);await new Promise(r=>setTimeout(r,2700));o.off('animationupdate',fn);return[...frames];});
  assert.equal(frames.length,['zhuge-liang','diao-chan'].includes(id)?8:16);
  const fps=await page.evaluate(()=>new Promise(resolve=>{let count=0;const start=performance.now();function sample(now){count++;if(now-start>=2200)resolve({frames:count,elapsed:now-start,fps:1000*count/(now-start)});else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));performance.push({heroId:id,...fps});
  for(const [width,height] of [[1280,720],[1920,1080],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   for(const key of ['Equipment','Heroes']){
    await start(id,key);await waitClip('idle');const s=await state();assert.ok(s.behind&&s.uniform&&s.count===1&&s.completeListeners===1);assert.equal(s.slug,slugs[id]);
    const identity=await page.evaluate(()=>{const s=window.qa.game.scene.getScenes(true)[0],v=s.data.get('equipmentHeroView'),save=window.qa.gameStore.snapshot,h=window.qa.HEROES.find(h=>h.id===v.selectedHeroId);return{heroId:h.id,texture:s.children.getByName('equipment.fullbody.'+h.id).texture.key,power:v.power,expectedPower:window.qa.combatPower(window.qa.heroStats(h,save.heroExp[h.id],save.heroStars?.[h.id],save.equipment)),gear:v.gearUids,expectedGear:save.equipment.filter(g=>g.heroId===h.id).map(g=>g.uid)};});
    assert.equal(identity.heroId,id);assert.ok(identity.texture.includes(slugs[id]));assert.equal(identity.power,identity.expectedPower);assert.deepEqual(identity.gear,identity.expectedGear);
    reports.push({width,height,scene:key,...s,identity});await shot(`${id}-${key}-${width}x${height}`);
   }
  }
  await page.setViewportSize({width:1280,height:720});
  // Record the real canvas, not the ZIP's GIF. Force a fresh selection by visiting another hero.
  await start('zhang-fei');
  await page.evaluate(()=>{const canvas=window.qa.game.canvas,recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);window.qaStopVideo=()=>new Promise(resolve=>{recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())));recorder.stop();});recorder.start();});
  await start(id);await waitClip('selected');await shot(id+'-selected');await waitClip('idle');
  await page.waitForTimeout(1100);
  await tap('equipment.slot.weapon');await page.waitForFunction(()=>window.qa.game.scene.getScene('Equipment').data.get('equipmentManager'));
  // Give this isolated fixture hero a real config weapon if it started with an empty slot.
  await page.evaluate(id=>{const save=window.qa.gameStore.snapshot;if(!save.equipment.some(g=>g.heroId===id)){save.equipment.push({uid:'qa-pilot-'+id,itemId:'blade',level:1,heroId:id});window.qa.gameStore.useCloudSave(save);}},id);
  await start(id,'Equipment',true);
  const enhancePoint=await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Equipment'),r=s.game.canvas.getBoundingClientRect();return{x:(946-s.cameras.main.scrollX)*r.width/s.scale.width,y:(475-s.cameras.main.scrollY)*r.height/s.scale.height};});
  const clickEnhance=()=>page.mouse.click(enhancePoint.x,enhancePoint.y);
  await clickEnhance();await page.waitForFunction(()=>window.qaPending);await clickEnhance();assert.equal(await page.evaluate(()=>window.qaCommandCalls),1);
  assert.notEqual((await state()).clip,'power_up');await page.evaluate(()=>window.qaFinish('network'));await page.waitForTimeout(180);assert.notEqual((await state()).clip,'power_up');
  await clickEnhance();await page.waitForFunction(()=>window.qaPending);await page.evaluate(()=>window.qaFinish('rejected'));await page.waitForTimeout(180);assert.notEqual((await state()).clip,'power_up');
  await clickEnhance();await page.waitForFunction(()=>window.qaPending);await page.evaluate(()=>window.qaFinish('ok'));await page.waitForTimeout(250);
  assert.notEqual((await state()).clip,'power_up'); // Wait until the opaque modal is closed.
  await page.keyboard.press('Escape');await waitClip('power_up');await shot(id+'-power-up');await waitClip('idle');await page.waitForTimeout(200);
  const video=await page.evaluate(()=>window.qaStopVideo());await writeFile(out+'/'+id+'-runtime.webm',Buffer.from(video));
  await start(id);assert.equal((await state()).clip,'idle');
  await page.evaluate(()=>window.qaCommandCalls=0);
  console.log('SPIRIT_HERO_PASS',id);
 }
 const memory={};
 if(!pilot){
  const cdp=await page.context().newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');memory.before=(await cdp.send('Runtime.getHeapUsage')).usedSize;
  for(let i=0;i<50;i++){
   const id=heroes[i%heroes.length];
   await page.evaluate(()=>window.qaOldSpirit=window.qa.game.scene.getScenes(true)[0].children.getByName('equipment.spiritLoop'));
   await start(id);const s=await state();assert.equal(s.count,1);assert.equal(s.heroId,id);assert.ok(s.texture.includes(slugs[id]));
   assert.ok(await page.evaluate(()=>!window.qaOldSpirit.scene&&window.qaOldSpirit.listenerCount('animationcomplete')===0));
   assert.equal(await page.evaluate(()=>window.qa.game.scene.getScenes(true)[0].input.listenerCount('wheel')),1);
  }
  await cdp.send('HeapProfiler.collectGarbage');memory.after=(await cdp.send('Runtime.getHeapUsage')).usedSize;memory.delta=memory.after-memory.before;
  assert.ok(memory.delta<8*1024*1024,'Unexpected retained JS heap growth: '+memory.delta);await cdp.detach();
  await page.emulateMedia({reducedMotion:'reduce'});await start('guan-yu');const reduced=await state();assert.equal(reduced.reduced,true);assert.equal(reduced.playing,false);assert.equal(reduced.frame,0);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>{const s=window.qa.game.scene.getScenes(true)[0];return s.data.get('livingSpirit')?.reduced===false&&s.children.getByName('equipment.spiritLoop')?.anims.isPlaying;});
 }
 assert.deepEqual(errors,[]);assert.ok(requests.every(p=>p.endsWith('.png')));
 await writeFile(out+`/${pilot?'pilot':'report'}.json`,JSON.stringify({reports,errors,requests,performance,memory,sourceFrames:true,serverBoundary:'controlled QA stub; no live account mutations',switches:pilot?0:50,confirmedOnly:true,networkAndRejection:true},null,2));
 console.log(pilot?'QUAN_VU_PILOT_PASS':painted?'PAINTED_SPIRIT_QA_PASS':expansion?'LIVING_SPIRIT_2B_QA_PASS':'LIVING_SPIRIT_2A_QA_PASS');
}finally{await browser?.close();await server.close();}
