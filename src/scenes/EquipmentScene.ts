import {cloudRepository} from '../cloud/cloudRepository';
import type {GameCommand} from '../cloud/gameProtocol';
import {HERO_BY_ID} from '../data/heroes';
import {isSignature} from '../data/signatureConfig';
import {gameStore} from '../domain/store';
import {EQUIPMENT,EQUIPMENT_SLOTS,queryGear,enhancement,gearStats,canEnhance,enhanceCost,type EquipmentSlot,type GearQuery} from '../domain/equipment';
import {walletBalance,inventoryQuantity,ITEM_IDS} from '../domain/resources';
import {isForgeWeapon} from '../domain/forge';
import {drawEquipmentTheme,loadEquipmentThemes} from '../ui/equipmentThemeView';
import {heroNavigation} from '../ui/heroNavigation';
import {heroLabel,heroAction} from '../ui/heroUiControls';
import {UiScene} from '../ui/UiScene';
import {confirmedSpiritUpgrade} from '../ui/livingSpiritState';
import {spiritPlayback} from '../ui/LivingSpiritView';
interface EquipmentView{heroId?:string;bag?:boolean;slot?:EquipmentSlot;uid?:string;query?:GearQuery;page?:number;selectionFromBag?:boolean;}
/** One themed equipment screen; the bag is a modal, never a legacy scene layout. */
export class EquipmentScene extends UiScene{
 constructor(){super('Equipment');}
 private changing=false;
 preload(){const data=(this.sys.settings.data??{}) as EquipmentView;
  loadEquipmentThemes(this,heroNavigation.candidate(gameStore.snapshot,cloudRepository.uid??'local-ui',data.heroId));}
 create(data:EquipmentView={}){
  this.changing=false;
  this.data.remove('equipmentManager');
  const save=gameStore.snapshot,previous=heroNavigation.selectedHeroId;
  const id=heroNavigation.resolve(save,cloudRepository.uid??'local-ui',data.heroId,'equipment');
  if(!id){this.headerBack('Trang Bị');return;}
  if((previous&&previous!==id)||(!data.selectionFromBag&&data.uid&&save.equipment?.find(g=>g.uid===data.uid)?.heroId!==id))data={...data,uid:undefined,selectionFromBag:false};
  const restart=(change:EquipmentView)=>{if(this.changing)return;this.changing=true;this.scene.restart({...data,heroId:id,...change});};
  drawEquipmentTheme(this,id,next=>restart({heroId:next,bag:false,uid:undefined,query:{},page:0}),
   (slot,uid)=>restart({bag:true,uid,query:{slot},page:0,selectionFromBag:false}),{spiritSuspended:data.bag});
  if(data.bag)this.manager(id,data,restart);
 }
 private manager(id:string,data:EquipmentView,restart:(change:EquipmentView)=>void){
  const save=gameStore.snapshot,hero=HERO_BY_ID[id];
  const query=data.query??{slot:data.slot},items=(save.equipment??[]).filter(g=>!isSignature(g.itemId));
  const results=queryGear(items,query),pages=Math.max(1,Math.ceil(results.length/12));
  const index=results.findIndex(g=>g.uid===data.uid),page=index>=0?Math.floor(index/12):Math.min(pages-1,Math.max(0,data.page??0));
  const visible=results.slice(page*12,page*12+12),selected=results.find(g=>g.uid===data.uid)??visible.find(g=>g.heroId===id)??visible.find(g=>!g.heroId);
  const close=()=>restart({bag:false,uid:undefined});
  this.add.rectangle(640,360,Math.max(1600,this.scale.width*2),Math.max(900,this.scale.height*2),0x090409,.78).setInteractive().on('pointerup',close);
  const panel=this.add.graphics().fillStyle(0x2c1118,.98).fillRoundedRect(131,94,1018,552,22)
   .lineStyle(2,0xd5a453,.9).strokeRoundedRect(131,94,1018,552,22);
  panel.setName('equipment.manager');
  this.add.zone(640,370,1018,552).setInteractive().on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  const text=(x:number,y:number,s:string,size=17,w=300,h=44)=>heroLabel(this,x,y,s,size,w,h);
  text(600,120,`Trang Bị · ${hero.name}`,22,800);
  const closeArt=this.add.image(1107,122,'equipment.theme.ui/buttons/action_round.png');closeArt.setScale(50/Math.max(closeArt.width,closeArt.height));
  text(1107,122,'×',27,45,45);
  this.add.zone(1107,122,86,86).setInteractive({useHandCursor:true}).setName('equipment.manager.close').on('pointerup',close);
  const escape=this.input.keyboard?.addKey('ESC');escape?.once('down',close);
  this.events.once('shutdown',()=>escape?.off('down',close));
  const filter=(change:GearQuery)=>restart({query:{...query,...change},uid:undefined,page:0});
  const rarities=[undefined,'R','SR','SSR'] as const,slots=[undefined,...Object.keys(EQUIPMENT_SLOTS)] as (EquipmentSlot|undefined)[];
  heroAction(this,289,177,`Phẩm: ${query.rarity??'Tất cả'}`,()=>filter({rarity:rarities[(rarities.indexOf(query.rarity)+1)%rarities.length]}),true,270);
  heroAction(this,582,177,query.slot?EQUIPMENT_SLOTS[query.slot]:'Tất cả loại',()=>filter({slot:slots[(slots.indexOf(query.slot)+1)%slots.length]}),true,270);
  for(const [i,item] of visible.entries()){
   const x=220+i%4*145,y=260+Math.floor(i/4)*116,def=EQUIPMENT[item.itemId];
   const frame=this.add.image(x,y,'equipment.theme.equipment/frames/'+(item.uid===selected?.uid?'slot_selected.png':'slot_'+def.rarity.toLowerCase()+'.png'));
   frame.setScale(Math.min(86/frame.width,86/frame.height));
   const image=this.add.image(x,y-3,'gear-'+def.art);image.setScale(Math.min(61/image.width,61/image.height));
   text(x,y+33,'+'+enhancement(item),13,70,23);text(x,y+61,def.name,13,135,33);
   this.add.zone(x,y+15,138,111).setInteractive({useHandCursor:true}).setName('equipment.item.'+item.uid).on('pointerup',()=>restart({uid:item.uid,selectionFromBag:true}));
  }
  if(!visible.length)text(437,357,'Chưa có trang bị phù hợp',18,550);
  heroAction(this,233,603,'‹ Trước',()=>restart({page:page-1,uid:undefined}),page>0,145);
  text(436,603,`${page+1}/${pages} · ${results.length} món`,16,260);
  heroAction(this,646,603,'Sau ›',()=>restart({page:page+1,uid:undefined}),page+1<pages,145);
  this.add.graphics().lineStyle(1,0xc09353,.45).lineBetween(755,160,755,620);
  if(selected){
   const def=EQUIPMENT[selected.itemId],stats=gearStats(selected),cost=enhanceCost(selected),capped=!canEnhance(selected);
   text(946,181,def.name,22,342,60);
   const icon=this.add.image(946,263,'gear-'+def.art);icon.setScale(Math.min(95/icon.width,95/icon.height));
   text(946,330,`${def.rarity} · ${EQUIPMENT_SLOTS[def.slot]} · +${enhancement(selected)}`,16,340);
   text(946,368,selected.heroId?`Đang dùng · ${HERO_BY_ID[selected.heroId]?.name}`:'Đang trong túi',15,340).setName('equipment.itemOwner');
   text(946,412,`HP +${stats.hp} · Công +${stats.atk}\nThủ +${stats.def} · Tốc độ +${stats.speed}`,16,332,66);
   const run=(command:GameCommand,offline:()=>boolean)=>{const before=gameStore.snapshot;void this.saveAction(command,offline,ok=>{
    const event=confirmedSpiritUpgrade(before,gameStore.snapshot,id,command,ok);
    if(event)spiritPlayback(this).confirm(heroNavigation.accountKey,id,event);
    if(ok)restart({uid:selected.uid});else this.toast('Thao tác chưa được lưu.');
   });};
   heroAction(this,946,475,capped?'Đã đạt cấp tối đa':`Cường hóa · ${cost.toLocaleString('vi-VN')} Vàng`,()=>run({type:'enhance',uid:selected.uid,useStone:false},()=>gameStore.enhanceGear(selected.uid)),!capped&&walletBalance(save).gold>=cost,342);
   if(def.rarity==='SSR'&&!capped)heroAction(this,946,525,'Dùng Đá Cường Hóa',()=>run({type:'enhance',uid:selected.uid,useStone:true},()=>gameStore.enhanceGear(selected.uid,true)),inventoryQuantity(save,ITEM_IDS.enhancementStone)>0,342);
   if(selected.heroId)heroAction(this,946,579,'Tháo trang bị',()=>run({type:'unequip',uid:selected.uid},()=>gameStore.unequipGear(selected.uid)),true,342);
   else heroAction(this,946,579,`Trang bị · ${hero.name}`,()=>run({type:'equip',uid:selected.uid,heroId:id},()=>gameStore.equipGear(selected.uid,id)),true,342);
   if((save.forge?.crafted||save.forge?.premiumClaimed)&&isForgeWeapon(selected.itemId)){
    heroAction(this,946,625,selected.prestigeSkin?'Tắt skin':'Bật skin',()=>run({type:'skin',uid:selected.uid},()=>gameStore.togglePrestigeSkin(selected.uid)),true,180);
   }
  }else text(946,333,'Chọn trang bị để xem chi tiết',19,320,80);
  this.data.set('equipmentManager',{selectedHeroId:id,selectedUid:selected?.uid,page,query,newUi:true});
 }
}
