import Phaser from 'phaser';
import {HERO_BY_ID} from '../data/heroes';
import type {GameCommand} from '../cloud/gameProtocol';
import {cloudRepository} from '../cloud/cloudRepository';
import {COPPER_ECONOMY} from '../domain/copperEconomy';
import {gameStore} from '../domain/store';
import {DUPLICATE_SHARDS} from '../domain/summon';
import {CHECK_IN,DAILY_MISSIONS,MISSIONS,TOPUP_HERO,TOPUP_REWARD,welfareStatus,type WalletReward} from '../domain/welfare';
import {UiScene} from '../ui/UiScene';
import {LobbyContent} from '../ui/LobbyContent';
import {rect,type ContentRect} from '../ui/lobbyContentLayout';
import {coverScale} from '../ui/viewport';
import {UI_FONT,UI_SPACE as S,loadSharedUi,sharedButton} from '../ui/sharedUi';
import {welfareLayout} from '../ui/welfareLayout';
import {WELFARE_ART,welfareKey,type WelfareArt} from '../ui/welfareAssets';
import {PORTRAITS,atlasOrder} from '../ui/heroPresentation';

type Page='Welfare'|'Checkin'|'Missions'|'Topup'|'Mail'|'LoginGift'|'GiftCode'|'Online';
const TABS=[['Checkin','Điểm Danh','template_welfare_scroll'],['Missions','Nhiệm Vụ Ngày','template_quest_scroll'],
 ['LoginGift','Quà Đăng Nhập','icon_gift_treasure'],['Topup','Nạp Đầu','icon_gold'],
 ['GiftCode','Mã Quà','icon_gold_key'],['Online','Thưởng Online','icon_exp']] as const;
const HEADINGS:Record<Page,string>={Welfare:'Điểm Danh 7 Ngày',Checkin:'Điểm Danh 7 Ngày',Missions:'Nhiệm Vụ Ngày',
 Topup:'Nạp Đầu',Mail:'Hộp Thư',LoginGift:'Quà Đăng Nhập',GiftCode:'Mã Quà',Online:'Thưởng Online'};
const REWARDS=[['copper','Đồng','copper_icon'],['coins','Vàng','icon_gold'],['trainingExp','EXP Tướng','icon_exp'],
 ['gems','Nguyên Bảo cũ',null],['goldKeys','Chìa Vàng','icon_gold_key']] as const;

