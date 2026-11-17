import type Phaser from 'phaser';
import {LobbyContent} from './LobbyContent';
import {rect,type ContentRect} from './lobbyContentLayout';
import {BATTLE_FONT,battleUiKey,battleUiFrame,type BattleUiArt} from './battleUiAssets';
import {sharedBackToLobby} from './sharedUi';

/** Texture-aware content bounds for the Battle kit. All coordinates are game-world pixels. */
export class BattleUi {
  readonly content:LobbyContent;
  constructor(private readonly scene:Phaser.Scene){
    this.content=new LobbyContent(scene,{fastFit:true,fontFamily:BATTLE_FONT,resolution:2,textPaddingY:1});
  }
  art(id:BattleUiArt,box:ContentRect){
    const image=this.scene.add.image(box.x+box.width/2,box.y+box.height/2,battleUiKey(id),battleUiFrame(this.scene,id));
    image.setScale(Math.min(box.width/image.width,box.height/image.height));return image;
  }
  label(id:string,box:ContentRect,text:string,size=22,color='#ffedb4'){
    return this.content.field(`battle.${id}`,box,text,{size,minSize:10,padding:1,align:'center',maxLines:1,color});
  }
  /** Stretch only the flat center of the footer, retaining source-scale dragon/banner corners. */
  footer(box:ContentRect){
    const texture=this.scene.textures.get(battleUiKey('footer')),scale=box.height/texture.get().height;
    return this.scene.add.nineslice(box.x+box.width/2,box.y+box.height/2,battleUiKey('footer'),undefined,
      box.width/scale,188,150,45,40,22).setScale(scale);
  }
  button(id:string,art:BattleUiArt,box:ContentRect,text:string,action:()=>void){
    if(/về\s*sảnh/i.test(text)){
      const button=sharedBackToLobby(this.scene,box,action);
      return{text:button.text,hit:button.background,image:button.background};
    }
    const image=this.art(art,box),b=image.getBounds();
    const textBox=id==='back'?rect(b.x+b.width*.23,b.y+b.height*.17,b.width*.66,b.height*.66):
      rect(b.x+b.width*.10,b.y+b.height*.18,b.width*.69,b.height*.64);
    const label=this.label(`button.${id}`,textBox,text,id==='back'?23:22);
    const hit=this.scene.add.zone(b.centerX,b.centerY,b.width,b.height).setInteractive({useHandCursor:true}).setName(`battle.${id}`);
    let pressed=false;
    hit.on('pointerdown',()=>{pressed=true;image.setTint(0xcaa36f);});
    hit.on('pointerover',()=>image.setTint(0xffe3a8));hit.on('pointerout',()=>{pressed=false;image.clearTint();});
    hit.on('pointerup',()=>{image.clearTint();if(pressed){pressed=false;action();}});
    return{text:label,hit,image};
  }
}
