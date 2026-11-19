import {cloudRepository} from '../cloud/cloudRepository';
import type {GameCommand} from '../cloud/gameProtocol';
import {HERO_BY_ID} from '../data/heroes';
import {ATTACK_SKILLS,PASSIVE_SKILLS,describeSkill,describePassive} from '../data/heroSkills';
import {SignatureConfig,type SignatureId} from '../data/signatureConfig';
import {HERO_MILESTONES,SUMMON_UNLOCK_STAGE} from '../data/campaign';
import {gameStore} from '../domain/store';
import {heroStats,HERO_PROGRESSION,MAX_HERO_STARS,starCost} from '../domain/progression';
import {inventoryQuantity,heroShardId,ITEM_IDS,walletBalance} from '../domain/resources';
import {EQUIPMENT,canEnhance,enhanceCost,signaturePassive} from '../domain/equipment';
import {FORGE} from '../domain/forge';
import {signatureNodes, signatureNextCost, signatureStarBonus} from '../domain/signatureStars';
import {drawEquipmentTheme,loadEquipmentThemes} from '../ui/equipmentThemeView';
import {heroNavigation,type HeroTab} from '../ui/heroNavigation';
import {heroLabel,heroAction} from '../ui/heroUiControls';
import {UiScene} from '../ui/UiScene';
import {confirmedSpiritUpgrade} from '../ui/livingSpiritState';
import {spiritPlayback} from '../ui/LivingSpiritView';
import {signatureView} from '../ui/signatureView';

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
     const {cards,selected,stats,wielder}=signatureView(save,id,data.signatureId,data.signatureUid);
     const {id:sid,item,copies:items}=selected,config=SignatureConfig[sid];
     const shards=inventoryQuantity(save,ITEM_IDS.forgeShard);
     const nodes=item?signatureNodes(item.signatureNodes):0;
     const nextCost=nodes?signatureNextCost(nodes):FORGE.shardsRequired;
     const starBonus=signatureStarBonus(nodes);
     text(110,'Thần Binh',22);
     cards.forEach((card,index)=>{
      const x=965+(index%3)*102,y=167+Math.floor(index/3)*84;
      const chosen=card.id===sid;
      this.add.rectangle(x,y,94,76,chosen?0x713321:0x301e27,.94)
        .setStrokeStyle(chosen?2:1,chosen?0xffcc67:0x845b45);
      const icon=this.add.image(x,y-10,`gear-${EQUIPMENT[card.id].art}`);
      icon.setScale(Math.min(45/icon.width,45/icon.height)).setAlpha(card.state==='locked'?.62:1);
      const status=card.state==='locked'?'Chưa rèn':`${card.state==='equipped'?'Đang đeo':'Trong kho'} +${card.upgrade}`;
      heroLabel(this,x,y+23,status,12,91,20,card.state==='locked'?'#c6ae96':'#ffe0a2');
      this.add.zone(x,y,98,82).setName(`signature.item.${card.id}`).setInteractive({useHandCursor:true})
        .on('pointerup',()=>update({signatureId:card.id,signatureUid:undefined}));
     });
     text(316,config.name,18,46);
     text(349,item?(wielder?`Đang trang bị · ${wielder} · +${selected.upgrade}`:`Trong kho · Cường hóa +${selected.upgrade}`):'Chưa sở hữu · Chưa chế tạo',14,38);
     text(377,`Chuyên thuộc ${HERO_BY_ID[config.hero].name}`,14,35);
     text(407,`${item?'':'Chỉ số gốc · '}HP +${stats.hp} · Công +${stats.atk} · Thủ +${stats.def}`,14,40);
     text(436,`Đúng chủ: +${(config.bonus*100+starBonus.skillPct).toFixed(1)}% tuyệt kỹ · +${starBonus.atkPct.toFixed(1)}% Công`,14,34);
     text(462,`${Math.floor(nodes/5)}/5★ · ${nodes}/25 cánh · ${nextCost===undefined?'Tối đa':shards+'/'+nextCost+' Mảnh'}`,14,33);
     if(item){
      action(503,item.heroId?'Tháo Thần Binh':'Trang Bị Thần Binh',()=>item.heroId?run({type:'unequip',uid:item.uid},()=>gameStore.unequipGear(item.uid)):run({type:'equip',uid:item.uid,heroId:id},()=>gameStore.equipGear(item.uid,id)),owned).setName('signature.equip');
      action(551,canEnhance(item)?`Cường Hóa · ${enhanceCost(item)} Đồng`:'Đã đạt cấp tối đa',()=>run({type:'enhance',uid:item.uid,useStone:false,feeCurrency:'copper'},()=>gameStore.enhanceGear(item.uid)),canEnhance(item)&&walletBalance(save).copper>=enhanceCost(item)).setName('signature.enhance');
     }else if(save.forge){
      const crafted=save.forge.crafted;
      action(520,`Rèn · ${FORGE.shardsRequired} mảnh`,()=>run({type:'forge',itemId:sid,expectedCrafted:crafted},()=>gameStore.forgeWeapon(sid,crafted)),shards>=FORGE.shardsRequired).setName('signature.craft');
     }
     const goForge=()=>this.go('Forge',{itemId:sid,returnHeroId:id,gearUid:item?.uid});
     if(item&&items.length>1){
      const index=items.indexOf(item);
      heroAction(this,989,599,`Bản ${index+1}/${items.length}`,()=>update({signatureId:sid,signatureUid:items[(index+1)%items.length].uid}),true,144);
      heroAction(this,1145,599,'Đến Lò Rèn',goForge,true,144).setName('signature.forge');
     }else action(599,'Đến Lò Rèn',goForge).setName('signature.forge');
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
