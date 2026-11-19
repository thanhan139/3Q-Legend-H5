// Real Phaser scenes and game-command with isolated account fixtures. No remote saves are written.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const output='.vite/signature-navigation-qa';
await mkdir(output,{recursive:true});
await writeFile(`${output}/index.html`,'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(`${output}/fixture.ts`,`
import Phaser from 'phaser';
import '../../src/style.css';
import {HeroesScene} from '../../src/scenes/HeroesScene';
import {ForgeScene} from '../../src/scenes/ForgeScene';
import {LobbyScene} from '../../src/scenes/LobbyScene';
import {gameStore,baseSave} from '../../src/domain/store';
import {cloudRepository} from '../../src/cloud/cloudRepository';
import {mailRepository} from '../../src/cloud/mailRepository';
import {handleGameRequest} from '../../supabase/functions/game-command/handler';
import {legacyTutorial} from '../../src/domain/tutorial';
import {EQUIPMENT} from '../../src/data/equipmentConfig';
import {LOBBY_ASSETS} from '../../src/data/lobbyAssets';
import {STAGES} from '../../src/data/campaign';
import {heroNavigation} from '../../src/ui/heroNavigation';
import {loadHeroUi} from '../../src/ui/heroUiAssets';
import {bindViewportResize} from '../../src/ui/resizeViewport';
import {makeArenaBattle,makeStageBattle} from '../../src/domain/battle';
import {arenaSquad} from '../../supabase/functions/arena-command/squad';
let owner='qa-signature-a';
const a=baseSave(), b=baseSave(), tutorial=legacyTutorial(), commands=[];
a.copper=5000;a.forge.shards=50;a.equipment=[{uid:'test-azure',itemId:'azureMoon',level:3,heroId:'guan-yu'}];
b.heroes=['liu-bei'];b.formation=['liu-bei',null,null,null,null,null];b.forge.shards=50;
const rows=new Map([[owner,{state:a,revision:0}],['qa-signature-b',{state:b,revision:0}]]);
const cloud=cloudRepository as any;
const load=()=>{cloud.owner=owner;const row=rows.get(owner);cloud.current=undefined;
 cloud.apply({status:'ok',save:row.state,revision:String(row.revision),tutorial});};
load();heroNavigation.resolve(a,owner,'guan-yu');
mailRepository.list=async()=>({rows:[],total:0,filtered:0,unread:{all:0},claimable:0,deletable:0});
cloud.send=async intent=>handleGameRequest(intent,owner,{
 user:async uid=>({id:uid,email_confirmed_at:'yes'}),read:async uid=>structuredClone(rows.get(uid)),
 create:async()=>({}),receipt:async()=>false,sign:async()=>'',verify:async()=>false,
 commit:async(uid,requestId,revision,command,state,receipt)=>{
  const row=rows.get(uid);if(revision!==String(row.revision))return {status:'conflict'};
  commands.push(command);rows.set(uid,{state,revision:row.revision+1});
  return {status:'ok',save:state,revision:String(row.revision+1),receipt,tutorial};
 }
});
class Boot extends Phaser.Scene{constructor(){super('Boot');}
 preload(){loadHeroUi(this.load);for(const a of Object.values(LOBBY_ASSETS))this.load.image(a.key,a.url);
  this.load.spritesheet('battle-sprites','/assets/heroes/battle-sprites.webp',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('hero-portraits','/assets/heroes/portraits.webp',{frameWidth:256,frameHeight:256});
  for(const art of new Set(Object.values(EQUIPMENT).map(d=>d.art)))this.load.image('gear-'+art,'/assets/equipment/'+art);
 }create(){this.scene.start('Lobby');}}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,render:{preserveDrawingBuffer:true},
 scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,LobbyScene,HeroesScene,ForgeScene]});
bindViewportResize(game,document.getElementById('game'));
window.qa={game,commands,save:()=>gameStore.snapshot,swap:()=>{owner='qa-signature-b';load();},
 health:()=>{const s=gameStore.snapshot;
  const actor=units=>units.find(u=>u.side==='player'&&u.heroId==='guan-yu')?.maxHp;
  return [actor(makeStageBattle(STAGES[0],s.formation,s.heroExp,s.heroStars,s.equipment).units),
   actor(makeArenaBattle(arenaSquad(s),arenaSquad(b)).units)];}};
