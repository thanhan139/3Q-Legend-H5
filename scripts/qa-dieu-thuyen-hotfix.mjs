import {createServer} from 'vite';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {chromium} from 'playwright';import assert from 'node:assert/strict';
// Reuse the real EquipmentScene fixture from the theme integration QA.
const out='.vite/dieu-thuyen-hotfix-qa';await mkdir(out,{recursive:true});
const original=await readFile('scripts/qa-equipment-themes.mjs','utf8');const fixture=original.slice(original.indexOf("import Phaser from 'phaser';"),original.indexOf('`);\nconst server='));
await writeFile(out+'/fixture.ts',fixture);await writeFile(out+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="game"></div><script type="module" src="./fixture.ts"></script>');
const server=await createServer({server:{host:'127.0.0.1',port:5196,strictPort:true,watch:null},clearScreen:false});await server.listen();let browser;
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.route('https://*.supabase.co/**',r=>r.abort());await p.goto('http://127.0.0.1:5196/'+out+'/index.html');
 await p.waitForFunction(()=>window.qa?.game.scene.getScene('Equipment').data.get('equipmentHeroView'),null,{timeout:90000});
 await p.evaluate(()=>window.qa.game.scene.getScene('Equipment').scene.restart({heroId:'diao-chan'}));await p.waitForFunction(()=>window.qa.game.scene.getScene('Equipment').data.get('equipmentHeroView')?.selectedHeroId==='diao-chan');
 const frames=await p.evaluate(()=>new Promise(resolve=>{
  const s=window.qa.game.scene.getScene('Equipment'),fx=s.children.getByName('equipment.spiritLoop'),seen=[];
  fx.anims.restart();fx.on('animationupdate',(_a,frame)=>{if(seen.at(-1)!==frame.textureFrame)seen.push(frame.textureFrame);if(seen.length===16){fx.off('animationupdate');resolve({seen,texture:fx.texture.key,definitions:fx.anims.currentAnim.frames.map(f=>f.textureFrame),sizes:fx.anims.currentAnim.frames.map(f=>{const r=fx.scene.textures.getFrame(f.textureKey,f.textureFrame);return[r.width,r.height];})});}});
 }));
 assert.match(frames.texture,/dieu_thuyen\/fx_loop_4x2.png$/);assert.deepEqual(frames.definitions,[0,1,2,3,4,5,6,7]);
 assert.ok(frames.sizes.every(s=>s[0]===650&&s[1]===464));for(let i=1;i<frames.seen.length;i++)assert.equal(frames.seen[i],(frames.seen[i-1]+1)%8);
 for(const [width,height] of [[1920,1080],[1280,720],[844,390]]){await p.setViewportSize({width,height});await p.waitForTimeout(200);await p.evaluate(()=>window.qa.game.loop.sleep());await p.screenshot({path:out+'/'+width+'x'+height+'.jpg',type:'jpeg',quality:94,timeout:60000});await p.evaluate(()=>window.qa.game.loop.wake());}
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({frames,errors,realAccount:false},null,2));console.log('DIEU_THUYEN_ATLAS_HOTFIX_QA_PASS');
}finally{await browser?.close();await server.close();}
