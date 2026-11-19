import Phaser from 'phaser';
import { UiScene } from '../ui/UiScene';
import { loadSharedUi, sharedButton, UI_FONT } from '../ui/sharedUi';
import { MAIL_ART, MAIL_LABELS, MAIL_REWARD_LABELS, type MailArt } from '../ui/mailAssets';
import { canClaimMail, MAIL_CATEGORIES, MAIL_ITEMS, MAIL_PAGE_SIZE,
  type MailCategory, type MailInbox, type MailRow } from '../cloud/mailProtocol';
import { mailRepository, MailUnavailable } from '../cloud/mailRepository';
import { rect } from '../ui/lobbyContentLayout';
import { coverScale, readSafeInsets } from '../ui/viewport';

const iconFrames = {all:3,system:6,event:0,personal:1} as const;
const time = new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',
  day:'2-digit',month:'2-digit',year:'numeric'});
const format = new Intl.NumberFormat('vi-VN');
const key = (art: MailArt) => `mail.${art}`;

export class MailScene extends UiScene {
  private layer!: Phaser.GameObjects.Container;
  private backdrop!: Phaser.GameObjects.Image;
  private category: MailCategory = 'all';
  private inbox?: MailInbox;
  private selected?: string;
  private showDetail = false;
  private bodyPage = 0;
  private page = 0;
  private offset = 0;
  private working = true;
  private owner?: string;
  private generation = 0;
  private confirm = false;
  private error = '';
  private notice = '';
  private mobile = false;
  private width = 1280;
  private height = 720;
  private pageBy?: (direction: number) => void;

  constructor() { super('Mail'); }

  preload() {
    loadSharedUi(this);
    for (const [art,path] of Object.entries(MAIL_ART)) {
      if (!this.textures.exists(`mail.${art}`)) this.load.image(`mail.${art}`,`${import.meta.env.BASE_URL}assets/${path}`);
    }
    if (!this.textures.exists('lobby-icons')) this.load.spritesheet('lobby-icons',`${import.meta.env.BASE_URL}assets/lobby/menu-icons.webp`,
      {frameWidth:256,frameHeight:256});
  }

