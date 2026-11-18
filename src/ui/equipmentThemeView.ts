import Phaser from 'phaser';
import assets from '../data/equipmentThemeAssets.json';
import themes from '../data/equipmentThemes.json';
import {equipmentHeroModel} from './equipmentHeroModel';
import {gameStore} from '../domain/store';
import {EQUIPMENT,EQUIPMENT_SLOTS,enhancement} from '../domain/equipment';
import {HERO_BY_ID,HEROES,heroFaction,heroFamily} from '../data/heroes';
import {FactionConfig} from '../data/factions';
import {HERO_SKILLS,DEFAULT_KIT} from '../data/heroSkills';
import {factionSynergy} from '../domain/factionSynergy';
import {BATTLE_SPRITES,battleSpriteFrames} from './battleSprites';
import {PORTRAITS,atlasOrder} from './heroPresentation';
import {CHIBI_SOURCES} from '../data/chibiBattle';
import type {UiScene} from './UiScene';
import {loadSharedUi} from './sharedUi';
import {SKILL_EFFECTS,skillTextureKey,skillTexturePath} from '../data/skillVfx';
import {heroNavigation,heroTabRoute,type HeroTab} from './heroNavigation';
import {loadLivingSpirit,LivingSpiritView} from './LivingSpiritView';
const key=(p:string)=>'equipment.theme.'+p;
const metadata:Record<string,{size:number[];bounds:number[]}>=assets;
export function loadEquipmentThemes(scene:Phaser.Scene,heroId=heroNavigation.selectedHeroId){
 loadSharedUi(scene);
 loadLivingSpirit(scene,heroId);
 for(const id of gameStore.snapshot.heroes){const icon=SKILL_EFFECTS[HERO_BY_ID[id]?.ultimateSkillId]?.icon;
  if(icon&&!scene.textures.exists(skillTextureKey(icon)))scene.load.image(skillTextureKey(icon),import.meta.env.BASE_URL+skillTexturePath(icon));}
 if(![...document.fonts].some(f=>f.family==='InventoryVietnamese'&&f.status==='loaded'))scene.load.font({key:'InventoryVietnamese',url:import.meta.env.BASE_URL+'assets/fonts/NotoSerif-Bold-Vietnamese.woff2',format:'woff2'});
 for(const [p,m] of Object.entries(metadata)){
  if(scene.textures.exists(key(p)))continue;
  if(p==='fx/dieu_thuyen/fx_loop_4x2.png')scene.load.spritesheet(key(p),import.meta.env.BASE_URL+'assets/equipment-themes/'+p,{frameWidth:650,frameHeight:464,startFrame:0,endFrame:7});
  else if(p.endsWith('fx_loop_4x2.png'))scene.load.spritesheet(key(p),import.meta.env.BASE_URL+'assets/equipment-themes/'+p,{frameWidth:m.size[0]/4,frameHeight:m.size[1]/2});
  else scene.load.image(key(p),import.meta.env.BASE_URL+'assets/equipment-themes/'+p);
 }
}
export interface HeroThemeOptions{tab?:HeroTab;collection?:boolean;content?:()=>void;spiritSuspended?:boolean;}
export function drawEquipmentTheme(scene:UiScene,selectedHeroId:string,choose:(id:string)=>void,manage:(slot?:keyof typeof EQUIPMENT_SLOTS,uid?:string)=>void,options:HeroThemeOptions={}){
 const save=gameStore.snapshot,model=equipmentHeroModel(save,selectedHeroId,undefined,options.collection);if(!model)return;
 const tab=options.tab??'equipment',owned=save.heroes.includes(selectedHeroId);
 const {hero,theme,stats}=model;
 const art=(p:string,x:number,y:number,w:number,h:number)=>{
  const o=scene.add.image(x,y,key(p));o.setScale(Math.min(w/o.width,h/o.height));return o;
 };
 const label=(x:number,y:number,value:string,size:number,width:number,color='#ffe5b0')=>{
  const t=scene.text(x,y,value,size,color,{fontFamily:'InventoryVietnamese, Georgia, serif',resolution:2,padding:{top:3,bottom:3}}).setOrigin(.5);
  while(t.width>width&&size>11)t.setFontSize(--size);
  if(t.width>width){let s=value;while(s.length>1&&t.width>width){s=s.slice(0,-1);t.setText(s+'…');}}
  return t;
 };
 art('background/equipment_hall_clean.png',640,360,1280,720);
 art('ui/panels/header_nav.png',640,40,1260,70);label(250,38,tab==='equipment'?'Trang Bị':'Võ Tướng',27,270);
 scene.backToLobby(1155,38,190,54);
 for(const [i,[id,name]] of ([['detail','Chi tiết'],['skills','Kỹ năng'],['equipment','Trang Bị'],['signature','Thần Binh']] as const).entries()){
  const x=455+i*163;
  art('ui/panels/hero_title.png',x,39,155,47).setAlpha(id===tab?1:.55);
  label(x,39,name,16,124,id===tab?'#fff0bb':'#d0b58c');
  const hit=scene.add.zone(x,39,155,49).setName('hero.tab.'+id);
  if(id!=='equipment'||owned)hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{const route=heroTabRoute(id,selectedHeroId);scene.go(route.scene,{...route.data,collection:options.collection});});
 }
 art('ui/panels/roster_rail.png',72,388,130,600);
 const roster=options.collection?HEROES.map(h=>h.id):save.heroes;
 const index=roster.indexOf(selectedHeroId),start=Math.max(0,Math.min(roster.length-6,index-2));
 label(72,95,'Võ Tướng',15,110);
 for(const [i,id] of roster.slice(start,start+6).entries()){
  const h=HERO_BY_ID[id];if(!h)continue;const y=156+i*77;
  const selected=id===selectedHeroId;
  art('equipment/frames/'+(selected?'slot_selected.png':'slot_sr.png'),72,y,70,70);
  const preset=themes.heroes.find(t=>t.display_name===HERO_BY_ID[heroFamily(id)]?.name);
  const portrait=preset?scene.add.image(72,y,key(preset.portrait.replace('assets/',''))):scene.add.image(72,y,PORTRAITS,atlasOrder.indexOf(heroFamily(id)));
  portrait.setScale(54/Math.max(portrait.width,portrait.height));
  const hit=scene.add.zone(72,y,84,74).setInteractive({useHandCursor:true}).setName('equipment.hero.'+id);
  scene.tutorialTarget('hero.card.'+id,hit);
  hit.on('pointerup',()=>choose(id));
 }
 for(const direction of [-1,1]){const x=72+direction*28;art('ui/buttons/action_round.png',x,641,46,46);label(x,641,direction<0?'‹':'›',25,40);
  scene.add.zone(x,641,48,48).setInteractive({useHandCursor:true}).on('pointerup',()=>choose(roster[(index+direction+roster.length)%roster.length]));}
 const wheel=(p:Phaser.Input.Pointer,_objects:unknown,_dx:number,dy:number)=>{if(!scene.data.get('equipmentManager')&&p.worldX<140)choose(roster[(index+(dy>0?1:-1)+roster.length)%roster.length]);};
 scene.input.on('wheel',wheel);scene.events.once('shutdown',()=>scene.input.off('wheel',wheel));
 art('ui/panels/hero_title.png',517,109,470,62);label(517,108,hero.name,27,360).setName('equipment.heroName');
 label(517,153,hero.rarity+' · '+FactionConfig[heroFaction(hero)].name+' · Cấp '+stats.level,16,440);
 const starCount=Math.max(0,model.stars);for(let i=0;i<Math.min(starCount,10);i++)art('ui/decor/star_gold.png',517+(i-(Math.min(starCount,10)-1)/2)*22,181,20,20);
 if(starCount>10)label(517,181,starCount+' sao',15,250);
 const living=new LivingSpiritView(scene,selectedHeroId,heroNavigation.accountKey,options.spiritSuspended);
 if(theme&&!living.sprite){
  const path=theme.fx_back.replace('assets/','');art(path,520,365,510,370).setAlpha(.66).setName('equipment.spirit');
  const atlas=theme.fx_atlas.replace('assets/',''),animation=key(atlas)+'.loop';
  if(!scene.anims.exists(animation))scene.anims.create({key:animation,frames:metadata[atlas]?scene.anims.generateFrameNumbers(key(atlas),{start:0,end:7}):Array.from({length:8},(_,i)=>({key:key(theme.fx_frames_pattern.replace('assets/','').replace('{frame:02d}',String(i).padStart(2,'0')))})),frameRate:8,repeat:-1});
  const fx=scene.add.sprite(520,365,metadata[atlas]?key(atlas):key(theme.fx_frames_pattern.replace('assets/','').replace('{frame:02d}','00'))).play(animation);
  fx.setScale(Math.min(520/fx.width,390/fx.height)).setAlpha(.6).setName('equipment.spiritLoop');
 }
 scene.add.ellipse(520,556,355,52,0x34211a,.85).setStrokeStyle(2,0xd7b360,.7);
 scene.add.ellipse(520,556,318,38,0xb68b3c,.13).setStrokeStyle(1,0xf9da82,.35);
 if(theme){
  const path=theme.fullbody.replace('assets/',''),m=metadata[path],b=m.bounds,scale=Math.min(365/(b[2]-b[0]),365/(b[3]-b[1]));
  scene.add.image(520-( (b[0]+b[2])/2-m.size[0]/2)*scale,555-(b[3]-m.size[1]/2)*scale,key(path)).setScale(scale).setName('equipment.fullbody.'+selectedHeroId);
  art(theme.fx_front.replace('assets/',''),520,545,390,100).setAlpha(.48);
 }else{
  const source=CHIBI_SOURCES[heroFamily(selectedHeroId)],scale=Math.min(1,270/source.maxHeight,285/source.maxWidth);
  scene.add.ellipse(520,548,210,36,0xecc66c,.14);
  scene.add.image(520,553,BATTLE_SPRITES,battleSpriteFrames.get(heroFamily(selectedHeroId))).setOrigin(source.staticFoot[0]/256,source.staticFoot[1]/256).setScale(scale).setName('equipment.fullbody.'+selectedHeroId);
 }
 for(const [i,{slot,item}] of model.slots.entries()){
  const x=i<3?220:810,y=243+(i%3)*135,definition=item?EQUIPMENT[item.itemId]:undefined;
  const frame=definition?'slot_'+definition.rarity.toLowerCase()+'.png':'slot_empty.png';
  art('equipment/frames/'+frame,x,y,94,98);
  if(item&&definition){
   const texture='gear-'+definition.art;if(scene.textures.exists(texture)){const icon=scene.add.image(x,y-4,texture);icon.setScale(Math.min(66/icon.width,66/icon.height));}
   label(x,y-35,'+'+enhancement(item),15,80);label(x,y+30,definition.rarity,13,80);
  }else label(x,y,'+',25,75,'#b79666');
  label(x,y+61,EQUIPMENT_SLOTS[slot],14,118);
  scene.add.zone(x,y,108,108).setInteractive({useHandCursor:true}).setName('equipment.slot.'+slot).on('pointerup',()=>manage(slot,item?.uid));
 }
 art('ui/panels/power_banner.png',520,590,440,55);label(520,587,'Lực chiến  '+model.power.toLocaleString('vi-VN'),24,375).setName('equipment.power');
 const equippedCount=model.slots.filter(s=>s.item).length,extra=model.equipped.length-equippedCount;
 label(520,623,equippedCount+'/6 món đang trang bị'+(extra?' · '+extra+' món đặc biệt':''),14,390);
 art('ui/panels/stats_main.png',1067,357,360,560);
 if(options.content)options.content();else{
 label(1067,110,'Thuộc Tính',22,285);
 [['HP',stats.hp],['Công',stats.atk],['Thủ',stats.def],['Tốc độ',stats.speed]].forEach(([n,v],i)=>{
  art('ui/panels/stat_row.png',1067,160+i*42,310,37);label(972,160+i*42,String(n),16,100);
  label(1120,160+i*42,Number(v).toLocaleString('vi-VN'),19,155).setName('equipment.stat.'+n);
 });
 label(1067,331,'Kỹ Năng',20,285);
 const kit=HERO_SKILLS[heroFamily(selectedHeroId)]??DEFAULT_KIT;
 [kit.normal.name,kit.ultimate.name,kit.passive.name].forEach((s,i)=>{
  const x=965+i*101;art('equipment/frames/slot_sr.png',x,380,68,68);
  const icon=i===1?SKILL_EFFECTS[hero.ultimateSkillId]?.icon:undefined;
  if(icon&&scene.textures.exists(skillTextureKey(icon))){const image=scene.add.image(x,380,skillTextureKey(icon));image.setScale(48/Math.max(image.width,image.height));}
  else art('equipment/icons/skill_manual.png',x,380,47,47);
  label(x,430,s,13,96);
 });
 label(1067,480,'Liên Kết Đội Hình',19,295);
 const synergy=factionSynergy(save.formation).find(s=>s.id===heroFaction(hero));
 label(1067,520,FactionConfig[heroFaction(hero)].name+' · '+(synergy?.count??0)+' tướng ra trận',16,295);
 label(1067,554,synergy?.bonus?'Cộng hưởng +'+synergy.bonus+'%':'Chưa kích hoạt cộng hưởng',15,295,'#b7dfa9');
 label(1067,592,theme?.theme_name??'Linh khí mặc định',15,295);
 }
 art('ui/panels/bottom_nav_strip.png',699,680,1090,78);
 const actions=[{x:280,label:'Kho trang bị',icon:'weapon_ssr_01.png',run:()=>manage()},
  {x:520,label:'Cường hóa / Trang bị',icon:'enhancement_crystal.png',run:()=>manage()},
  {x:760,label:'Lò Rèn',icon:'weapon_ssr_02.png',run:()=>scene.go('Forge')},
  {x:1040,label:'Tính năng khác',icon:'ancient_jewel.png',run:()=>scene.toast('Tính năng đang phát triển')}];
 for(const action of actions){const frame=art('ui/buttons/action_round.png',action.x,663,54,54);art('equipment/icons/'+action.icon,action.x,663,34,34);
  label(action.x,704,action.label,14,215);scene.add.zone(action.x,680,220,80).setInteractive({useHandCursor:true})
   .on('pointerover',()=>frame.setTint(0xffe6a9)).on('pointerout',()=>frame.clearTint()).on('pointerup',action.run);}
 scene.data.set('equipmentHeroView',{selectedHeroId,tab,theme:theme?.theme_name??'default',gearUids:model.equipped.map(g=>g.uid),selectedUid:model.selectedUid,power:model.power});
}
