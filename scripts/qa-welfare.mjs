// Real Phaser scene, isolated local save. No authentication or Supabase writes.
import {mkdir,writeFile,readFile} from 'node:fs/promises';import {createServer} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const phase=process.argv.includes('--before')?'before':'after',root='.vite/welfare-qa',out=root+'/'+phase;
await mkdir(out,{recursive:true});await writeFile(root+'/index.html','<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(root+'/fixture.ts',`
import Phaser from 'phaser';import '../../src/style.css';import {InfoScene} from '../../src/scenes/InfoScene';
import {PORTRAITS} from '../../src/ui/heroPresentation';import {gameStore,baseSave} from '../../src/domain/store';
import {welfareDay,DAILY_MISSIONS} from '../../src/domain/welfare';import {bindViewportResize} from '../../src/ui/resizeViewport';
import {cloudRepository} from '../../src/cloud/cloudRepository';
const save=baseSave();save.welfare={checkIns:2,checkInDay:welfareDay()-1,daily:{day:welfareDay(),counts:{win:1,battle:2},claimed:[]}};gameStore.useCloudSave(save);
class Info extends InfoScene{create(data:any){super.create(data);window.qa.page=data?.page??'Welfare';window.qa.generation++;}}
class Boot extends Phaser.Scene{constructor(){super('Boot');}preload(){this.load.spritesheet(PORTRAITS,'/assets/heroes/portraits.webp',{frameWidth:256,frameHeight:256});}create(){this.scene.start('Info',{page:'Welfare'});}}
class Lobby extends Phaser.Scene{constructor(){super('Lobby');}create(){window.qa.returned=true;}}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,fps:{target:8,forceSetTimeOut:true,smoothStep:false},
 scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,Info,Lobby]});bindViewportResize(game,document.getElementById('game')!);
window.qa={game,gameStore,cloudRepository,generation:0,page:'',returned:false,open:(page:string)=>game.scene.getScene('Info').scene.restart({page}),
 all:()=>{const walk=(items:any[]):any[]=>items.flatMap(o=>o.type==='Container'?[o,...walk(o.getAll())]:[o]);return walk(game.scene.getScene('Info').children.list);},
};
`);
const port=phase==='before'?5188:5189;
const server=await createServer({server:{host:'127.0.0.1',port,watch:null},clearScreen:false});await server.listen();let browser;
const errors=[],reports=[];
try{
 browser=await chromium.launch({...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.route('https://*.supabase.co/**',r=>r.abort());await page.goto('http://127.0.0.1:'+port+'/.vite/welfare-qa/index.html',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.qa?.generation>0,null,{timeout:90000});
 const render=()=>page.evaluate(()=>new Promise(resolve=>window.qa.game.events.once('postrender',()=>resolve(true))));
 const shot=async name=>{await render();await page.evaluate(()=>window.qa.game.loop.sleep());try{await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:94,timeout:90000});}finally{await page.evaluate(()=>window.qa.game.loop.wake());}};
 for(const [width,height] of [[1920,1080],[1280,720],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForFunction(({width,height})=>{const r=window.qa.game.canvas.getBoundingClientRect();return Math.abs(r.width-width)<1&&Math.abs(r.height-height)<1;},{width,height});
  for(const tab of (phase==='before'?['Welfare','Checkin','Missions','Topup','Mail']:['Welfare','Missions','Topup'])){
   const n=await page.evaluate(()=>window.qa.generation);await page.evaluate(tab=>window.qa.open(tab),tab);
   await page.waitForFunction(n=>window.qa.generation>n,n);await render();
   const a=await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Info');return{fields:s.content?.audit().fields??[],
    back:window.qa.all().filter(o=>o.name==='shared.back-to-lobby').length,
    hostess:window.qa.all().filter(o=>o.name==='welfare.hostess').map(o=>({x:o.x,y:o.y,w:o.displayWidth,h:o.displayHeight,uniform:o.scaleX===o.scaleY})),
    text:window.qa.all().filter(o=>o.type==='Text').map(o=>o.text)};});
   if(phase==='after'){assert.equal(a.back,1);assert.deepEqual(a.fields.filter(f=>!f.fits),[]);assert.ok(a.hostess.every(h=>h.uniform));}
   await shot(tab+'-'+width+'x'+height);reports.push({tab,width,height,...a});
  }
 }
 if(phase==='after'){
  const click=async name=>{const p=await page.evaluate(name=>{const o=window.qa.all().find(o=>o.name===name),b=o.getBounds(),c=window.qa.game.canvas.getBoundingClientRect(),s=window.qa.game.scale.gameSize;return{x:c.x+(b.x+b.width/2)*c.width/s.width,y:c.y+(b.y+b.height/2)*c.height/s.height};},name);await page.touchscreen.tap(p.x,p.y);};
  const before=await page.evaluate(()=>window.qa.gameStore.snapshot);
  for(const tab of ['Checkin','Missions','LoginGift','Topup','GiftCode','Online']){
   await click('welfare.tab.'+tab);await page.waitForFunction(tab=>window.qa.game.scene.getScene('Info').page===tab,tab);
   assert.deepEqual(await page.evaluate(()=>window.qa.gameStore.snapshot),before);
  }
  await click('welfare.tab.Checkin');await click('welfare.claim.day.2');
  await page.waitForFunction(()=>!window.qa.game.scene.getScene('Info').busy);
  assert.deepEqual(await page.evaluate(()=>window.qa.gameStore.snapshot),before,'no offline/sessionless grant');
  await click('shared.back-to-lobby');await page.waitForFunction(()=>window.qa.returned===true);
  for(const resolution of ['1920x1080','1280x720','844x390']){
   const original=await readFile(root+'/before/Welfare-'+resolution+'.jpg'),updated=await readFile(out+'/Welfare-'+resolution+'.jpg');
   await page.setViewportSize({width:1920,height:650});await page.setContent(`<style>body{margin:0;background:#24131a;color:#ffe4af;font:20px Arial}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}figure{margin:0}figcaption{text-align:center;padding:12px}img{width:100%;height:570px;object-fit:contain}</style><main><figure><figcaption>Before — ${resolution}</figcaption><img src="data:image/jpeg;base64,${original.toString('base64')}"></figure><figure><figcaption>After — ${resolution} / isolated QA save</figcaption><img src="data:image/jpeg;base64,${updated.toString('base64')}"></figure></main>`);
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await page.screenshot({path:out+'/comparison-'+resolution+'.jpg',type:'jpeg',quality:94});
  }
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({reports,errors,realNetwork:false},null,2));console.log('WELFARE_'+phase.toUpperCase()+'_QA_PASS');
}finally{await browser?.close();await server.close();}
