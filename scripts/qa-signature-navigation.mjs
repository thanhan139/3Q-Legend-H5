// Real Phaser scenes and game-command with isolated account fixtures. No remote saves are written.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const output='.vite/signature-stars-qa';
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
import {changeInventory,inventoryQuantity,ITEM_IDS} from '../../src/domain/resources';
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
const receipts=new Map(), attempts=[];
let dropNextForge=false, releaseForge;
const load=()=>{cloud.owner=owner;const row=rows.get(owner);cloud.current=undefined;
 cloud.apply({status:'ok',save:row.state,revision:String(row.revision),tutorial});};
load();heroNavigation.resolve(a,owner,'guan-yu');
mailRepository.list=async()=>({rows:[],total:0,filtered:0,unread:{all:0},claimable:0,deletable:0});
cloud.send=async intent=>{
 const forgeOperation=['forge','signatureStar'].includes(intent.command?.type);
 if(forgeOperation){
  attempts.push(intent.requestId);
  if(dropNextForge)await new Promise(resolve=>releaseForge=resolve);
 }
 const response=await handleGameRequest(intent,owner,{
 user:async uid=>({id:uid,email_confirmed_at:'yes'}),read:async uid=>structuredClone(rows.get(uid)),
 create:async()=>({}),receipt:async(uid,requestId)=>receipts.has(uid+':'+requestId),sign:async()=>'',verify:async()=>false,
 commit:async(uid,requestId,revision,command,state,receipt)=>{
  const row=rows.get(uid), key=uid+':'+requestId;
  if(receipts.has(key))return {status:'ok',save:row.state,revision:String(row.revision),receipt:receipts.get(key),tutorial};
  if(revision!==String(row.revision))return {status:'conflict',save:row.state,revision:String(row.revision),tutorial};
  receipts.set(key,receipt);
  commands.push(command);rows.set(uid,{state,revision:row.revision+1});
  return {status:'ok',save:state,revision:String(row.revision+1),receipt,tutorial};
 }
 });
 if(forgeOperation&&dropNextForge){dropNextForge=false;throw Error('Không thể kết nối máy chủ');}
 return response;
};
class Boot extends Phaser.Scene{constructor(){super('Boot');}
 preload(){loadHeroUi(this.load);for(const a of Object.values(LOBBY_ASSETS))this.load.image(a.key,a.url);
  this.load.spritesheet('battle-sprites','/assets/heroes/battle-sprites.webp',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('hero-portraits','/assets/heroes/portraits.webp',{frameWidth:256,frameHeight:256});
  for(const art of new Set(Object.values(EQUIPMENT).map(d=>d.art)))this.load.image('gear-'+art,'/assets/equipment/'+art);
 }create(){this.scene.start('Lobby');}}
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,render:{preserveDrawingBuffer:true},
 scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,LobbyScene,HeroesScene,ForgeScene,new Phaser.Scene({key:'Campaign'})]});
