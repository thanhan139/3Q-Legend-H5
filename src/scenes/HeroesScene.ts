import {cloudRepository} from '../cloud/cloudRepository';
import type {GameCommand} from '../cloud/gameProtocol';
import {HERO_BY_ID,heroFamily} from '../data/heroes';
import {ATTACK_SKILLS,PASSIVE_SKILLS,describeSkill,describePassive} from '../data/heroSkills';
import {SignatureConfig,signatureIds,isSignature,type SignatureId} from '../data/signatureConfig';
import {HERO_MILESTONES,SUMMON_UNLOCK_STAGE} from '../data/campaign';
import {gameStore} from '../domain/store';
import {heroStats,HERO_PROGRESSION,MAX_HERO_STARS,starCost} from '../domain/progression';
import {inventoryQuantity,heroShardId,ITEM_IDS,walletBalance} from '../domain/resources';
import {EQUIPMENT,gearStats,enhancement,canEnhance,enhanceCost,signaturePassive} from '../domain/equipment';
import {FORGE} from '../domain/forge';
import {drawEquipmentTheme,loadEquipmentThemes} from '../ui/equipmentThemeView';
import {heroNavigation,type HeroTab} from '../ui/heroNavigation';
import {heroLabel,heroAction} from '../ui/heroUiControls';
import {UiScene} from '../ui/UiScene';
import {confirmedSpiritUpgrade} from '../ui/livingSpiritState';
import {spiritPlayback} from '../ui/LivingSpiritView';

