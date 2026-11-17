import {createServer} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='.vite/inventory-category-qa';await mkdir(out,{recursive:true});
const source=await readFile('scripts/qa-inventory.mjs','utf8');
let fixture=source.slice(source.indexOf("import Phaser from 'phaser';"),source.indexOf('`);\nconst server='));
fixture=fixture.replace('fps:{target:8,forceSetTimeOut:true}','fps:{target:60}').replace('scene:[Boot,InventoryScene,LobbyScene]','scene:[Boot,InventoryScene,LobbyScene,EquipmentScene]');
fixture+="\nimport {EquipmentScene} from '../../src/scenes/EquipmentScene';import {openInventoryMenu as before} from './before';import legacyStyles from '../../docs/inventory/categories/legacy-menu.css.txt?raw';window.qa.before=()=>{const style=document.createElement('style');style.textContent=legacyStyles;document.head.append(style);const close=before({x:640,y:650},()=>{},()=>{});return()=>{close();style.remove();};};";
await writeFile(out+'/fixture.ts',fixture);await writeFile(out+'/before.ts',(await readFile('docs/inventory/categories/legacy-menu.ts.txt','utf8')).replace("'./inventoryModel'","'../../src/ui/inventoryModel'"));
await writeFile(out+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
const server=await createServer({server:{host:'127.0.0.1',port:5188,watch:null},clearScreen:false});await server.listen();let browser;
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});await page.route('https://*.supabase.co/**',r=>r.abort());
 await page.goto('http://127.0.0.1:5188/.vite/inventory-category-qa/index.html');await page.waitForFunction(()=>window.qa?.game.scene.isActive('Inventory'));
 await page.evaluate(()=>{window.qa.game.scene.stop('Inventory');window.qa.game.scene.start('Lobby');});await page.waitForFunction(()=>window.qa.game.scene.getScene('Lobby').content);
 await page.evaluate(()=>window.qa.oldClose=window.qa.before());await page.screenshot({path:'.vite/inventory-category-qa/before.jpg'});await page.evaluate(()=>window.qa.oldClose());
 for(const [width,height] of [[1920,1080],[1280,720],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').toggleInventoryMenu());
  await page.waitForFunction(()=>window.qa.game.scene.getScene('InventoryCategoryPopup')?.children.list.length>0);await page.waitForTimeout(350);
  await page.screenshot({path:'.vite/inventory-category-qa/after-'+width+'x'+height+'.jpg'});
  assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('InventoryCategoryPopup').content.list.filter(o=>o.type==='Image').length),13);
  await page.keyboard.press('Escape');await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').input.enabled),true);
 }
 await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').toggleInventoryMenu());await page.waitForTimeout(250);
 const tap=async id=>{const p=await page.evaluate(id=>{const s=window.qa.game.scene.getScene('InventoryCategoryPopup'),z=s.content.list.find(o=>o.name==='inventory.category.'+id),b=z.getBounds(),r=s.game.canvas.getBoundingClientRect().width/s.scale.width;return{x:b.centerX*r,y:b.centerY*r};},id);await page.touchscreen.tap(p.x,p.y);};
 await tap('trang_suc');assert.ok(await page.evaluate(()=>window.qa.game.scene.getScene('InventoryCategoryPopup').root.list.some(o=>o.type==='Text'&&o.text==='Tính năng đang phát triển')));
 await page.mouse.move(700,180);await page.mouse.down();await page.mouse.move(220,180,{steps:12});await page.mouse.up();
 assert.ok(await page.evaluate(()=>window.qa.game.scene.getScene('InventoryCategoryPopup').offset>0));
 await tap('huyen_thu');await page.screenshot({path:'.vite/inventory-category-qa/mobile-scrolled.jpg'});
 await page.mouse.move(220,180);await page.mouse.down();await page.mouse.move(700,180,{steps:12});await page.mouse.up();
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(200);
 for(const id of ['trang_suc','bao_vat','chien_hon','pet','than_binh','than_thu','cam_nang','tui_da_quy','dien_vo_lenh','trang_bi_quan_su','huyen_thu'])await tap(id);
 assert.ok(await page.evaluate(()=>window.qa.game.scene.getScene('InventoryCategoryPopup').tweens.getTweens().length<15));
 await page.mouse.click(3,3);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').input.enabled),true);
 await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').toggleInventoryMenu());await page.waitForTimeout(180);
 await page.mouse.click(1152,178);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').input.enabled),true);
 await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').toggleInventoryMenu());await page.waitForTimeout(180);
 await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').toggleInventoryMenu());await page.waitForTimeout(80);
 await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').toggleInventoryMenu());await page.waitForTimeout(180);
 await tap('dao_cu');await page.waitForFunction(()=>window.qa.game.scene.isActive('Inventory'));
 await page.evaluate(()=>{window.qa.game.scene.stop('Inventory');window.qa.game.scene.start('Lobby');});await page.waitForTimeout(200);await page.evaluate(()=>window.qa.game.scene.getScene('Lobby').toggleInventoryMenu());await page.waitForTimeout(200);
 await tap('trang_bi');await page.waitForFunction(()=>window.qa.game.scene.isActive('Equipment'));
 assert.deepEqual(errors,[]);console.log('CATEGORY_ICON_QA_PASS');
}finally{await browser?.close();await server.close();}

