import {createServer} from 'vite';import {mkdir,writeFile} from 'node:fs/promises';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const out='.vite/equipment-themes-qa';await mkdir(out,{recursive:true});
await writeFile(out+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(out+'/fixture.ts',`
import Phaser from 'phaser';import '../../src/style.css';import {EquipmentScene} from '../../src/scenes/EquipmentScene';
import {gameStore,baseSave} from '../../src/domain/store';import {HEROES} from '../../src/data/heroes';import {EQUIPMENT} from '../../src/data/equipmentConfig';
import {LOBBY_ASSETS} from '../../src/data/lobbyAssets';import {bindViewportResize} from '../../src/ui/resizeViewport';
const save=baseSave();save.heroes=HEROES.map(h=>h.id);save.equipment=[{uid:'qa-guan',itemId:'blade',level:3,heroId:'guan-yu'},{uid:'qa-zhang',itemId:'armor',level:2,heroId:'zhang-fei'}];gameStore.useCloudSave(save);
class Boot extends Phaser.Scene{preload(){for(const a of Object.values(LOBBY_ASSETS))this.load.image(a.key,a.url);
 this.load.spritesheet('battle-sprites','/assets/heroes/battle-sprites.webp',{frameWidth:256,frameHeight:256});
 this.load.spritesheet('hero-portraits','/assets/heroes/portraits.webp',{frameWidth:256,frameHeight:256});
 for(const a of new Set(Object.values(EQUIPMENT).map(d=>d.art)))this.load.image('gear-'+a,'/assets/equipment/'+a);
 }create(){this.scene.start('Equipment',{heroId:'guan-yu'});}}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,fps:{target:60},render:{preserveDrawingBuffer:true},scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,EquipmentScene]});bindViewportResize(game,document.getElementById('game')!);window.qa={game,gameStore};
`);
const server=await createServer({server:{host:'127.0.0.1',port:5193,watch:null},clearScreen:false});await server.listen();let browser;
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});await p.route('https://*.supabase.co/**',r=>r.abort());
 await p.goto('http://127.0.0.1:5193/'+out+'/index.html');await p.waitForFunction(()=>window.qa?.game.scene.getScene('Equipment').data.get('equipmentHeroView'),null,{timeout:90000});
 const reports=[];
 for(const [width,height] of [[1920,1080],[1280,720],[844,390]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(160);
  for(const heroId of ['guan-yu','zhao-yun','lu-bu','zhuge-liang','diao-chan','zhang-fei']){
   await p.evaluate(id=>window.qa.game.scene.getScene('Equipment').scene.restart({heroId:id,uid:'qa-guan'}),heroId);
   await p.waitForFunction(id=>window.qa.game.scene.getScene('Equipment').data.get('equipmentHeroView')?.selectedHeroId===id,heroId);
   await p.waitForTimeout(160);const data=await p.evaluate(()=>window.qa.game.scene.getScene('Equipment').data.get('equipmentHeroView'));
   const visual=await p.evaluate(id=>{const s=window.qa.game.scene.getScene('Equipment'),art=s.children.getByName('equipment.fullbody.'+id),loop=s.children.getByName('equipment.spiritLoop');
    return{texture:art.texture.key,uniform:art.scaleX===art.scaleY,animated:loop?.anims.isPlaying??false,frame:loop?.frame.name,name:s.children.getByName('equipment.heroName').text};},heroId);
   assert.ok(visual.uniform);assert.equal(visual.animated,heroId!=='zhang-fei');
   if(heroId==='zhang-fei')assert.equal(visual.texture,'battle-sprites');
   assert.equal(data.selectedHeroId,heroId);if(heroId!=='guan-yu')assert.equal(data.selectedUid,undefined);
   if(heroId==='zhang-fei')assert.deepEqual(data.gearUids,['qa-zhang']);
   await p.evaluate(()=>window.qa.game.loop.sleep());await p.screenshot({path:out+'/'+heroId+'-'+width+'x'+height+'.jpg',type:'jpeg',quality:94,timeout:60000});await p.evaluate(()=>window.qa.game.loop.wake());reports.push({width,height,...data,visual});console.log(heroId,width,height);
  }
 }
 for(let i=0;i<20;i++){const id=i%2?'guan-yu':'zhang-fei';await p.evaluate(id=>window.qa.game.scene.getScene('Equipment').scene.restart({heroId:id}),id);await p.waitForFunction(id=>window.qa.game.scene.getScene('Equipment').data.get('equipmentHeroView')?.selectedHeroId===id,id);}
 assert.ok(await p.evaluate(()=>{const s=window.qa.game.scene.getScene('Equipment');return s.children.list.length<250&&s.input.listenerCount('wheel')===1;}));
 const before=await p.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot));
 const point=await p.evaluate(()=>{const s=window.qa.game.scene.getScene('Equipment'),c=s.cameras.main,ratio=s.game.canvas.getBoundingClientRect().width/s.scale.width;return{x:(220-c.scrollX)*ratio,y:(243-c.scrollY)*ratio};});
 await p.mouse.click(point.x,point.y);await p.waitForFunction(()=>window.qa.game.scene.getScene('Equipment').data.get('equipmentManager'));
 await p.evaluate(()=>window.qa.game.scene.getScene('Equipment').scene.restart({heroId:'zhang-fei',bag:true,uid:'qa-guan'}));
 await p.waitForFunction(()=>window.qa.game.scene.getScene('Equipment').children.list.some(o=>o.type==='Text'&&o.text==='Đang dùng · Trương Phi'));
 assert.equal(await p.evaluate(()=>JSON.stringify(window.qa.gameStore.snapshot)),before);
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({reports,errors,switches:20,slotNavigation:true,foreignSelectionReset:true,saveUnchanged:true,realAccount:false},null,2));console.log('EQUIPMENT_THEMES_QA_PASS');
}finally{await browser?.close();await server.close();}
