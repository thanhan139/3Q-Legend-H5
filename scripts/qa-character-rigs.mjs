// Authoring inspection complements (does not replace) actual BattleScene gameplay QA.
import {mkdir,writeFile} from 'node:fs/promises';import {createServer} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const out='.vite/character-rig-qa';await mkdir(out,{recursive:true});
await writeFile(out+'/index.html','<!doctype html><div id="game"></div><script type="module" src="./fixture.ts"></script>');
await writeFile(out+'/fixture.ts',`
import Phaser from 'phaser';import {loadRemasterAssets} from '../../src/ui/remasterAssets';
import {BattleCharacterRig} from '../../src/ui/BattleCharacterRig';import {RigAnimationController} from '../../src/ui/RigAnimationController';
const ids=['zhao-yun','guan-yu','liu-bei','zhang-fei','dian-wei'];
class RigScene extends Phaser.Scene{preload(){loadRemasterAssets(this);}create(){
 this.add.rectangle(640,360,1280,720,0x38404c);this.add.text(20,15,'REAL RIG ASSEMBLY / JOINT INSPECTION',{fontSize:22});
 window.qa={scene:this,rigs:[],controllers:[]};
 ids.forEach((id,i)=>{const rig=new BattleCharacterRig(this,id,false).setPosition(135+i*250,540).setScale(3);
  const c=new RigAnimationController(this,rig);window.qa.rigs.push(rig);window.qa.controllers.push(c);
  this.add.text(50+i*250,580,id,{fontSize:22});});
}}
const game=new Phaser.Game({type:Phaser.WEBGL,width:1280,height:720,parent:'game',backgroundColor:'#38404c',fps:{target:30},scene:RigScene});window.game=game;
`);
const server=await createServer({server:{host:'127.0.0.1',port:5192,watch:null},clearScreen:false});await server.listen();let browser;
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5192/.vite/character-rig-qa/index.html');await page.waitForFunction(()=>window.qa?.rigs.length===5);
 for(const state of ['idle','run','attack','skill','hit','death','victory']){
  await page.evaluate(state=>{window.qa.controllers.forEach(c=>{c.revive();c.play(state,state==='attack'||state==='skill'?420:undefined);});},state);
  await page.waitForTimeout(state==='run'?160:state==='idle'?300:state==='death'?310:state==='hit'?110:400);
  const data=await page.evaluate(()=>window.qa.controllers.map(c=>c.debug()));
  assert.ok(data.every(d=>d.state===state),state+' must be a running controller state');
  assert.ok(data.every(d=>Object.values(d.pose).every(Number.isFinite)));
  await page.evaluate(()=>window.game.loop.sleep());await page.screenshot({path:out+'/'+state+'.jpg',type:'jpeg',quality:96,timeout:60000});await page.evaluate(()=>window.game.loop.wake());
  await writeFile(out+'/'+state+'.json',JSON.stringify(data,null,2));
 }
 assert.deepEqual(errors,[]);console.log('CHARACTER_RIG_AUTHORING_QA_PASS');
}finally{await browser?.close();await server.close();}
