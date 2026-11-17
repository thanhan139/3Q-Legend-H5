import Phaser from 'phaser';
import {INVENTORY_CATEGORY_CONFIG as assets} from './inventoryCategoryConfig';
import {inventoryCategoryLayout} from './inventoryCategoryLayout';
const KEY='InventoryCategoryPopup';
export function openInventoryMenu(owner:Phaser.Scene,_anchor:{x:number;y:number},open:()=>void,closed:()=>void,navigate?:(scene:string)=>void){
 let disposed=false;
 const close=()=>{if(disposed)return;disposed=true;owner.scene.remove(KEY);requestAnimationFrame(closed);};
 class Popup extends Phaser.Scene{
  private root!:Phaser.GameObjects.Container;private content!:Phaser.GameObjects.Container;
  private offset=0;private max=0;private start=0;private dragged=false;
  constructor(){super(KEY);}
  preload(){for(const c of assets)if(!this.textures.exists('inventory.category.'+c.id))this.load.image('inventory.category.'+c.id,import.meta.env.BASE_URL+'assets/inventory/categories/'+c.file);
   if(![...document.fonts].some(face=>face.family==='InventoryMenu'&&face.status==='loaded'))this.load.font({key:'InventoryMenu',url:import.meta.env.BASE_URL+'assets/fonts/NotoSerif-Bold-Vietnamese.woff2',format:'woff2'});}
  create(){
   if(disposed)return;this.input.setTopOnly(true);this.draw();
   this.input.keyboard?.on('keydown-ESC',close);
   const resize=()=>{if(disposed||!this.sys.displayList)return;this.tweens.killAll();this.children.removeAll(true);this.draw();};this.scale.on('resize',resize);
   const cleanup=()=>{this.scale.off('resize',resize);this.tweens.killAll();};this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
   this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.start=p.x;this.dragged=false;});
   this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(!p.isDown||!this.max)return;const dx=(p.x-p.prevPosition.x)*this.game.canvas.getBoundingClientRect().width/this.scale.width;
    if(Math.abs(p.x-this.start)>6)this.dragged=true;if(this.dragged){this.offset=Phaser.Math.Clamp(this.offset-dx,0,this.max);this.content.x=-this.offset;}});
   this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>{this.offset=Phaser.Math.Clamp(this.offset+dy,0,this.max);this.content.x=-this.offset;});
  }
  private draw(){
   const canvas=this.game.canvas.getBoundingClientRect(),ratio=canvas.width/this.scale.width,w=canvas.width,h=canvas.height,l=inventoryCategoryLayout(w,h);
   this.root=this.add.container(0,0).setScale(1/ratio);this.root.setName('inventory.category.root');
   const add=(o:Phaser.GameObjects.GameObject)=>{this.root.add(o);return o;};
   add(this.add.rectangle(w/2,h/2,w,h,0x08040d,.44));
   const dim=this.add.zone(w/2,h/2,w,h).setInteractive();add(dim);dim.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();close();});
   const panel=this.add.graphics().fillStyle(0x21121e,.94).fillRoundedRect(l.x,l.y,l.width,l.height,22).lineStyle(1,0xc99348,.65).strokeRoundedRect(l.x,l.y,l.width,l.height,22);add(panel);
   const shield=this.add.zone(w/2,l.y+l.height/2,l.width,l.height).setInteractive();add(shield);shield.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
   const text=(x:number,y:number,value:string,size:number)=>this.add.text(x,y,value,{fontFamily:'InventoryMenu, Georgia, serif',fontSize:size,color:'#f6dfae',align:'center',padding:{top:3,bottom:3},shadow:{offsetX:0,offsetY:2,color:'#100609',blur:3,fill:true}}).setOrigin(.5);
   add(text(w/2,l.y+25,'Túi Đồ',21));
   const exit=text(l.x+l.width-28,l.y+25,'×',28);add(exit);const xhit=this.add.zone(exit.x,exit.y,44,44).setInteractive({useHandCursor:true}).setName('inventory.category.close');add(xhit);xhit.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();close();});
   const notice=text(w/2,l.y+l.height-20,l.mobile?'Vuốt ngang để xem các danh mục':'Chọn danh mục để tiếp tục',13);add(notice);
   this.content=this.add.container(0,0);add(this.content);this.max=Math.max(0,l.content-l.viewport);this.offset=Phaser.Math.Clamp(this.offset,0,this.max);this.content.x=-this.offset;
   const mask=this.add.graphics().fillStyle(0xffffff).fillRect((l.x+14)/ratio,(l.top-8)/ratio,(l.width-28)/ratio,(l.y+l.height-30-(l.top-8))/ratio).setVisible(false);
   this.content.setMask(mask.createGeometryMask());
   const rowWidth=7*l.pitch,left=l.mobile?l.x+16:(w-rowWidth)/2;
   const glow=this.add.ellipse(0,0,90,40,0xffc75c,.17).setVisible(false);this.content.add(glow);
   for(const [i,c] of assets.entries()){
    const row=i<7?0:1,col=i<7?i:i-7,cx=left+(col+.5+(row?.5:0))*l.pitch,cy=l.top+row*l.row+l.icon/2;
    const b=c.bounds,s=l.icon/Math.max(b[2]-b[0],b[3]-b[1]);
    const icon=this.add.image(cx-( (b[0]+b[2])/2-160)*s,cy-((b[1]+b[3])/2-160)*s,'inventory.category.'+c.id).setScale(s);
    const label=c.id==='trang_bi_quan_su'?'Trang Bị\nQuân Sư':l.mobile&&c.id==='dien_vo_lenh'?'Điện Võ\nLệnh':l.mobile&&c.id==='tui_da_quy'?'Túi Đá\nQuý':c.label_vi;
    const name=text(cx,cy+l.icon/2+5,label,l.mobile?14:16).setOrigin(.5,0);
    const hit=this.add.zone(cx,cy+18,l.pitch-6,l.row-4).setInteractive({useHandCursor:true}).setName('inventory.category.'+c.id);
    this.content.add([icon,name,hit]);
    const animate=(scale:number,light:boolean)=>{this.tweens.killTweensOf(icon);this.tweens.add({targets:icon,scale:s*scale,duration:140,ease:'Sine.Out'});if(light)icon.setTint(0xffefca);else icon.clearTint();};
    hit.on('pointerover',()=>animate(1.05,true));hit.on('pointerout',()=>animate(1,false));hit.on('pointerdown',()=>animate(.96,true));
    hit.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();animate(1,false);if(this.dragged)return;const px=(_p as Phaser.Input.Pointer).x*ratio,py=(_p as Phaser.Input.Pointer).y*ratio;if(px<l.x+14||px>l.x+l.width-14||py<l.top-8||py>l.y+l.height-30){close();return;}
     for(const item of this.content.list)if(item.type==='Text')(item as Phaser.GameObjects.Text).setColor('#f6dfae');
     glow.setPosition(cx,cy+l.icon*.38).setVisible(true);name.setColor('#ffe392');
     if(c.destination==='Inventory'){close();open();}else if(c.destination&&navigate){close();navigate(c.destination);}else notice.setText('Tính năng đang phát triển');
    });
   }
   this.root.setAlpha(0);this.tweens.add({targets:this.root,alpha:1,duration:160});
  }
 }
 owner.scene.add(KEY,new Popup(),true);return close;
}
