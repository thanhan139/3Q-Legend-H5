import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const before=process.argv.includes('--before');
const out='docs/hero-system/qa';await mkdir(out,{recursive:true});
const fixture='.vite/hero-system-qa';await mkdir(fixture,{recursive:true});
await writeFile(fixture+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(fixture+'/fixture.ts',`
import Phaser from 'phaser';import '../../src/style.css';
import {HeroesScene} from '../../src/scenes/HeroesScene';import {EquipmentScene} from '../../src/scenes/EquipmentScene';
import {loadHeroUi} from '../../src/ui/heroUiAssets';import {heroNavigation} from '../../src/ui/heroNavigation';
import {gameStore,baseSave} from '../../src/domain/store';import {HEROES} from '../../src/data/heroes';
import {EQUIPMENT} from '../../src/data/equipmentConfig';import {heroStats,combatPower} from '../../src/domain/progression';
import {LOBBY_ASSETS} from '../../src/data/lobbyAssets';import {bindViewportResize} from '../../src/ui/resizeViewport';
const save=baseSave();save.heroes=HEROES.map(h=>h.id);save.equipment=[{uid:'qa-guan',itemId:'blade',level:3,heroId:'guan-yu'},{uid:'qa-zhang',itemId:'armor',level:2,heroId:'zhang-fei'}];gameStore.useCloudSave(save);
class Boot extends Phaser.Scene{preload(){loadHeroUi(this.load);for(const a of Object.values(LOBBY_ASSETS))this.load.image(a.key,a.url);
 this.load.spritesheet('battle-sprites','/assets/heroes/battle-sprites.webp',{frameWidth:256,frameHeight:256});
 this.load.spritesheet('hero-portraits','/assets/heroes/portraits.webp',{frameWidth:256,frameHeight:256});
 for(const a of new Set(Object.values(EQUIPMENT).map(d=>d.art)))this.load.image('gear-'+a,'/assets/equipment/'+a);
 }create(){this.scene.start('Equipment',{heroId:'guan-yu'});}}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,render:{preserveDrawingBuffer:true},scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,HeroesScene,EquipmentScene]});
bindViewportResize(game,document.getElementById('game')!);window.qa={game,gameStore,heroNavigation,heroStats,combatPower,HEROES};
`);
const server=await createServer({server:{host:'127.0.0.1',port:5197,strictPort:true,watch:null},clearScreen:false});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});await page.route('https://*.supabase.co/**',r=>r.abort());
 await page.goto('http://127.0.0.1:5197/.vite/hero-system-qa/index.html');
 await page.waitForFunction(()=>window.qa?.game.scene.isActive('Equipment'),null,{timeout:90000});await page.waitForTimeout(1200);
 const capture=async name=>{await page.evaluate(()=>window.qa.game.loop.sleep());await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:93,timeout:60000});await page.evaluate(()=>window.qa.game.loop.wake());};
 const start=async(scene,data)=>{await page.evaluate(({scene,data})=>{const active=window.qa.game.scene.getScenes(true)[0];if(active.sys.settings.key===scene)active.scene.restart(data);else active.scene.start(scene,data);},{scene,data});await page.waitForFunction(({scene,id})=>{const s=window.qa.game.scene.getScene(scene);return s.scene.isActive()&&s.data.get('equipmentHeroView')?.selectedHeroId===id;},{scene,id:data.heroId});await page.waitForTimeout(240);};
 const click=async(scene,name)=>{const point=await page.evaluate(({scene,name})=>{const s=window.qa.game.scene.getScene(scene),o=s.children.getByName(name),c=s.cameras.main,r=s.game.canvas.getBoundingClientRect();if(!o)throw Error('Missing '+name);return{x:r.x+(o.x-c.scrollX)*r.width/s.scale.width,y:r.y+(o.y-c.scrollY)*r.height/s.scale.height};},{scene,name});await page.mouse.click(point.x,point.y);if(name.startsWith('hero.tab.')){const tab=name.slice(9),key=tab==='equipment'?'Equipment':'Heroes';await page.waitForFunction(({key,tab})=>{const s=window.qa.game.scene.getScene(key);return s.scene.isActive()&&s.data.get('equipmentHeroView')?.tab===tab;},{key,tab});}await page.waitForTimeout(300);};
 const reports=[];
 for(const [width,height] of [[1920,1080],[1280,720],[844,390]]){
  await page.setViewportSize({width,height});
  for(const scene of ['Heroes','Equipment']){
   await page.evaluate(({scene,before})=>{const game=window.qa.game;for(const s of game.scene.getScenes(true))s.scene.stop();game.scene.start(scene,{heroId:'guan-yu',bag:before&&scene==='Equipment'});},{scene,before});
   await page.waitForFunction(key=>window.qa.game.scene.isActive(key),scene);await page.waitForTimeout(600);
   await capture(`${before?'before':'after'}-${scene}-${width}x${height}`);
   if(!before){const state=await page.evaluate(key=>window.qa.game.scene.getScene(key).data.get('equipmentHeroView'),scene);assert.equal(state.selectedHeroId,'guan-yu');}
  }
  if(!before){
   await click('Equipment','equipment.slot.weapon');
   assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Equipment').data.get('equipmentManager')?.selectedHeroId),'guan-yu');
   await capture(`after-manager-${width}x${height}`);await page.keyboard.press('Escape');await page.waitForTimeout(240);
   assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Equipment').data.get('equipmentManager')),undefined);
  }
 }
 if(!before){
  const saveBefore=await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot));
  await page.setViewportSize({width:1280,height:720});
  for(const heroId of ['guan-yu','zhao-yun','lu-bu','zhuge-liang','diao-chan','zhang-fei']){
   console.log('QA hero',heroId);
   await start('Heroes',{heroId});
   for(const [tab,key] of [['skills','Heroes'],['signature','Heroes'],['equipment','Equipment'],['detail','Heroes']]){
    const active=await page.evaluate(()=>window.qa.game.scene.getScenes(true)[0].sys.settings.key);
    await click(active,'hero.tab.'+tab);
    const data=await page.evaluate(key=>{const s=window.qa.game.scene.getScene(key),v=s.data.get('equipmentHeroView'),save=window.qa.gameStore.snapshot,h=window.qa.HEROES.find(h=>h.id===v.selectedHeroId);return{...v,active:s.scene.isActive(),expectedPower:window.qa.combatPower(window.qa.heroStats(h,save.heroExp[h.id],save.heroStars?.[h.id],save.equipment)),texture:s.children.getByName('equipment.fullbody.'+h.id).texture.key};},key);
    assert.equal(data.active,true);assert.equal(data.selectedHeroId,heroId);assert.equal(data.tab,tab);assert.equal(data.power,data.expectedPower);
    if(heroId==='guan-yu')assert.deepEqual(data.gearUids,['qa-guan']);if(heroId==='zhang-fei')assert.deepEqual(data.gearUids,['qa-zhang']);
    if(heroId!=='zhang-fei')assert.ok(data.texture.startsWith('equipment.theme.heroes/full_body/'));
    reports.push(data);
   }
   await capture('after-hero-'+heroId);
  }
  await start('Equipment',{heroId:'zhang-fei',bag:true,uid:'qa-guan'});
  assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Equipment').data.get('equipmentManager').selectedUid),'qa-zhang');
  await page.keyboard.press('Escape');await page.waitForTimeout(250);
  await click('Equipment','hero.tab.skills');await capture('after-skills');
  await click('Heroes','hero.tab.signature');await capture('after-signature');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);
  const bounds=await page.evaluate(()=>{const s=window.qa.game.scene.getScene('Heroes');return s.children.list.filter(o=>o.type==='Text'&&o.x>900&&o.y>90&&o.y<640).map(o=>({text:o.text,left:o.getBounds().left,right:o.getBounds().right,top:o.getBounds().top,bottom:o.getBounds().bottom}));});
  for(const b of bounds){assert.ok(b.left>=900&&b.right<=1235&&b.top>=85&&b.bottom<=635,JSON.stringify(b));}
  const touch=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),mobile=await touch.newPage();
  await mobile.route('https://*.supabase.co/**',r=>r.abort());mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto('http://127.0.0.1:5197/.vite/hero-system-qa/index.html');await mobile.waitForFunction(()=>window.qa?.game.scene.getScene('Equipment').data.get('equipmentHeroView'),null,{timeout:90000});
  const mp=await mobile.evaluate(()=>{const s=window.qa.game.scene.getScene('Equipment'),z=s.children.getByName('hero.tab.skills'),r=s.game.canvas.getBoundingClientRect();return{x:r.x+(z.x-s.cameras.main.scrollX)*r.width/s.scale.width,y:r.y+(z.y-s.cameras.main.scrollY)*r.height/s.scale.height};});
  await mobile.touchscreen.tap(mp.x,mp.y);await mobile.waitForFunction(()=>window.qa.game.scene.isActive('Heroes')&&window.qa.game.scene.getScene('Heroes').data.get('heroScreen')?.tab==='skills');await touch.close();
  assert.equal(await page.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot)),saveBefore);
  const comparison=await browser.newPage({viewport:{width:1920,height:1200}});
  await comparison.setContent('<style>body{margin:0;background:#1e0c14;color:#ffe1a0;font:22px Arial}section{display:flex;gap:12px;padding:12px}article{width:936px}img{width:936px;display:block}h3{margin:8px}</style>'+['Heroes','Equipment'].map(s=>'<section>'+['before','after'].map(t=>`<article><h3>${s} · ${t}</h3><img src="http://127.0.0.1:5197/${out}/${t}-${s}-1280x720.jpg"></article>`).join('')+'</section>').join(''));
  await comparison.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await comparison.screenshot({path:out+'/comparison-before-after.jpg',type:'jpeg',quality:94,fullPage:true});await comparison.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(out+`/${before?'before':'after'}-report.json`,JSON.stringify({errors,reports,realAccount:false},null,2));
 console.log('HERO_SYSTEM_SCREENSHOTS_PASS');
}finally{await browser?.close();await server.close();}