`);

const vite=await createServer({server:{host:'127.0.0.1',port:5226,strictPort:true,watch:null},clearScreen:false});
await vite.listen();
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().includes('/assets/')&&response.status()>=400)errors.push(response.url());});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto(`http://127.0.0.1:5226/${output}/index.html`);
  const click=async (scene,name,touch=false)=>{
    const point=await page.evaluate(({scene,name})=>{
      const s=window.qa.game.scene.getScene(scene);
      const all=children=>children.flatMap(item=>item.type==='Container'?[item,...all(item.list)]:[item]);
      const target=all(s.children.list).find(item=>item.name===name&&item.input?.enabled);
      if(!target)throw Error('Missing hit target '+name);
      const {tx,ty}=target.getWorldTransformMatrix();
      const r=s.game.canvas.getBoundingClientRect();
      return {x:r.x+(tx-s.cameras.main.scrollX)*r.width/s.scale.width,y:r.y+(ty-s.cameras.main.scrollY)*r.height/s.scale.height};
    },{scene,name});
    await (touch?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y));
  };
  const active=(scene)=>page.waitForFunction(key=>window.qa?.game.scene.isActive(key),scene);
  const sceneText=(scene,text)=>page.waitForFunction(([scene,text])=>window.qa.game.scene.getScene(scene).children.list
    .some(object=>object.text?.includes(text)),[scene,text]);
  const equipped=()=>page.evaluate(()=>window.qa.save().equipment?.find(item=>item.uid==='test-azure'));
  const expectHero=(hero)=>page.waitForFunction(hero=>{
    const scene=window.qa.game.scene.getScene('Heroes'),state=scene.data.get('heroScreen');
    return scene.scene.isActive()&&state?.selectedHeroId===hero&&state?.tab==='signature'&&
      scene.children.list.filter(item=>item.name?.startsWith('signature.item.')).length===6;
  },hero);
  const enter=async (hero,touch=false)=>{
    await active('Lobby'); await page.waitForTimeout(250);
    await click('Lobby','lobby.11',touch); await active('InventoryCategoryPopup'); await page.waitForTimeout(250);
    if(touch){await page.mouse.move(420,160);await page.mouse.wheel(0,460);await page.waitForTimeout(200);}
    await click('InventoryCategoryPopup','inventory.category.than_binh',touch);await expectHero(hero);
  };
  await enter('guan-yu');
  const initial=await page.evaluate(()=>window.qa.health());
  assert.ok(initial.every(value=>value>0));
  await page.screenshot({path:`${output}/signature-1280x720.png`});
  await click('Heroes','signature.equip');await sceneText('Heroes','Trong kho · Cường hóa +2');
  assert.equal((await equipped()).heroId,undefined);
  const without=await page.evaluate(()=>window.qa.health());
  assert.ok(without.every((value,index)=>value<initial[index]));
  await click('Heroes','signature.enhance');await sceneText('Heroes','Trong kho · Cường hóa +3');
  await click('Heroes','signature.equip');await sceneText('Heroes','Đang trang bị · Quan Vũ · +3');
  assert.equal((await equipped()).heroId,'guan-yu');
  assert.ok((await page.evaluate(()=>window.qa.health())).every((v,i)=>v>initial[i]));
  await click('Heroes','signature.item.silverSpear');await sceneText('Heroes','Chưa sở hữu · Chưa chế tạo');
  await click('Heroes','signature.forge');await active('Forge');await sceneText('Forge','50/50 Mảnh Thần Binh');
  await page.screenshot({path:`${output}/forge-1280x720.png`});
  await click('Forge','forge.craft');await sceneText('Forge','0/50 Mảnh Thần Binh');
  assert.equal(await page.evaluate(()=>window.qa.save().equipment.find(item=>item.uid==='forge:1').itemId),'silverSpear');
  await click('Forge','forge.return');await expectHero('guan-yu');await sceneText('Heroes','Trong kho · Cường hóa +0');
  assert.deepEqual(await page.evaluate(()=>window.qa.commands.map(command=>command.type)),['unequip','enhance','equip','forge']);
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
  await click('Heroes','shared.back-to-lobby',true);await enter('guan-yu',true);
  await page.screenshot({path:`${output}/signature-844x390.png`});
  await click('Heroes','signature.forge',true);await active('Forge');await sceneText('Forge','0/50 Mảnh Thần Binh');
  await page.screenshot({path:`${output}/forge-844x390.png`});
  await click('Forge','forge.return',true);await expectHero('guan-yu');
  await click('Heroes','shared.back-to-lobby',true);await active('Lobby');
  await page.evaluate(()=>window.qa.swap());await enter('liu-bei',true);
  assert.equal(await page.evaluate(()=>window.qa.save().equipment?.length??0),0);
  await click('Heroes','signature.item.heavenSword',true);
  await sceneText('Heroes','Chưa sở hữu · Chưa chế tạo');
  await click('Heroes','signature.craft',true);await sceneText('Heroes','Trong kho · Cường hóa +0');
  assert.equal(await page.evaluate(()=>window.qa.save().equipment.find(item=>item.uid==='forge:1').itemId),'heavenSword');
  assert.deepEqual(errors,[]);
  console.log('Signature QA passed: Lobby navigation, six items, confirmed commands, PvE/Arena stats, UID switch, desktop and touch.');
}finally{await browser?.close();await vite.close();}