bindViewportResize(game,document.getElementById('game'));
window.qa={game,commands,attempts,drop:()=>{dropNextForge=true;},release:()=>releaseForge?.(),
 wallet:(count)=>{const row=rows.get(owner);const state=structuredClone(gameStore.snapshot);
   changeInventory(state,ITEM_IDS.forgeShard,count-inventoryQuantity(state,ITEM_IDS.forgeShard));
   rows.set(owner,{state,revision:row.revision+1});load();
 },reload:load,save:()=>gameStore.snapshot,swap:(who='b')=>{owner='qa-signature-'+who;load();},
 upgradeForeign:async()=>{try{
   await cloud.execute({type:'signatureStar',uid:'test-azure',expectedNodes:24,rulesVersion:1});
   return 'accepted';
 }catch(e){return e.message;}},
 prime:(count)=>{const row=rows.get(owner),state=structuredClone(gameStore.snapshot);
   state.equipment.find(item=>item.uid==='test-azure').signatureNodes=24;
   state.equipment.push({uid:'backup-azure',itemId:'azureMoon',level:1,signatureNodes:5});
   changeInventory(state,ITEM_IDS.forgeShard,count-inventoryQuantity(state,ITEM_IDS.forgeShard));
   rows.set(owner,{state,revision:row.revision+1});load();
 },
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
  const position=(scene,name)=>page.evaluate(({scene,name})=>{
      const s=window.qa.game.scene.getScene(scene);
      const all=children=>children.flatMap(item=>item.type==='Container'?[item,...all(item.list)]:[item]);
      const target=all(s.children.list).find(item=>item.name===name&&item.input?.enabled);
      if(!target)throw Error('Missing hit target '+name);
      const {tx,ty}=target.getWorldTransformMatrix();
      const r=s.game.canvas.getBoundingClientRect();
      return {x:r.x+(tx-s.cameras.main.scrollX)*r.width/s.scale.width,y:r.y+(ty-s.cameras.main.scrollY)*r.height/s.scale.height};
    },{scene,name});
  const click=async (scene,name,touch=false)=>{
    const point=await position(scene,name);
    await (touch?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y));
  };
  const active=(scene)=>page.waitForFunction(key=>window.qa?.game.scene.isActive(key),scene);
  const sceneText=(scene,text)=>page.waitForFunction(([scene,text])=>{
    const matches=nodes=>nodes.some(node=>node.text?.includes(text)||(node.type==='Container'&&matches(node.list)));
    return matches(window.qa.game.scene.getScene(scene).children.list);
  },[scene,text]);
  const upgradeSuccess=async()=>{
    await sceneText('Forge','Nâng cánh thành công');
    const hasSaveMessage=await page.evaluate(()=>{
      const scene=window.qa.game.scene.getScene('Forge');
      const hasText=nodes=>nodes.some(node=>node.text?.includes('cánh đã lưu')||
        (node.type==='Container'&&hasText(node.list)));
      return hasText(scene.children.list);
    });
    assert.equal(hasSaveMessage,false);
  };
  const previewName=name=>page.waitForFunction(name=>{
    const root=window.qa.game.scene.getScene('Forge').children.list.find(node=>node.type==='Container');
    return root?.list.some(node=>node.name==='forge.preview.name'&&node.text===name);
  },name);
  const resize=async (width,height)=>{
    await page.setViewportSize({width,height});
    await page.waitForFunction(([width,height])=>{
      const rect=window.qa.game.canvas.getBoundingClientRect();
      return Math.abs(rect.width-width)<2&&Math.abs(rect.height-height)<2;
    },[width,height]);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  };
  const screenshot=async name=>{await page.waitForTimeout(240);await page.screenshot({path:`${output}/${name}.png`});};
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
  await screenshot('forge-1280x720');
  const allWeapons = {azureMoon:'Thanh Long Yển Nguyệt Đao',serpentSpear:'Trượng Bát Xà Mâu',
    silverSpear:'Long Đảm Lượng Ngân Thương',skyHalberd:'Phương Thiên Họa Kích',
    featherFan:'Ngọa Long Vũ Phiến',heavenSword:'Ỷ Thiên Kiếm'};
  for(const [id,name] of Object.entries(allWeapons)) {
    await click('Forge',`forge.weapon.${id}`);
    await previewName(name);
    if(id==='azureMoon')await sceneText('Forge','Đang trang bị · Quan Vũ');
  }
  await click('Forge','forge.collection');
  await click('Forge','forge.weapon.phoenixSpear');await sceneText('Forge','Phượng Vũ Thương');
  await click('Forge','forge.collection');
  await click('Forge','forge.weapon.silverSpear');await sceneText('Forge','Chưa sở hữu');
  await click('Forge','forge.weapon.azureMoon');
  await previewName(allWeapons.azureMoon);
  await resize(1920,1080);await screenshot('forge-1920x1080');
  await resize(1280,720);
  await click('Forge','forge.weapon.silverSpear');
  await previewName(allWeapons.silverSpear);
  await page.evaluate(()=>window.qa.wallet(49));
  await sceneText('Forge','49/50 Mảnh Thần Binh');
  await click('Forge','forge.craft');await sceneText('Forge','Còn thiếu 1');
  await screenshot('shortage-1280x720');
  assert.equal(await page.evaluate(()=>window.qa.attempts.length),0);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.qa.wallet(100));
  await sceneText('Forge','100/50 Mảnh Thần Binh');
  await page.evaluate(()=>window.qa.wallet(50));
  await sceneText('Forge','50/50 Mảnh Thần Binh');
  await click('Forge','forge.craft');await sceneText('Forge','Xác nhận rèn');
  await screenshot('confirm-1280x720');
  await page.evaluate(()=>window.qa.drop());
  const confirmPoint=await position('Forge','forge.confirm');
  await page.mouse.dblclick(confirmPoint.x,confirmPoint.y,{delay:50});
  await sceneText('Forge','Đang rèn…');
  assert.equal(await page.evaluate(()=>window.qa.attempts.length),1);
  await screenshot('pending-1280x720');
  await page.evaluate(()=>window.qa.release());
  await sceneText('Forge','Không thể kết nối máy chủ');
  await screenshot('retry-1280x720');
  await click('Forge','forge.confirm');await sceneText('Forge','Rèn thành công');
  await sceneText('Forge','0/50 Mảnh Thần Binh');
  await screenshot('success-1280x720');
  const attempts=await page.evaluate(()=>window.qa.attempts.slice());
  assert.equal(attempts.length,2);
  assert.equal(attempts[0],attempts[1]);
  await click('Forge','forge.close');
  await page.evaluate(()=>window.qa.reload());
  await sceneText('Forge','Đã sở hữu · 1 món');
  assert.equal(await page.evaluate(()=>window.qa.save().equipment.find(item=>item.uid==='forge:1').itemId),'silverSpear');
  await click('Forge','forge.return');await expectHero('guan-yu');await sceneText('Heroes','Trong kho · Cường hóa +0');
  assert.deepEqual(await page.evaluate(()=>window.qa.commands.map(command=>command.type)),['unequip','enhance','equip','forge']);
  await resize(844,390);
  await click('Heroes','shared.back-to-lobby',true);await enter('guan-yu',true);
  await page.screenshot({path:`${output}/signature-844x390.png`});
  await click('Heroes','signature.forge',true);await active('Forge');await sceneText('Forge','0/50 Mảnh Thần Binh');
  await screenshot('forge-844x390');
  const first=await position('Forge','forge.weapon.azureMoon');
  await page.mouse.move(first.x,first.y);
  await page.mouse.down();
  await page.mouse.move(first.x-38,first.y,{steps:5});
  await page.mouse.up();
  await previewName(allWeapons.serpentSpear);
  await click('Forge','forge.weapon.azureMoon',true);
  await sceneText('Forge','Đang trang bị · Quan Vũ');
  await page.evaluate(()=>window.qa.prime(300));
  await sceneText('Forge','24/25 cánh');
  const beforeStar=await page.evaluate(()=>window.qa.health());
  await click('Forge','forge.copy',true);await sceneText('Forge','5/25 cánh');
  await click('Forge','forge.copy',true);await sceneText('Forge','24/25 cánh');
  await screenshot('four-petals-844x390');
  await resize(1280,720);await screenshot('four-petals-1280x720');
  await resize(844,390);
  await click('Forge','forge.star',true);await sceneText('Forge','Dùng 300 mảnh');
  await page.evaluate(()=>window.qa.drop());
  await click('Forge','forge.confirm',true);
  await sceneText('Forge','Đang nâng cánh…');
  await page.evaluate(()=>window.qa.release());
  await sceneText('Forge','Không thể kết nối máy chủ');
  await click('Forge','forge.confirm',true);await upgradeSuccess();
  await screenshot('star-success-844x390');
  await click('Forge','forge.close',true);
  await sceneText('Forge','Đã đạt 5 sao vàng');
  const afterStar=await page.evaluate(()=>window.qa.health());
  assert.ok(afterStar.every((value,index)=>value>beforeStar[index]));
  const finalStar=await page.evaluate(()=>({
    state:window.qa.save(),requests:window.qa.attempts.slice(-2),
    upgraded:window.qa.commands.filter(command=>command.type==='signatureStar')
  }));
  assert.equal(finalStar.state.forge.shards,0);
  assert.equal(finalStar.state.equipment.find(item=>item.uid==='test-azure').signatureNodes,25);
  assert.equal(finalStar.state.equipment.find(item=>item.uid==='backup-azure').signatureNodes,5);
  assert.equal(finalStar.requests[0],finalStar.requests[1]);
  assert.equal(finalStar.upgraded.length,1);
  await screenshot('five-stars-844x390');
  await resize(1280,720);await screenshot('five-stars-1280x720');
  await resize(1920,1080);await screenshot('five-stars-1920x1080');
  await resize(844,390);
  await click('Forge','forge.return',true);await expectHero('guan-yu');
  await click('Heroes','shared.back-to-lobby',true);await active('Lobby');
  await page.evaluate(()=>window.qa.swap());await enter('liu-bei',true);
  assert.equal(await page.evaluate(()=>window.qa.save().equipment?.length??0),0);
  assert.match(await page.evaluate(()=>window.qa.upgradeForeign()),/từ chối/i);
  assert.equal(await page.evaluate(()=>window.qa.save().forge.shards),50);
  await click('Heroes','signature.item.heavenSword',true);
  await sceneText('Heroes','Chưa sở hữu · Chưa chế tạo');
  await click('Heroes','signature.craft',true);await sceneText('Heroes','Trong kho · Cường hóa +0');
  assert.equal(await page.evaluate(()=>window.qa.save().equipment.find(item=>item.uid==='forge:1').itemId),'heavenSword');
  await click('Heroes','signature.forge',true);await active('Forge');
  await click('Forge','forge.star',true);await sceneText('Forge','Không đủ mảnh');
  await screenshot('shortage-844x390');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.qa.wallet(50));
  await click('Forge','forge.star',true);await click('Forge','forge.confirm',true);
  await upgradeSuccess();
  assert.equal(await page.evaluate(()=>window.qa.save().equipment.find(item=>item.uid==='forge:1').signatureNodes),2);
  await click('Forge','forge.close',true);
  await click('Forge','forge.star',true);await sceneText('Forge','Không đủ mảnh');
  await click('Forge','forge.modal.campaign',true);await active('Campaign');
  await page.evaluate(()=>window.qa.swap('a'));
  assert.equal(await page.evaluate(()=>window.qa.save().equipment.find(item=>item.uid==='test-azure').signatureNodes),25);
  assert.deepEqual(errors,[]);
  console.log('Forge V2 QA passed: six signatures, shared wallet 0/49/50/100, double-click, receipt replay, UID switch, PvE/Arena stats, Back, Campaign route, desktop/mobile input, exact item UID, star upgrade and retry, UID isolation on reload.');
}finally{await browser?.close();await vite.close();}
