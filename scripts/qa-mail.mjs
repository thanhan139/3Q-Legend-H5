// Render the production MailScene against browser-only QA data.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const folder='.vite/mail-qa';
await mkdir(folder,{recursive:true});
await writeFile(`${folder}/index.html`,'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(`${folder}/fixture.ts`,String.raw`
import Phaser from 'phaser';
import '../../src/style.css';
import { MailScene } from '../../src/scenes/MailScene';
import { mailRepository } from '../../src/cloud/mailRepository';
import { cloudRepository } from '../../src/cloud/cloudRepository';
import { bindViewportResize } from '../../src/ui/resizeViewport';
let owner='mail-qa-a', drop=false, unavailable=false;
Object.defineProperty(mailRepository,'uid',{get:()=>owner});
cloudRepository.refresh=async()=>false;
const a=[
 {id:'10000000-0000-4000-8000-000000000001',category:'system',subject:'Thưởng vượt ải Chương 1',
  rewards:{copper:17,coins:11,golden_key:1,jewelry_essence:3}},
 {id:'10000000-0000-4000-8000-000000000002',category:'system',subject:'Thông Báo Nhiệm Vụ Ngày',rewards:{}},
 {id:'10000000-0000-4000-8000-000000000003',category:'admin',subject:'Quà Sự Kiện Khai Mở',rewards:{golden_key:2},verified:true},
 {id:'10000000-0000-4000-8000-000000000004',category:'personal',subject:'Thư trợ giúp đã hết hạn',expired:true,rewards:{coins:2}},
 ...Array.from({length:14},(_,i)=>({id:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),
  category:'system',subject:'Thư tiếng Việt có tiêu đề dài để thử vùng dành riêng cho nội dung số '+(i+1),rewards:{}})),
].map((row,i)=>({sender:'Hệ Thống',created_at:new Date(Date.UTC(2026,10,18,11,24-i)).toISOString(),expires_at:null,
 read_at:i===3?'2026-11-18T11:01:00Z':null,claimed_at:null,expired:false,
 body:i>=4?'Đây là thư tiếng Việt dùng để kiểm tra ngắt dòng, dấu và phân trang nội dung. '.repeat(18):
  'Chúc mừng chúa công đã vượt ải! Phần thưởng đã được đính kèm trong thư này.\nHãy tiếp tục chinh phục những chương tiếp theo.',...row}));
const receipts=new Map();
mailRepository.send=async (uid,request)=>{
 if(uid!==owner||unavailable)throw Error('Không thể kết nối hộp thư. Vui lòng thử lại.');
 const rows=uid==='mail-qa-a'?a:[];
 const valid=r=>!r.claimed_at&&!r.expired&&Object.keys(r.rewards).length;
 if(request.action==='adminAccess')return {status:'ok',author:uid==='mail-qa-a',approver:false};
 if(request.action==='adminHistory')return {status:'ok',drafts:[]};
 if(request.action==='search')return {status:'ok',players:[{uid:'10000000-0000-4000-8000-000000000011',name:'Võ tướng QA'}]};
 if(request.action==='send'){
  rows.push({id:'10000000-0000-4000-8000-000000000010',category:'personal',subject:request.subject,body:request.body,
   sender:'Võ tướng QA',created_at:new Date().toISOString(),peer_uid:request.recipient,outgoing:true,
   rewards:{},expires_at:null,read_at:null,claimed_at:null,expired:false});
  return {status:'ok'};
 }
 if(request.action==='list'){
   const inbox=rows.filter(r=>!r.outgoing);
   const filtered=request.category==='sent'?rows.filter(r=>r.outgoing):inbox.filter(r=>request.category==='all'||r.category===request.category);
   const unread=Object.fromEntries(['all','admin','system','personal','sent','event'].map(c=>[c,inbox.filter(r=>!r.read_at&&(c==='all'||r.category===c)).length]));
   return {status:'ok',total:inbox.length,filtered:filtered.length,unread,claimable:inbox.filter(valid).length,
    deletable:inbox.filter(r=>r.read_at&&(r.claimed_at||!Object.keys(r.rewards).length)).length,
    rows:structuredClone(filtered.slice(request.page*12,request.page*12+12))};
 }
 if(request.action==='read'){
   const row=rows.find(r=>r.id===request.mailId);if(!row)throw Error('Không tìm thấy');
   row.read_at=new Date().toISOString();return {status:'ok'};
 }
 if(request.action==='deleteRead'){
   let deleted=0;
   for(let i=rows.length-1;i>=0;i--) if(rows[i].read_at&&(rows[i].claimed_at||!Object.keys(rows[i].rewards).length)) {rows.splice(i,1);deleted++;}
   return {status:'ok',deleted};
 }
 let receipt=receipts.get(request.requestId);
 if(!receipt){const chosen=rows.filter(r=>valid(r)&&(request.action==='claimAll'||r.id===request.mailId));
   chosen.forEach(r=>r.claimed_at=new Date().toISOString());
   receipt={kind:'mailClaim',mailIds:chosen.map(r=>r.id),rewards:{}};receipts.set(request.requestId,receipt);
 }
 if(drop){drop=false;throw Error('Không thể kết nối hộp thư. Vui lòng thử lại.');}
 return {status:'ok',receipt};
};
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,
 scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[MailScene,{key:'Boot'},{key:'Lobby'}]});
bindViewportResize(game,document.getElementById('game')!);
window.qa={game,drop:()=>drop=true,receipts:()=>receipts.size,offline:v=>unavailable=v,
 swap:()=>{game.scene.stop('Mail');owner='mail-qa-b';game.scene.start('Mail');}};