/** Welfare UI lives under the existing Info scene key; commands and reward rules are unchanged. */
export class InfoScene extends UiScene {
  private content!:LobbyContent;
  private page:Page='Checkin';
  private busy=false;
  private layout!:ReturnType<typeof welfareLayout>;
  constructor(){super('Info');}
  init(){this.busy=false;}
  preload(){
    loadSharedUi(this);
    const used=new Set(['background_palace','main_panel','header','tab_selected','tab_default','hostess_phuc_loi','reward_blank',
      'template_parchment_detail_panel','template_welfare_scroll','template_quest_scroll','icon_gift_treasure',
      'icon_gold','icon_gold_key','icon_exp','copper_icon']);
    for(const [id,path] of Object.entries(WELFARE_ART))if(used.has(id)&&!this.textures.exists(welfareKey(id as WelfareArt)))
      this.load.image(welfareKey(id as WelfareArt),`${import.meta.env.BASE_URL}${path}`);
  }
  create({page='Welfare',claimed=false}:{page?:Page;claimed?:boolean}={}){
    this.page=page==='Welfare'?'Checkin':page;
    this.content=new LobbyContent(this,{fastFit:true,fontFamily:UI_FONT,resolution:2,textPaddingY:1});
    this.render();
    const changed=()=>this.render(),escape=()=>this.go('Lobby');
    this.scale.on(Phaser.Scale.Events.RESIZE,changed);window.addEventListener('3q:cloud-save',changed);
    this.input.keyboard?.on('keydown-ESC',escape);
    this.events.once('shutdown',()=>{this.scale.off(Phaser.Scale.Events.RESIZE,changed);window.removeEventListener('3q:cloud-save',changed);this.input.keyboard?.off('keydown-ESC',escape);});
    if(claimed)this.toast('Đã nhận thưởng');
  }
  private field(id:string,box:ContentRect,text:string,size=18,color='#ffe8b6',align:'left'|'center'='left',lines=2){
    return this.content.field(`welfare.${id}`,box,text,{size,minSize:10,padding:1,color,align,wrap:true,maxLines:lines});
  }
  private art(id:WelfareArt,box:ContentRect){
    const image=this.add.image(box.x+box.width/2,box.y+box.height/2,welfareKey(id));
    return image.setScale(Math.min(box.width/image.width,box.height/image.height));
  }
  private welfarePanel(box:ContentRect,kind:WelfareArt='main_panel',edge=32){
    const scale=kind==='main_panel'?.25:kind==='reward_blank'?.3:.5;
    const nativeEdge=kind==='main_panel'?96:kind==='reward_blank'?80:edge;
    return this.add.nineslice(box.x+box.width/2,box.y+box.height/2,welfareKey(kind),undefined,
      box.width/scale,box.height/scale,nativeEdge,nativeEdge,nativeEdge,nativeEdge).setScale(scale);
  }
  private open(page:Page){this.page=page;this.render();}
  private async claim(command:GameCommand,fallback:()=>boolean){
    if(this.busy)return;this.busy=true;this.render();
    let message='Chưa thể xác nhận phần thưởng. Vui lòng thử lại.';
    try{await this.saveAction(command,fallback,ok=>{message=ok?'Đã nhận thưởng':'Chưa đủ điều kiện nhận thưởng.';});}
    finally{this.busy=false;if(this.scene.isActive()){this.render();this.toast(message);}}
  }
  private render(){
    this.tweens.killAll();this.children.removeAll(true);this.content.reset();
    const {width,height}=this.scale.gameSize;this.cameras.main.setSize(width,height).setScroll(0,0);
    const l=this.layout=welfareLayout(width,height),save=gameStore.snapshot,status=welfareStatus(save);
    const bg=this.add.image(width/2,height/2,welfareKey('background_palace'));bg.setScale(coverScale(bg.width,bg.height,width,height));
    this.add.rectangle(width/2,height/2,width,height,0x28101a,.38);
    const title=this.art('header',l.title).getBounds();
    this.field('title',rect(title.x+24,title.y+8,title.width-48,title.height-16),'PHÚC LỢI',32);
    this.backToLobby(l.back.x+l.back.width/2,l.back.y+l.back.height/2,l.back.width,l.back.height);
    this.welfarePanel(l.sidebar);this.welfarePanel(l.panel);
    TABS.forEach(([id,label,icon],i)=>{
      const box=l.tabs[i],selected=this.page===id;
      const image=this.art(selected?'tab_selected':'tab_default',box);
      this.art(icon,rect(box.x+S.md,box.y+12,36,36));
      this.field(`tab.${id}`,rect(box.x+56,box.y+10,box.width-70,40),label,18,selected?'#4a2419':'#ffe3ae','center',1);
      const hit=this.add.zone(box.x+box.width/2,box.y+box.height/2,box.width,box.height).setName(`welfare.tab.${id}`).setInteractive({useHandCursor:true});
      let pressed=false;hit.on('pointerdown',()=>{pressed=true;image.setTint(0xd3b989);});hit.on('pointerout',()=>{pressed=false;image.clearTint();});
      hit.on('pointerup',()=>{if(pressed){pressed=false;this.open(id);}});
      if((id==='Checkin'&&status.checkIn)||(id==='Missions'&&status.missions.length))this.add.circle(box.x+box.width-10,box.y+8,5,0xe34f42).setStrokeStyle(1,0xffdf83);
    });
    this.field('sidebar.note',rect(l.sidebar.x+S.xl,l.sidebar.y+l.sidebar.height-88,l.sidebar.width-S.section,64),
      'Nhận thưởng theo điều kiện\nTiến trình được lưu online',14,'#d8bd9d','center',3);
    this.art('hostess_phuc_loi',l.hostess).setName('welfare.hostess');
    this.field('host.caption',rect(l.host.x,l.host.y+l.host.height-72,l.host.width,40),'Sứ giả Phúc Lợi',23,'#ffe2a0','center');
    this.field('host.note',rect(l.host.x+16,l.host.y+l.host.height-34,l.host.width-32,30),'Mỗi ngày một bước trên hành trình Tam Quốc',13,'#ead3af','center');
    this.field('page.title',rect(l.panel.x+S.xl,l.panel.y+S.lg,l.panel.width-S.section,42),HEADINGS[this.page],26);
    const subtitle=this.page==='Checkin'?'Mỗi ngày một mốc · Bắt đầu chu kỳ mới sau ngày 7':
      this.page==='Missions'?'Làm mới lúc 00:00 giờ Việt Nam':this.page==='Topup'?'Demo có cấu hình · Không phải giao dịch nạp tiền':'Thông tin và trạng thái chức năng';
    this.field('page.subtitle',rect(l.panel.x+S.xl,l.panel.y+60,l.panel.width-S.section,32),subtitle,14,'#dec39e');
    if(this.page==='Checkin')this.checkin(status);
    else if(this.page==='Missions')this.missions(status);
    else if(this.page==='Topup')this.topup(status);
    else{
      const b=l.body;this.welfarePanel(rect(b.x,b.y+40,b.width,b.height-80),'template_parchment_detail_panel',20);
      this.field('unavailable.title',rect(b.x+24,b.y+80,b.width-48,48),'Đang hoàn thiện',25,'#603923','center');
      this.field('unavailable.body',rect(b.x+24,b.y+150,b.width-48,96),
        'Chức năng chưa được mở. Hiện chưa có phần thưởng có thể nhận tại mục này.',18,'#68452f','center',3);
    }
  }
  private entries(reward:WalletReward){return REWARDS.flatMap(([key,label,art])=>reward[key]?[{label,art,amount:reward[key]!}]:[]);}
  private rewards(reward:WalletReward,box:ContentRect,id:string,color='#583421'){
    this.entries(reward).forEach((item,i)=>{
      const y=box.y+i*(S.lg+S.md);if(item.art)this.art(item.art,rect(box.x,y+2,24,24));
      const label=box.width<180?(item.label==='Nguyên Bảo cũ'?'NB cũ':item.label==='EXP Tướng'?'EXP':item.label):item.label;
      this.field(`${id}.${i}`,rect(box.x+30,y,box.width-30,27),`${item.amount.toLocaleString('vi-VN')} ${label}`,13,color,'left',1);
    });
  }
  private checkin(status:ReturnType<typeof welfareStatus>){
    const active=status.welfare.checkIns===CHECK_IN.length&&status.checkIn?0:status.welfare.checkIns;
    CHECK_IN.forEach((reward,i)=>{
      const b=this.layout.days[i],ready=i===active&&status.checkIn,received=i<active;
      this.welfarePanel(b,'reward_blank',32);
      this.field(`day.${i}.title`,rect(b.x+8,b.y+10,b.width-16,30),`Ngày ${i+1}`,18,'#66331d','center',1);
      if(ready)this.add.graphics().lineStyle(2,0xf0bd4b).strokeRoundedRect(b.x+3,b.y+3,b.width-6,b.height-6,8);
      this.rewards(reward,rect(b.x+8,b.y+46,b.width-16,126),`day.${i}.reward`);
      const button=sharedButton(this,rect(b.x+18,b.y+b.height-58,b.width-36,36),
        received?'Đã nhận':ready?(this.busy?'Đang xử lý':'Nhận'):i===active?'Ngày mai':'Chưa đến',
        ready&&!this.busy?()=>{void this.claim({type:'checkIn'},()=>gameStore.claimCheckIn());}:undefined);
      button.background.setName(`welfare.claim.day.${i}`);
    });
  }
  private missions(status:ReturnType<typeof welfareStatus>){
    const b=this.layout.body,rowHeight=(b.height-3*S.md)/4;
    MISSIONS.forEach((id,i)=>{
      const mission=DAILY_MISSIONS[id],value=status.daily.counts[id]??0,done=status.daily.claimed.includes(id),ready=status.missions.includes(id);
      const row=rect(b.x,b.y+i*(rowHeight+S.md),b.width,rowHeight);this.welfarePanel(row,'template_parchment_detail_panel',20);
      this.field(`mission.${id}.title`,rect(row.x+16,row.y+8,row.width-138,30),mission.label,18,'#583421');
      this.field(`mission.${id}.progress`,rect(row.x+16,row.y+39,row.width-138,24),`Tiến độ ${Math.min(value,mission.goal)}/${mission.goal}`,13,'#765036');
      const reward=cloudRepository.economyV14 ? {...mission.reward,copper:COPPER_ECONOMY.mission[id]} : mission.reward;
      const rewards=this.entries(reward).map(r=>`${r.amount.toLocaleString('vi-VN')} ${r.label}`).join(' · ');
      this.field(`mission.${id}.rewards`,rect(row.x+16,row.y+66,row.width-32,30),rewards,12,'#765036');
      const button=sharedButton(this,rect(row.x+row.width-116,row.y+18,100,42),done?'Đã nhận':ready?'Nhận':'Đến',
        this.busy||done?undefined:ready?()=>{void this.claim({type:'daily',mission:id},()=>gameStore.claimDaily(id));}:()=>this.go(mission.scene),ready?'gold':'red');
      button.background.setName(`welfare.claim.mission.${id}`);
    });
  }
  private topup(status:ReturnType<typeof welfareStatus>){
    const b=this.layout.body,hero=HERO_BY_ID[TOPUP_HERO],duplicate=gameStore.snapshot.heroes.includes(hero.id)&&status.topup;
    this.welfarePanel(b,'template_parchment_detail_panel',24);
    this.add.image(b.x+b.width/2,b.y+76,PORTRAITS,atlasOrder.indexOf(hero.id)).setDisplaySize(96,96);
    this.field('topup.hero',rect(b.x+16,b.y+136,b.width-32,36),duplicate?`Mảnh ${hero.name} ×${DUPLICATE_SHARDS}`:`${hero.name} · ${hero.rarity}`,22,'#603923','center');
    this.rewards(TOPUP_REWARD,rect(b.x+32,b.y+190,b.width-64,90),'topup.reward');
    this.field('topup.notice',rect(b.x+24,b.y+b.height-128,b.width-48,52),
      'Đây là quà demo hiện có. Không xác nhận hay giả lập thanh toán thành công.',14,'#765036','center',3);
    sharedButton(this,rect(b.x+(b.width-230)/2,b.y+b.height-64,230,48),status.topup?'Nhận quà demo':'Đã nhận',
      status.topup&&!this.busy?()=>{void this.claim({type:'firstTopupDemo'},()=>gameStore.claimFirstTopupDemo());}:undefined);
  }
}