  create() {
    this.owner = mailRepository.uid;
    if (!this.owner) { this.scene.start('Boot'); return; }
    this.generation++;
    this.category = 'all'; this.page = 0; this.offset = 0; this.bodyPage = 0;
    this.inbox = undefined; this.selected = undefined; this.showDetail = false;
    this.working = false; this.confirm = false; this.error = ''; this.notice = '';
    this.backdrop = this.add.image(640,360,key('palace'));
    const resize = () => this.render();
    const escape = () => {
      if (this.confirm) { this.confirm=false; this.render(); }
      else if (this.mobile && this.showDetail) { this.showDetail=false; this.render(); }
      else this.go('Lobby');
    };
    let lastScroll=0;
    const scroll=(pointer:Phaser.Input.Pointer, delta:number)=>{
      if (!this.layer || this.working || this.confirm || this.time.now-lastScroll<140 || !delta) return;
      const camera=this.cameras.main;
      const x=(pointer.x+camera.scrollX-this.layer.x)/this.layer.scaleX;
      const y=(pointer.y+camera.scrollY-this.layer.y)/this.layer.scaleY;
      if (y<146 || y>(this.mobile?269:495) ||
        x<(this.mobile?14:270) || x>(this.mobile?this.width-14:688)) return;
      lastScroll=this.time.now;
      this.pageBy?.(Math.sign(delta));
    };
    const wheel=(pointer:Phaser.Input.Pointer,_objects:unknown,_dx:number,dy:number)=>scroll(pointer,dy);
    const swipe=(pointer:Phaser.Input.Pointer)=>{
      if (!pointer.wasTouch || Math.abs(pointer.upY-pointer.downY)<35) return;
      scroll(pointer,pointer.downY-pointer.upY);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE,resize);
    this.input.keyboard?.on('keydown-ESC',escape);
    this.input.on('wheel',wheel);
    this.input.on('pointerup',swipe);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,() => {
      this.generation++; this.scale.off(Phaser.Scale.Events.RESIZE,resize);
      this.input.keyboard?.off('keydown-ESC',escape);
      this.input.off('wheel',wheel); this.input.off('pointerup',swipe);
    });
    void this.run();
  }

  update() { if (this.owner && this.owner !== mailRepository.uid) this.scene.start('Boot'); }

  private async run(action?: (owner: string) => Promise<string|void>) {
    const owner = this.owner;
    if (this.working || !owner) return;
    const generation = this.generation;
    const current = () => this.generation === generation && this.owner === mailRepository.uid;
    this.error=''; this.notice=''; this.working=true; this.render();
    try {
      let notice: string|void = undefined;
      try { notice = await action?.(owner); }
      catch (error) {
        if (!(error instanceof MailUnavailable)) throw error;
        notice = error.message;
      }
      if (!current()) return;
      let inbox = await mailRepository.list(owner,this.category,this.page);
      if (!current()) return;
      const last = Math.max(0,Math.ceil(inbox.filtered / MAIL_PAGE_SIZE)-1);
      if (this.page > last) {
        this.page=last; this.offset=0;
        inbox=await mailRepository.list(owner,this.category,last);
      }
      if (!current()) return;
      this.inbox=inbox; this.notice=notice ?? '';
      if (!inbox.rows.some(row => row.id===this.selected)) { this.selected=undefined; this.showDetail=false; this.bodyPage=0; }
    } catch (error) {
      if (current()) this.error=error instanceof Error ? error.message : 'Không thể tải hộp thư.';
    } finally { if (current()) { this.working=false; this.render(); } }
  }

  private open(row: MailRow) {
    this.selected=row.id; this.showDetail=true; this.bodyPage=0;
    if (row.read_at) this.render();
    else void this.run(async owner => { await mailRepository.send(owner,{action:'read',mailId:row.id}); });
  }

  private take(mailId?: string) {
    void this.run(async owner => {
      const receipt=await mailRepository.claim(owner,mailId);
      return `Đã nhận quà từ ${receipt.mailIds.length} thư.`;
    });
  }

  private browse(category: MailCategory) {
    this.category=category; this.page=0; this.offset=0; this.inbox=undefined;
    this.selected=undefined; this.showDetail=false; this.bodyPage=0;
    void this.run();
  }

  private place(art: MailArt,x: number,y: number,w: number,h: number,stretch = false) {
    const picture=this.add.image(x,y,key(art));
    if (stretch) picture.setDisplaySize(w,h);
    else picture.setScale(Math.min(w/picture.width,h/picture.height));
    this.layer.add(picture);
    return picture;
  }

  private frame(x: number,y: number,w: number,h: number) {
    if (this.game.renderer.type !== Phaser.WEBGL) return this.place('panel',x+w/2,y+h/2,w,h,true);
    return this.layer.add(this.add.nineslice(x+w/2,y+h/2,key('panel'),undefined,w*2,h*2,63,63,63,63).setScale(.5));
  }

  private icon(type: MailCategory,x: number,y: number,size: number, muted=false) {
    const icon=this.add.image(x,y,'lobby-icons',iconFrames[type]).setDisplaySize(size,size);
    if (muted) icon.setTint(0xa8a4ae).setAlpha(.78);
    this.layer.add(icon);
  }

  private label(x: number,y: number,value: string,size: number,w: number,h: number,color='#fff1cc',left=false) {
    const label=this.add.text(x,y,value,{fontFamily:UI_FONT,fontStyle:'bold',fontSize:size,color,resolution:2,
      wordWrap:{width:w,useAdvancedWrap:true},align:left?'left':'center',padding:{top:2,bottom:2}}).setOrigin(left?0:.5,.5);
    while ((label.width>w || label.height>h) && size>11) label.setFontSize(--size);
    if (label.height>h || label.width>w) {
      const original=value.replace(/\s+/g,' ');
      let start=0,end=original.length;
      while(start<end){
        const mid=Math.ceil((start+end)/2); label.setText(`${original.slice(0,mid).trimEnd()}…`);
        if (label.height<=h && label.width<=w) start=mid; else end=mid-1;
      }
      label.setText(`${original.slice(0,start).trimEnd()}…`);
    }
    this.layer.add(label);
    return label;
  }

  private action(name: string,x: number,y: number,w: number,h: number,value: string,fn?: ()=>void,kind:'back'|'red'|'gold'='red') {
    const enabled=(!this.confirm || name.startsWith('dialog.')) ? fn : undefined;
    const button=sharedButton(this,rect(x,y,w,h),value,undefined,kind);
    this.layer.add([button.background,button.text]);
    if (!enabled) return;
    button.background.clearTint().setAlpha(1); button.text.setAlpha(1);
    this.hit(name,x,y,w,h,enabled,button.background);
  }

  private hit(name: string,x: number,y: number,w: number,h: number,fn: ()=>void, art?: Phaser.GameObjects.Image) {
    const area=this.add.zone(x+w/2,y+h/2,w,h).setName(`mail.${name}`).setInteractive({useHandCursor:true});
    this.layer.add(area);
    let down=false;
    area.on('pointerover',()=>art?.setTint(0xffe6b1));
    area.on('pointerdown',()=>{down=true;art?.setTint(0xc49a73);});
    area.on('pointerout',()=>{down=false;art?.clearTint();});
    area.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
      art?.clearTint();
      const tapped=down&&Math.hypot(pointer.upX-pointer.downX,pointer.upY-pointer.downY)<26;
      down=false; if(tapped) fn();
    });
  }

  private render() {
    this.layer?.destroy(true);
    const {width:w,height:h}=this.scale.gameSize, camera=this.cameras.main;
    const css=this.game.canvas.getBoundingClientRect();
    const insets=readSafeInsets(css.width/w || 1);
    this.mobile=css.height<=510 || css.width<900;
    const availableW=w-insets.left-insets.right, availableH=h-insets.top-insets.bottom;
    this.height=this.mobile?390:720;
    this.width=this.mobile?Math.max(470,Math.round(availableW*this.height/availableH)):1280;
    const s=Math.min(availableW/this.width,availableH/this.height);
    const x=camera.scrollX+insets.left+(availableW-this.width*s)/2;
    const y=camera.scrollY+insets.top+(availableH-this.height*s)/2;
    this.layer=this.add.container(x,y).setScale(s);
    this.pageBy=undefined;
    this.backdrop.setPosition(camera.scrollX+w/2,camera.scrollY+h/2)
      .setScale(coverScale(this.backdrop.width,this.backdrop.height,w,h));
    this.header();
    if (this.mobile) {
      const selected=this.inbox?.rows.find(row=>row.id===this.selected);
      if (this.showDetail && selected) this.detail(14,58,this.width-28,318,selected);
      else { this.categories(); this.list(14,104,this.width-28,272); }
    } else {
      this.categories();
      const empty=this.inbox?.total===0 && !this.error;
      this.list(270,91,empty?990:418,565);
      if(!empty) this.detail(695,91,565,565,this.inbox?.rows.find(row=>row.id===this.selected));
    }
    if (this.error && this.inbox) {
      this.label(this.width/2,this.height-(this.mobile?13:31),this.error,this.mobile?12:17,this.width-204,25);
      const retry=()=>this.owner&&mailRepository.pending(this.owner)?this.take():void this.run();
      this.action('reload',this.width-(this.mobile?350:405),this.mobile?2:22,105,48,'Thử lại',this.confirm?undefined:retry);
    }
    if (this.notice && !this.error) this.label(this.width/2,this.height-(this.mobile?12:31),this.notice,15,this.width-32,24);
    if (this.confirm) this.dialog();
  }

  private header() {
    const y=this.mobile?27:47;
    this.place('title',this.mobile?145:224,y,this.mobile?262:402,this.mobile?46:72);
    this.icon('all',this.mobile?42:64,y,this.mobile?44:69);
    this.label(this.mobile?133:208,y,'Hộp Thư',this.mobile?26:39,this.mobile?175:280,60);
    this.action('back',this.width-(this.mobile?242:274),y-25,this.mobile?127:146,50,
      this.mobile&&this.showDetail?'← Danh sách':'Làm mới',this.working?undefined:()=>{
        if(this.mobile&&this.showDetail){this.showDetail=false;this.render();} else void this.run();
      });
    this.action('lobby',this.width-(this.mobile?112:124),y-25,this.mobile?100:112,50,'← Về sảnh',()=>this.go('Lobby'),'back');
  }

  private categories() {
    const w=this.mobile?(this.width-30)/4:180;
    if(!this.mobile) this.frame(44,91,214,565);
    MAIL_CATEGORIES.forEach((id,i)=>{
      const x=this.mobile?15+i*w:61, y=this.mobile?55:126+i*79, h=this.mobile?48:59;
      const art=this.place(this.category===id?'selected':'row',x+w/2,y+h/2,w-3,h-3,true);
      this.icon(id,x+(this.mobile?22:30),y+h/2,this.mobile?33:46);
      this.label(x+w/2+(this.mobile?9:14),y+h/2,MAIL_LABELS[id],this.mobile?14:19,w-44,37,
        this.category===id?'#4d230e':'#fff1cc');
      const unread=this.inbox?.unread[id]??0;
      if(unread) this.badge(x+w-18,y+(this.mobile?11:9),String(unread),29,true);
      if(!this.working&&!this.confirm) this.hit(`tab.${id}`,x,y,w,h,()=>this.browse(id),art);
    });
  }

  private badge(x: number,y: number,value: string,w: number,unread=false) {
    const badge=this.add.graphics();
    badge.fillStyle(unread?0xa81e20:0x574046).fillRoundedRect(x-w/2,y-11,w,22,11);
    badge.lineStyle(1,unread?0xffae4a:0xb89a7e).strokeRoundedRect(x-w/2,y-11,w,22,11);
    this.layer.add(badge);
    this.label(x,y,value,12,w-4,22);
  }

  private list(x: number,y: number,w: number,h: number) {
    this.frame(x,y,w,h);
    const compact=this.mobile;
    const foot=compact?56:68;
    const inner=x+13, innerW=w-26;
    this.label(inner+15,y+(compact?21:31),this.inbox?`Thư: ${this.inbox.total} / 50`:'Hộp thư',compact?16:20,150,30,'#fff1cc',true);
    if(!this.inbox?.rows.length){
      const text=this.error?'Không thể tải hộp thư':this.working?'Đang tải hộp thư…':
        this.inbox?.total?'Danh mục này chưa có thư':'Hộp thư trống';
      this.empty(x+w/2,y+(h-foot)/2,text,this.error?'Thử lại để tải dữ liệu mới.':
        this.working?'':this.inbox?.total?'Chọn danh mục khác.':'Hiện chưa có thư mới.');
      if(this.error&&!this.working) this.action('empty.retry',x+w/2-63,y+h-foot-30,126,44,'Thử lại',()=>void this.run(),'gold');
    } else {
      const capacity=compact?2:4, pitch=compact?63:83;
      const offset=Math.min(this.offset,Math.max(0,Math.floor((this.inbox.rows.length-1)/capacity)*capacity));
      this.inbox.rows.slice(offset,offset+capacity).forEach((row,i)=>{
        const top=y+(compact?42:55)+pitch*i;
        const sel=row.id===this.selected;
        const art=this.place(sel?'selected':'row',x+w/2,top+(pitch-5)/2,innerW,pitch-5,true);
        const titleColor=sel?'#46210e':'#fff3d0';
        this.icon(row.category==='event'?'event':'all',inner+29,top+(pitch-5)/2,compact?49:58,!!row.claimed_at||row.expired);
        this.label(inner+63,top+(compact?16:23),row.subject,compact?17:18,innerW-(compact?201:174),33,titleColor,true);
        this.label(inner+63,top+(compact?41:54),MAIL_LABELS[row.category],13,121,23,titleColor,true);
        this.label(x+w-87,top+(compact?43:54),time.format(new Date(row.created_at)),compact?12:13,142,24,titleColor);
        const status=row.claimed_at?'Đã nhận':row.expired?'Hết hạn':row.read_at?'Đã đọc':'Chưa đọc';
        this.badge(x+w-56,top+16,status,80,!row.read_at&&!row.claimed_at&&!row.expired);
        if(!this.working&&!this.confirm) this.hit(`row.${row.id}`,inner,top,innerW,pitch-5,()=>this.open(row),art);
      });
      const first=this.page*MAIL_PAGE_SIZE+offset+1, last=Math.min(first+capacity-1,this.page*MAIL_PAGE_SIZE+this.inbox.rows.length);
      const pagerY=y+h-foot-(compact?48:46);
      const turn=(direction: number)=>{
        if ((direction<0&&first<=1)||(direction>0&&last>=this.inbox!.filtered)) return;
        const target=offset+direction*capacity;
        if (target>=0&&target<this.inbox!.rows.length){this.offset=target;this.render();return;}
        this.page+=direction; this.offset=direction>0?0:MAIL_PAGE_SIZE-capacity; void this.run();
      };
      this.pageBy=turn;
      const active=!this.working&&!this.confirm;
      this.action('previous',x+w/2-111,pagerY,52,44,'‹',active&&first>1?()=>turn(-1):undefined);
      this.label(x+w/2,pagerY+22,`${first}–${last} / ${this.inbox.filtered}`,14,112,33);
      this.action('next',x+w/2+59,pagerY,52,44,'›',active&&last<this.inbox.filtered?()=>turn(1):undefined);
    }
    const pending=this.owner && mailRepository.pending(this.owner);
    const sideW=compact?156:169;
    this.action('delete',x+w/2-sideW-5,y+h-foot,sideW,49,'Xóa đã đọc',!this.working&&this.inbox?.deletable?()=>{
      this.confirm=true;this.render();
    }:undefined);
    this.action('all',x+w/2+5,y+h-foot,sideW,49,pending?'Đối chiếu':'Nhận tất cả',
      !this.working&&(pending||this.inbox?.claimable)?()=>this.take():undefined,'gold');
  }

  private empty(x: number,y: number,title: string,hint: string) {
    this.icon('all',x,y-25,this.mobile?76:132,true);
    this.place('divider',x,y+13,this.mobile?115:185,25);
    this.label(x,y+36,title,this.mobile?18:24,320,33);
    this.label(x,y+63,hint,this.mobile?13:16,360,28,'#e4c49e');
  }

  private detail(x: number,y: number,w: number,h: number,row?: MailRow) {
    this.frame(x,y,w,h);
    if(!row){this.empty(x+w/2,y+h*.47,'Nội dung thư','Chọn thư để xem chi tiết.');return;}
    this.place('parchment',x+w/2,y+h/2,w-15,h-15,true);
    const compact=this.mobile, center=x+w/2, ink='#552513';
    const margin=compact?20:30, textW=w-2*margin;
    this.label(center,y+(compact?24:48),row.subject,compact?22:28,textW,compact?40:64,'#852515');
    this.place('divider',center,y+(compact?45:80),w-65,20);
    this.label(x+margin,y+(compact?57:106),`Người gửi: ${row.sender}`,compact?13:16,textW*.53,30,ink,true);
    this.label(x+w-margin-textW*.4,y+(compact?57:106),time.format(new Date(row.created_at)),compact?13:16,textW*.4,30,ink,true);
    const bodyY=y+(compact?74:134), linesPerPage=compact?3:6;
    const body=this.add.text(x+margin,bodyY,'',{fontFamily:UI_FONT,fontStyle:'bold',fontSize:compact?14:18,color:ink,
      resolution:2,wordWrap:{width:textW,useAdvancedWrap:true},lineSpacing:3});
    this.layer.add(body);
    const wrapped=body.getWrappedText(row.body);
    const pages=Math.max(1,Math.ceil(wrapped.length/linesPerPage));
    this.bodyPage=Math.min(this.bodyPage,pages-1);
    body.setText(wrapped.slice(this.bodyPage*linesPerPage,(this.bodyPage+1)*linesPerPage).join('\n'));
    if(pages>1){
      const at=y+(compact?140:311);
      const step=(change:number)=>()=>{this.bodyPage+=change;this.render();};
      this.action('body.prev',center-105,at,48,44,'‹',this.bodyPage>0?step(-1):undefined);
      this.label(center,at+22,`${this.bodyPage+1}/${pages}`,14,80,30,ink);
      this.action('body.next',center+57,at,48,44,'›',this.bodyPage+1<pages?step(1):undefined);
    }
    const rewardsY=y+(compact?188:364);
    const rewards=MAIL_ITEMS.filter(item=>row.rewards[item]);
    if(rewards.length){
      this.place('strip',center,rewardsY,compact?230:300,compact?29:39,true);
      this.label(center,rewardsY,'Phần Thưởng Đính Kèm',compact?14:18,280,37);
      const size=compact?43:75, pitch=Math.min(compact?130:120,textW/4);
      rewards.forEach((item,index)=>{
        const cx=center+(index-(rewards.length-1)/2)*pitch, cy=rewardsY+(compact?39:66);
        this.place(item==='copper'||item==='jewelry_essence'?'purpleSlot':'goldSlot',cx,cy,size+12,size+12);
        this.place(item,cx,cy,item==='jewelry_essence'?size*2.3:size-8,item==='jewelry_essence'?size*2.3:size-8);
        this.label(cx,cy+(compact?11:24),`×${format.format(row.rewards[item]!)}`,compact?13:16,pitch-4,24)
          .setStroke('#351c23',3);
        this.label(cx,cy+(compact?26:52),MAIL_REWARD_LABELS[item],compact?12:14,pitch-3,29,ink);
      });
      const pending=this.owner&&mailRepository.pending(this.owner);
      const status=pending?'Đối chiếu':row.claimed_at?'Đã nhận':row.expired?'Đã hết hạn':'Nhận Thưởng';
      this.action('claim',center-106,y+h-(compact?54:64),212,51,status,
        !this.working&&(pending||canClaimMail(row))?()=>this.take(row.id):undefined,'gold');
    }else{
      this.label(center,y+h-74,row.expired?'Thư đã hết hạn':'Thư không có vật phẩm đính kèm.',17,textW,35,ink);
    }
  }

  private dialog() {
    this.layer.add(this.add.rectangle(this.width/2,this.height/2,this.width,this.height,0x13090e,.72).setInteractive());
    const w=Math.min(480,this.width-28), h=192, x=(this.width-w)/2,y=(this.height-h)/2;
    this.frame(x,y,w,h);
    this.label(this.width/2,y+35,'Xóa thư đã đọc?',23,w-40,42);
    this.label(this.width/2,y+84,'Chỉ xóa thư đã đọc và đã nhận quà hoặc không có quà.',16,w-52,58);
    this.action('dialog.cancel',this.width/2-146,y+123,135,51,'Hủy',()=>{this.confirm=false;this.render();});
    this.action('dialog.delete',this.width/2+11,y+123,135,51,'Xác nhận xóa',()=>{
      this.confirm=false;
      void this.run(async owner=>{
        const result=await mailRepository.send(owner,{action:'deleteRead'});
        return `Đã xóa ${result.deleted??0} thư.`;
      });
    },'gold');
  }
}