interface HeroesData{heroId?:string;tab?:HeroTab;collection?:boolean;signatureTab?:boolean;skillTab?:boolean;skillIndex?:number;signatureId?:SignatureId;signatureUid?:string;}
/** The only hero screen. All tabs use the same themed shell and selectedHeroId. */
export class HeroesScene extends UiScene{
 constructor(){super('Heroes');}
 preload(){const data=(this.sys.settings.data??{}) as HeroesData;
  loadEquipmentThemes(this,heroNavigation.candidate(gameStore.snapshot,cloudRepository.uid??'local-ui',data.heroId,data.collection));}
 create(data:HeroesData={}){
  const save=gameStore.snapshot,tab=data.tab??(data.signatureTab?'signature':data.skillTab?'skills':'detail');
  const id=heroNavigation.resolve(save,cloudRepository.uid??'local-ui',data.heroId,tab,data.collection);
  if(!id){this.headerBack('Võ Tướng');return;}
  const hero=HERO_BY_ID[id],owned=save.heroes.includes(id);
  const update=(change:HeroesData={})=>this.scene.restart({...data,heroId:id,tab,...change});
  const run=(command:GameCommand,offline:()=>boolean)=>{const before=gameStore.snapshot;void this.saveAction(command,offline,ok=>{
   const event=confirmedSpiritUpgrade(before,gameStore.snapshot,id,command,ok);
   if(event)spiritPlayback(this).confirm(heroNavigation.accountKey,id,event);
   if(ok)update();else this.toast('Thao tác chưa được lưu.');
  });};
  const text=(y:number,s:string,size=17,height=44,color?:string)=>heroLabel(this,1067,y,s,size,288,height,color);
  const action=(y:number,s:string,fn:()=>void,enabled=true)=>heroAction(this,1067,y,s,fn,enabled);
  drawEquipmentTheme(this,id,next=>update({heroId:next,signatureId:undefined,signatureUid:undefined}),
   (slot,uid)=>{if(owned)this.go('Equipment',{heroId:id,bag:true,query:{slot},uid});},
   {tab,collection:data.collection,content:()=>{
    if(tab==='skills'){
     text(112,'Kỹ Năng',23);
     const normal=ATTACK_SKILLS.get(hero.normalAttackId)!,ultimate=ATTACK_SKILLS.get(hero.ultimateSkillId)!,passive=PASSIVE_SKILLS.get(hero.passiveSkillId)!;
     const index=Math.min(2,Math.max(0,data.skillIndex??0));
     ['Đánh thường','Tuyệt kỹ Nộ','Nội tại'].forEach((s,i)=>action(171+i*51,`${index===i?'◆ ':''}${s}`,()=>update({skillIndex:i})));
     text(344,[normal.name,ultimate.name,passive.name][index],22,65);
     const description=index===2?describePassive(passive):describeSkill(index===0?normal:ultimate,index===1);
     text(440,description,17,126);
     const bonus=signaturePassive(save.equipment,id);
     text(563,bonus?`Thần Binh · +${Math.round(bonus*100)}% sát thương tuyệt kỹ`:'Thần Binh chưa kích hoạt',15,74);
    }else if(tab==='signature'){
     const equipped=save.equipment?.find(g=>g.heroId===id&&isSignature(g.itemId));
     const exclusive=signatureIds.find(s=>SignatureConfig[s].hero===heroFamily(id));
     const sid=data.signatureId??exclusive??(equipped?.itemId as SignatureId|undefined)??signatureIds[0];
     const config=SignatureConfig[sid],items=(save.equipment??[]).filter(g=>g.itemId===sid);
     const item=items.find(g=>g.uid===data.signatureUid)??items.find(g=>g.heroId===id)??items.find(g=>!g.heroId)??items[0];
     text(111,'Thần Binh',22);text(151,config.name,19,48);
     const icon=this.add.image(1067,228,`gear-${EQUIPMENT[sid].art}`);icon.setScale(Math.min(94/icon.width,94/icon.height));
     text(296,`Chuyên thuộc ${HERO_BY_ID[config.hero].name}`,15);
     const stats=gearStats(item??{uid:'',itemId:sid,level:1});
     text(337,`HP +${stats.hp} · Công +${stats.atk}\nThủ +${stats.def} · Cường hóa +${item?enhancement(item):0}`,15,57);
     text(398,`Đúng chủ: +${Math.round(config.bonus*100)}% sát thương tuyệt kỹ trước DEF.`,15,61);
     text(445,item?(item.heroId?`Đang dùng · ${HERO_BY_ID[item.heroId]?.name}`:'Trong kho'):`${save.forge?.shards??0}/${FORGE.shardsRequired} Mảnh Thần Binh`,14);
     if(item){
      action(492,item.heroId?'Tháo Thần Binh':'Trang bị Thần Binh',()=>item.heroId?run({type:'unequip',uid:item.uid},()=>gameStore.unequipGear(item.uid)):run({type:'equip',uid:item.uid,heroId:id},()=>gameStore.equipGear(item.uid,id)),owned);
      action(542,canEnhance(item)?`Nâng cấp · ${enhanceCost(item)} Vàng`:'Đã đạt cấp tối đa',()=>run({type:'enhance',uid:item.uid,useStone:false},()=>gameStore.enhanceGear(item.uid)),canEnhance(item)&&walletBalance(save).gold>=enhanceCost(item));
     }else action(492,`Rèn · ${FORGE.shardsRequired} mảnh`,()=>run({type:'forge',itemId:sid,expectedCrafted:save.forge!.crafted},()=>gameStore.forgeWeapon(sid,save.forge!.crafted)),(save.forge?.shards??0)>=FORGE.shardsRequired);
     const next=signatureIds[(signatureIds.indexOf(sid)+1)%signatureIds.length];
     heroAction(this,989,597,'Vũ khí khác',()=>update({signatureId:next,signatureUid:undefined}),true,144);
     heroAction(this,1145,597,`Bản ${item?items.indexOf(item)+1:0}/${items.length}`,()=>update({signatureUid:items[(items.indexOf(item!)+1)%items.length]?.uid}),items.length>1,144);
    }else{
     const stars=save.heroStars?.[id]??1,exp=save.heroExp[id]??0,stats=heroStats(hero,exp,stars,save.equipment,save.jewelry);
     text(111,'Chi Tiết Võ Tướng',21);
     [['Sinh lực',stats.hp],['Công',stats.atk],['Thủ',stats.def],['Tốc độ',stats.speed]].forEach(([s,v],i)=>text(164+i*40,`${s}   ${Number(v).toLocaleString('vi-VN')}`,19));
     const shards=inventoryQuantity(save,heroShardId(id));
     text(346,`Mảnh tướng ${shards}${stars<MAX_HERO_STARS?' / '+starCost(stars):''}`,15);
     action(389,stars>=MAX_HERO_STARS?'Đã đủ 5 sao':'Nâng sao',()=>run({type:'star',heroId:id},()=>gameStore.upgradeHeroStar(id)),owned&&stars<MAX_HERO_STARS&&shards>=starCost(stars));
     text(440,`EXP Tướng  ${inventoryQuantity(save,ITEM_IDS.heroExp)}`,15);
     const cost=HERO_PROGRESSION.expPerLevel-exp%HERO_PROGRESSION.expPerLevel;
     const upgrade=action(485,stats.level>=HERO_PROGRESSION.maxLevel?'Cấp tối đa':`Tăng cấp · ${cost} EXP`,()=>run({type:'upgrade',heroId:id},()=>gameStore.upgradeHero(id)),owned&&stats.level<HERO_PROGRESSION.maxLevel&&inventoryQuantity(save,ITEM_IDS.heroExp)>=cost);
     this.tutorialTarget('hero.upgrade',upgrade);
     action(539,'Xếp đội hình',()=>this.go('Formation',{selectedHero:id}),owned);
     if(!owned){const stage=Object.entries(HERO_MILESTONES).find(([,h])=>h===id)?.[0];text(590,stage?`Vượt ải ${stage} hoặc chiêu mộ`:`Chiêu mộ sau ải ${SUMMON_UNLOCK_STAGE}`,14);}
    }
   }});
  heroAction(this,250,72,data.collection?'Bộ sưu tập':'Đã sở hữu',()=>update({collection:!data.collection}),true,190);
  this.data.set('heroScreen',{selectedHeroId:id,tab,newUi:true});
 }
}
