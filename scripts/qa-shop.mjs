// Real ShopScene and game handler, with an isolated authenticated test save in memory.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const folder = '.vite/shop-qa';
await mkdir(folder,{recursive:true});
await writeFile(folder+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(folder+'/fixture.ts',`
import Phaser from 'phaser';
import '../../src/style.css';
import { ShopScene } from '../../src/scenes/ShopScene';
import { baseSave } from '../../src/domain/store';
import { cloudRepository } from '../../src/cloud/cloudRepository';
import { legacyTutorial } from '../../src/domain/tutorial';
import { handleGameRequest } from '../../supabase/functions/game-command/handler';
import { bindViewportResize } from '../../src/ui/resizeViewport';
const owner='shop-qa-a';
const cloud=cloudRepository as any;
let state={...baseSave(),coins:120000,gems:980,goldKeys:0}, revision=0, drop=false;
const ledger=new Map();
const enc=new TextEncoder();
const key=crypto.subtle.importKey('raw',enc.encode('fixture-key'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
const current=()=>({status:'ok',save:state,revision:String(revision),tutorial:legacyTutorial()});
cloud.owner=owner;
cloud.apply(current());
cloud.send=async (intent)=>{
  const result=await handleGameRequest(intent,owner,{
    user:async()=>({id:owner,email_confirmed_at:'yes'}), read:async()=>({state,revision}),
    shopTestEnabled:()=>true, create:async()=>({}), verify:async()=>false, receipt:async (_,id)=>ledger.has(id),
    sign:async value=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',await key,enc.encode(value))),x=>x.toString(16).padStart(2,'0')).join(''),
    commit:async (_,id,rev,command,newState,receipt)=>{
      const prior=ledger.get(id);
      if(prior)return JSON.stringify(prior.command)===JSON.stringify(command)?{...current(),receipt:prior.receipt}:{status:'reused'};
      if(rev!==String(revision))return {...current(),status:'conflict'};
      ledger.set(id,{command,receipt});state=newState;revision++;
      return {...current(),receipt};
    }
  });
  if(drop&&intent.action==='command'){drop=false;throw Error('Reply lost');}
  return result;
};
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[ShopScene]});
bindViewportResize(game,document.getElementById('game')!);
window.qa={game,drop:()=>drop=true,state:()=>state,receipts:()=>ledger.size};
`);

const vite=await createServer({server:{host:'127.0.0.1',port:5217,strictPort:true,watch:null},clearScreen:false});
await vite.listen();
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)errors.push(r.url());});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:5217/'+folder+'/index.html');
  const wait = text => page.waitForFunction(text => window.qa?.game.scene.getScene('Shop')?.layer?.list
    .some(object=>object.text?.includes(text)),text);
  const click=async (name,touch=false)=>{
    const point=await page.evaluate(id=>{
      const scene=window.qa.game.scene.getScene('Shop');
      const item=scene.layer.list.find(o=>o.name===id);
      if(!item)throw Error('Missing '+id);
      const box=scene.game.canvas.getBoundingClientRect();
      return {x:box.x+(item.x-scene.cameras.main.scrollX)*box.width/scene.scale.width,
        y:box.y+(item.y-scene.cameras.main.scrollY)*box.height/scene.scale.height};
    },name);
    await (touch?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y));
  };
  await wait('Sở hữu: 0');
  const count = prefix => page.evaluate(prefix => window.qa.game.scene.getScene('Shop').layer.list
    .filter(o=>o.name?.startsWith(prefix)).length,prefix);
  assert.equal(await count('shop.category.'),10);
  assert.equal(await count('shop.filter.'),4);
  assert.equal(await count('shop.card.'),8);
  for(const [width,height] of [[1920,1080],[1280,720],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.waitForFunction(([w,h])=>{
      const box=window.qa.game.canvas.getBoundingClientRect();return Math.round(box.width)===w && Math.round(box.height)===h;
    },[width,height]);
    const clipped=await page.evaluate(()=>{
      const s=window.qa.game.scene.getScene('Shop'),c=s.cameras.main;
      return s.layer.list.filter(o=>o.type==='Text'||o.type==='Zone').filter(o=>{
        const b=o.getBounds();return b.left<c.scrollX||b.top<c.scrollY||b.right>c.scrollX+s.scale.width||b.bottom>c.scrollY+s.scale.height;
      }).map(o=>o.text??o.name);
    });
    assert.deepEqual(clipped,[]);
    await page.screenshot({path:`${folder}/shop-${width}x${height}.png`});
  }
  await click('shop.filter.featured',true);
  assert.equal(await count('shop.card.'),2);
  await click('shop.filter.all',true);
  await click('shop.category.monthly',true);
  await wait('Chưa có mặt hàng');
  await click('shop.category.all',true);
  await click('shop.max',true);
  await click('shop.buy',true);
  await wait('Chìa Khóa Vàng ×4');
  await wait('Tổng giá: 380 Nguyên Bảo');
  await page.evaluate(()=>window.qa.drop());
  await click('shop.confirm',true);
  await wait('Đối chiếu giao dịch');
  assert.equal(await page.evaluate(()=>window.qa.state().goldKeys),4);
  await click('shop.buy',true);
  await wait('Đã mua · Nhận ×4');
  assert.equal(await page.evaluate(()=>window.qa.receipts()),1);
  await wait('Sở hữu: 4');
  await wait('Hôm nay: 4/4');
  assert.equal(await page.evaluate(()=>window.qa.state().gems),600);
  await click('shop.category.jewelry',true);
  await wait('Hôm nay: 0/999');
  for (const [name,total] of [['shop.quick.10','1.000 Vàng'],['shop.quick.100','10.000 Vàng'],['shop.quick.1','100 Vàng'],['shop.max','99.900 Vàng']]) {
    await click(name,true);
    await wait(total);
  }
  for (const [width,height] of [[1920,1080],[1280,720],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.waitForFunction(([w,h])=>{
      const box=window.qa.game.canvas.getBoundingClientRect();return Math.round(box.width)===w && Math.round(box.height)===h;
    },[width,height]);
    await page.screenshot({path:`${folder}/shop-essence-${width}x${height}.png`});
  }
  await click('shop.buy',true);
  await wait('Tổng giá: 99.900 Vàng');
  await click('shop.confirm',true);
  await wait('Hôm nay: 999/999');
  assert.equal(await page.evaluate(()=>window.qa.state().jewelryEssence),999);
  assert.equal(await page.evaluate(()=>window.qa.state().coins),20100);
  assert.equal(await page.evaluate(()=>window.qa.receipts()),2);
  assert.deepEqual(errors,[]);
  console.log('Shop browser QA passed: categories, filters, touch, quick quantities, 999 essence, lost reply and exactly-once retry.');
} finally {
  await browser?.close();
  await vite.close();
}
