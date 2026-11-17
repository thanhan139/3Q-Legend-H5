import Phaser from 'phaser';
import { UiScene } from '../ui/UiScene';
import { LobbyContent } from '../ui/LobbyContent';
import { rect, type ContentRect } from '../ui/lobbyContentLayout';
import { coverScale } from '../ui/viewport';
import { loadVipArt, vipBadge, vipArt, VIP_FONT, VIP_BADGE_BOUNDS, type VipArt } from '../ui/vipAssets';
import { VIP_LEVELS } from '../data/vipConfig';
import { vipLevel, vipProgress, vipBonuses, vipGiftState, vipPlaybackSpeeds, type VipGiftKind } from '../domain/vip';
import { cloudRepository } from '../cloud/cloudRepository';

const number = (n:number)=>n.toLocaleString('vi-VN');
const GIFT_LABELS = {level:'Quà thăng cấp',daily:'Quà VIP hằng ngày',weekly:'Quà VIP hằng tuần'};
const STATE_LABELS = {locked:'Chưa mở khóa',ready:'Nhận',claimed:'Đã nhận',developing:'Đang phát triển'};
const REWARD_NAMES:Record<string,string> = {golden_key:'Chìa Khóa Vàng',hero_exp:'EXP Tướng',enhancement_stone:'Đá Cường Hóa',
  forge_shard:'Mảnh Thần Binh',legacy_gem:'Nguyên Bảo cũ',gold:'Vàng',copper:'Đồng'};