`);

const vite=await createServer({server:{host:'127.0.0.1',port:5219,strictPort:true,watch:null},clearScreen:false});
await vite.listen();
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)failures.push(r.url());});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto(`http://127.0.0.1:5219/${folder}/index.html`);
  const wait=text=>page.waitForFunction(value=>window.qa?.game.scene.getScene('Mail')?.layer?.list.some(o=>o.text?.includes(value)),text);
  const click=async name=>{
    const point=await page.evaluate(name=>{
      const scene=window.qa.game.scene.getScene('Mail');
      const control=scene.layer.list.find(o=>o.name===`mail.${name}`);
      if(!control)throw Error('Missing control '+name);
      const {tx,ty}=control.getWorldTransformMatrix();
      const canvas=scene.game.canvas.getBoundingClientRect();
      const sx=canvas.width/scene.scale.width, sy=canvas.height/scene.scale.height;
      if(canvas.width===844&&(control.width*scene.layer.scaleX*sx<43.5||control.height*scene.layer.scaleY*sy<43.5))
        throw Error('Touch area too small '+name);
      return {x:canvas.left+(tx-scene.cameras.main.scrollX)*sx,y:canvas.top+(ty-scene.cameras.main.scrollY)*sy};
    },name);
    await page.touchscreen.tap(point.x,point.y);
  };
  const resize=async(width,height)=>{
    await page.setViewportSize({width,height});
    await page.waitForFunction(([w,h])=>{const box=window.qa.game.canvas.getBoundingClientRect();return Math.round(box.width)===w&&Math.round(box.height)===h;},[width,height]);
    await page.waitForTimeout(150);
  };
  await wait('Thư: 18');
  await click('row.10000000-0000-4000-8000-000000000001');
  await wait('Phần Thưởng Đính Kèm');
  await wait('Có quà');
  for(const [width,height] of [[1920,1080],[1280,720],[844,390]]){
    await resize(width,height);
    await page.screenshot({path:`${folder}/mail-detail-${width}x${height}.png`});
  }
  await click('back');
  await wait('Thư: 18');
  await page.screenshot({path:`${folder}/mail-inbox-844x390.png`});
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:245}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330,y:170}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait('3–4 / 18');
  await click('tab.admin');
  await wait('Quà Sự Kiện Khai Mở');
  await click('tab.all');
  await wait('Thưởng vượt ải Chương 1');
  await click('row.10000000-0000-4000-8000-000000000001');
  await wait('Phần Thưởng Đính Kèm');
  await page.evaluate(()=>window.qa.drop());
  await click('claim');
  await wait('Không thể kết nối hộp thư');
  await click('reload');
  await wait('Đã nhận quà từ 1 thư');
  assert.equal(await page.evaluate(()=>window.qa.receipts()),1);
  await click('back');
  await click('all');
  await wait('Đã nhận quà từ 1 thư');
  assert.equal(await page.evaluate(()=>window.qa.receipts()),2);
  await click('delete');
  await wait('Xóa thư đã đọc?');
  await click('dialog.delete');
  await wait('Thư: 17');
  await resize(1280,720);
  await click('next'); await click('next'); await click('next');
  await wait('13–16 / 17');
  await click('row.20000000-0000-4000-8000-000000000010');
  await page.waitForFunction(()=>window.qa.game.scene.getScene('Mail').layer.list.some(o=>o.name==='mail.body.next'));
  await click('body.next');
  await resize(844,390);
  await click('compose');
  const compose=page.getByRole('dialog',{name:'Soạn Thư'});
  await compose.getByLabel('UID hoặc tên nhân vật').fill('Võ tướng QA');
  await compose.getByRole('button',{name:'Tìm',exact:true}).click();
  await compose.getByRole('button',{name:/Võ tướng QA/}).click();
  await compose.getByLabel('Tiêu đề').fill('Thư cá nhân kiểm thử');
  await compose.getByLabel('Nội dung').fill('Xin chào, hẹn gặp ở Sảnh!');
  await page.screenshot({path:`${folder}/mail-compose-844x390.png`});
  await compose.getByRole('button',{name:'Gửi Thư'}).click();
  await wait('Đã gửi: 1');
  await click('row.10000000-0000-4000-8000-000000000010');
  await wait('Đến: Võ tướng QA');
  await resize(1280,720);
  await click('admin');
  const admin=page.getByRole('dialog',{name:'Quản Trị Hộp Thư'});
  await admin.getByLabel('Toàn server').check();
  await admin.getByLabel('Tiêu đề').fill('Thông báo bảo trì QA');
  await admin.getByLabel('Nội dung').fill('Máy chủ sẽ bảo trì theo lịch.');
  await admin.getByRole('button',{name:'Xem trước'}).click();
  await admin.getByText('Người nhận: toàn server').waitFor();
  await page.screenshot({path:`${folder}/mail-admin-1280x720.png`});
  await admin.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{window.qa.offline(true);window.qa.swap();});
  await wait('Không thể tải hộp thư');
  assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Mail').layer.list.some(o=>o.text==='Hộp thư trống')),false);
  await page.evaluate(()=>window.qa.offline(false));
  await click('empty.retry');
  await wait('Hộp thư trống');
  await page.screenshot({path:`${folder}/mail-empty-1280x720.png`});
  assert.deepEqual(failures,[]);
  console.log('Mail Phaser QA passed: desktop/mobile, touch, read, attachment, lost response, receipt, delete, paging, and isolated empty inbox.');
} finally {
  await browser?.close();
  await vite.close();
}