export class VIPScene extends UiScene {
  private content!:LobbyContent;
  private selected=0;
  private start=0;
  private tab:'privileges'|'gifts'|'shop'='privileges';
  private busy=false;
  private loading=false;
  private message='';
  private owner?:string;
  private width=1280;
  constructor(){super('VIP');}
  init(){this.busy=false;this.loading=false;this.message='';this.tab='privileges';}
  preload(){loadVipArt(this);}
  create(){
    this.content=new LobbyContent(this,{fastFit:true,fontFamily:VIP_FONT,resolution:2,textPaddingY:1});
    this.owner=cloudRepository.uid;
    this.selected=vipLevel(cloudRepository.vip?.paidBaseKnbTotal);this.start=Math.max(0,Math.min(12,this.selected-3));
    this.render();
    const resize=()=>this.render();
    const changed=()=>{
      if(this.owner!==cloudRepository.uid){this.owner=cloudRepository.uid;this.selected=vipLevel(cloudRepository.vip?.paidBaseKnbTotal);this.start=Math.max(0,Math.min(12,this.selected-3));}
      this.render();
    };
    const escape=()=>this.go('Lobby');
    this.scale.on(Phaser.Scale.Events.RESIZE,resize);window.addEventListener('3q:cloud-save',changed);
    this.input.keyboard?.on('keydown-ESC',escape);
    const wheel=(p:Phaser.Input.Pointer,_objects:unknown[],_x:number,y:number)=>{if(p.worldY>=185&&p.worldY<=290){this.start=Phaser.Math.Clamp(this.start+Math.sign(y),0,12);this.render();}};
    this.input.on('wheel',wheel);
    let down=0;
    const dragStart=(p:Phaser.Input.Pointer)=>{down=p.worldY>=185&&p.worldY<=290?p.worldX:0;};
    const dragEnd=(p:Phaser.Input.Pointer)=>{if(down&&Math.abs(p.worldX-down)>70){this.start=Phaser.Math.Clamp(this.start+(p.worldX<down?3:-3),0,12);this.render();}down=0;};
    this.input.on('pointerdown',dragStart);this.input.on('pointerup',dragEnd);
    this.events.once('shutdown',()=>{
      this.scale.off(Phaser.Scale.Events.RESIZE,resize);window.removeEventListener('3q:cloud-save',changed);
      this.input.keyboard?.off('keydown-ESC',escape);this.input.off('wheel',wheel);
      this.input.off('pointerdown',dragStart);this.input.off('pointerup',dragEnd);
    });
    if(cloudRepository.active) void this.refresh();
  }
  private async refresh(){
    if(this.loading||this.busy)return;this.loading=true;this.message='';this.render();
    try{await cloudRepository.refresh();if(!cloudRepository.vip)this.message='Máy chủ chưa cập nhật VIP. Vui lòng thử lại sau.';}
    catch{this.message='Không thể kết nối máy chủ';}
    finally{this.loading=false;if(this.scene.isActive())this.render();}
  }
  private label(id:string,box:ContentRect,text:string,size=22,color='#fff0ce',center=false){
    return this.content.field(id,box,text,{size,minSize:12,align:center?'center':'left',color,wrap:true,maxLines:3,padding:1});
  }
  private vipPanel(box:ContentRect,art:VipArt='panel_dark'){
    return this.add.nineslice(box.x+box.width/2,box.y+box.height/2,vipArt(art),undefined,box.width,box.height,24,24,24,24);
  }
  private vipButton(id:string,box:ContentRect,text:string,action:()=>void,enabled=true,selected=false){
    const art=this.vipPanel(box,!enabled?'button_disabled':selected?'tab_selected':id.startsWith('tab.')?'button_red':'button_gold');
    this.label(`button.${id}`,rect(box.x+14,box.y+7,box.width-28,box.height-14),text,22,'#fff0ce',true);
    const hit=this.add.zone(box.x+box.width/2,box.y+box.height/2,box.width,box.height).setName(`vip.${id}`);
    if(enabled){let pressed=false;hit.setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>{pressed=true;art.setTint(0xc8a16c);});hit.on('pointerout',()=>{pressed=false;art.clearTint();});
      hit.on('pointerup',()=>{art.clearTint();if(pressed){pressed=false;action();}});
      hit.on('pointerover',()=>art.setTint(0xffe4af));
    }return hit;
  }
  private badge(level:number,box:ContentRect,name:string){
    const key=vipBadge(level),texture=this.textures.get(key);
    if(!texture.has('crest')){
      const [x,y,width,height]=VIP_BADGE_BOUNDS[level];
      texture.add('crest',0,x,y,width,height);
    }
    const art=this.add.image(box.x+box.width/2,box.y+box.height/2,key,'crest').setName(name);
    const pixelScale=this.game.canvas.getBoundingClientRect().width/this.scale.width;
    // A common visible width, independent of the source aspect ratio. Reserve enough
    // height for VIP 18's tall crest instead of enlarging the flatter early crests.
    const visibleWidth=Math.min(box.width,box.height*1.18);
    art.setScale(Math.min(visibleWidth/art.width,box.height/art.height,1/Math.max(1,pixelScale)));
    return art;
  }
  private render(){
    this.tweens.killAll();this.children.removeAll(true);this.content.reset();
    const {width,height}=this.scale.gameSize;this.width=width;
    this.cameras.main.setSize(width,height).setScroll(0,0);
    const bg=this.add.image(width/2,height/2,'vip.hall');bg.setScale(coverScale(bg.width,bg.height,width,height));
    this.add.rectangle(width/2,height/2,width,height,0x20090d,.92);
    this.add.graphics().lineStyle(2,0xbc8b48,.85).strokeRoundedRect(14,8,width-28,height-12,28);
    // Keep the banner proportional; its track is mapped in source-texture coordinates.
    const snapshot=cloudRepository.vip,current=vipLevel(snapshot?.paidBaseKnbTotal),progress=vipProgress(snapshot?.paidBaseKnbTotal);
    const banner=rect(30,18,Math.min(width-270,1347),155);
    const scale=Math.min(banner.width/1347,banner.height/217);
    this.add.image(banner.x,banner.y,'vip.header').setOrigin(0).setScale(scale).setName('vip.dragon-title');
    const mapped=(x:number,y:number,w:number,h:number)=>rect(banner.x+x*scale,banner.y+y*scale,w*scale,h*scale);
    const track=mapped(342,119,842,25);
    if(snapshot&&progress.fraction>0){
      const bar=this.add.image(track.x,track.y,vipArt('progress_fill_tilable')).setOrigin(0).setDisplaySize(track.width,track.height);
      bar.setCrop(0,0,bar.frame.width*progress.fraction,bar.frame.height).setName('vip.progress-fill');
    }
    this.label('paid-total',mapped(360,62,800,43),snapshot?
      `VIP ${current} · ${number(snapshot.paidBaseKnbTotal)} / ${number(progress.upper)} KNB`:'Chưa tải dữ liệu VIP',24,'#fff0c9',true);
    this.label('progress',rect(banner.x+300*scale,171,banner.width-350*scale,20),current===18?'Đã đạt cấp tối đa':
      `VIP ${current} → VIP ${current+1} · Còn ${number(progress.remaining)} KNB`,15,'#e9cca0',true);
    this.badge(current,rect(width-240,22,120,72),'vip.current-badge');
    this.backToLobby(width-127,129,190,54).background.setName('vip.back');
    this.vipButton('refresh',rect(width-110,37,70,42),this.loading?'…':'↻',()=>{void this.refresh();},!this.loading&&!this.busy);
    this.drawTiers();
    const tabs=[['privileges','Đặc Quyền'],['gifts','Quà VIP'],['shop','Cửa Hàng VIP']] as const;
    tabs.forEach(([key,label],i)=>this.vipButton(`tab.${key}`,rect(width-600+i*186,294,174,42),label,()=>{this.tab=key;this.render();},true,key===this.tab));
    const body=rect(40,350,width-80,height-386);
    if(this.tab==='privileges')this.drawPrivileges(body,current);
    if(this.tab==='gifts')this.drawGifts(body);
    if(this.tab==='shop'){
      this.vipPanel(body);this.badge(this.selected,rect(body.x+30,body.y+30,220,body.height-60),'vip.shop-badge');
      this.label('shop.title',rect(body.x+280,body.y+35,body.width-310,48),'CỬA HÀNG VIP',29,'#ffdc89');
      this.label('shop.empty',rect(body.x+280,body.y+95,body.width-310,130),'Đang phát triển\nChưa có gói hàng được phát hành. Thanh toán thật hiện chưa khả dụng.',24);
      this.label('conversion',rect(body.x+280,body.y+body.height-80,body.width-310,54),'10.000 VNĐ = 1.000 KNB cơ bản\nKNB miễn phí và khuyến mãi không tăng VIP.',21,'#e2c099');
    }
    const notice=this.message||(!snapshot?'Dữ liệu VIP chưa được xác nhận. Không có giao dịch nạp hoặc cấp quà từ thiết bị.':'KNB miễn phí và khuyến mãi không tăng VIP.');
    this.label('notice',rect(48,height-28,width-96,26),notice,15,this.message?'#ffbba5':'#d9b589',true);
  }
  private drawTiers(){
    const w=this.width;
    this.vipButton('prev',rect(40,211,46,46),'‹',()=>{this.start=Math.max(0,this.start-7);this.render();},this.start>0);
    this.vipButton('next',rect(w-86,211,46,46),'›',()=>{this.start=Math.min(12,this.start+7);this.render();},this.start<12);
    const size=(w-240)/7;
    for(let i=0;i<7;i++){
      const level=this.start+i,box=rect(120+i*size,191,size-8,94);
      if(this.selected===level){
        this.add.ellipse(box.x+box.width/2,box.y+50,box.width-8,36,0xffbd42,.13).setBlendMode('ADD');
        this.add.rectangle(box.x+box.width/2,box.y+94,box.width*.62,2,0xe9b85b,.9);
      }
      this.badge(level,rect(box.x+3,box.y-8,box.width-6,90),`vip.tier-badge.${level}`);
      this.label(`tier.${level}.threshold`,rect(box.x+4,box.y+78,box.width-8,22),number(VIP_LEVELS[level].threshold),14,level>=15?'#ffdb69':'#e2c099',true);
      const hit=this.add.zone(box.x+box.width/2,box.y+box.height/2,box.width,box.height).setName(`vip.tier.${level}`).setInteractive({useHandCursor:true});
      let down=0;hit.on('pointerdown',(p:Phaser.Input.Pointer)=>{down=p.worldX;});
      hit.on('pointerup',(p:Phaser.Input.Pointer)=>{if(Math.abs(p.worldX-down)<30){this.selected=level;this.render();}});
    }
  }
  private drawPrivileges(body:ContentRect,current:number){
    const gap=36,col=(body.width-gap)/2;
    const left=rect(body.x,body.y+46,col,body.height-46),right=rect(body.x+col+gap,body.y+46,col,body.height-46);
    this.label('bonuses.title',rect(body.x+4,body.y,col-165,38),`ĐẶC QUYỀN VIP ${this.selected}`,27,'#f4d284');
    this.badge(this.selected,rect(body.x+col-150,body.y-8,142,49),'vip.selected-badge');
    this.label('level.title',rect(right.x+4,body.y,right.width-8,38),'QUÀ THĂNG CẤP',27,'#f4d284');
    this.vipPanel(left);this.vipPanel(right);
    const stats=vipBonuses(this.selected),rows=[['Công',stats.atkPct],['Thủ',stats.defPct],['Máu',stats.hpPct],['Bạo Kích',stats.critRatePoints],['ST Bạo Kích',stats.critDamagePct]] as const;
    rows.forEach(([name,value],i)=>{
      const x=left.x+24+(i%2)*(left.width-48)/2,y=left.y+18+Math.floor(i/2)*43;
      this.label(`stat.${i}.label`,rect(x,y,(left.width-56)/2,36),`${name} +${value}${i===3?' điểm %':'%'}`,22,'#f5dfb3');
    });
    const details=[`Chiến đấu ${vipPlaybackSpeeds(current).map(n=>`×${n}`).join(' / ')} · Đã tích hợp`,
      'Càn quét · Tự động đi ải: Đang phát triển',
      'Bỏ qua quái · Thưởng EXP: Đang phát triển'];
    details.forEach((text,i)=>this.label(`perk.${i}.status`,rect(left.x+24,left.y+155+i*31,left.width-48,29),text,19,i===0?'#efd28b':'#cbb393'));
    this.label('bonuses.note',rect(left.x+20,left.y+left.height-37,left.width-40,27),this.selected>current?'Xem trước · Chưa mở khóa':
      this.selected===current?'Chỉ số đang áp dụng · Không cộng dồn':`Đã mở khóa · Đang áp dụng chỉ số VIP ${current}`,16,'#bca482',true);
    this.drawGift(right,'level',false);
  }
  private drawGifts(body:ContentRect){
    (['level','daily','weekly'] as VipGiftKind[]).forEach((kind,i)=>{
      const box=rect(body.x+i*(body.width+12)/3,body.y,(body.width-24)/3,body.height);
      this.vipPanel(box,'reward_card');this.drawGift(box,kind);
    });
  }
  private drawGift(box:ContentRect,kind:VipGiftKind,title=true){
      // Browsing older tiers never stacks periodic gifts; those always belong to the actual current VIP.
      const tier=kind==='level'?this.selected:vipLevel(cloudRepository.vip?.paidBaseKnbTotal);
      const state=vipGiftState(cloudRepository.vip,tier,kind),offer=cloudRepository.vip?.offers.find(o=>o.kind===kind&&o.tier===tier);
      if(title)this.label(`gift.${kind}.title`,rect(box.x+18,box.y+12,box.width-36,36),`${GIFT_LABELS[kind]} · VIP ${tier}`,22,'#ffe199',true);
      const key=state==='ready'?'chest_ready_gold':state==='claimed'?'chest_claimed_gray':'chest_locked_wood';
      const chest=this.add.image(box.x+box.width/2,box.y+(title?103:62),`vip.${key}`);chest.setScale(Math.min(140/chest.width,88/chest.height));
      const rewards=offer?Object.entries(offer.rewards).map(([id,count])=>`${REWARD_NAMES[id]??'Vật phẩm'} ×${number(count)}`).join(' · '):'Chưa có quà được phát hành.';
      this.label(`gift.${kind}.rewards`,rect(box.x+20,box.y+(title?155:119),box.width-40,60),rewards,19,'#e6c9a2',true);
      const buttonWidth=Math.min(270,box.width-56);
      this.vipButton(`claim.${kind}`,rect(box.x+(box.width-buttonWidth)/2,box.y+box.height-72,buttonWidth,54),this.busy?'Đang xác nhận…':STATE_LABELS[state],()=>{
        if(!offer||this.busy)return;this.busy=true;this.message='';this.render();
        void cloudRepository.execute({type:'vipClaim',tier,kind,period:offer.period}).then(()=>{
          this.message='Đã nhận quà VIP.';
        }).catch(error=>{this.message=error instanceof Error?error.message:'Không thể kết nối máy chủ';}).finally(()=>{
          this.busy=false;if(this.scene.isActive())this.render();
        });
      },state==='ready'&&!this.busy&&!this.loading);
  }
}
