import type Phaser from 'phaser';
import type {ContentRect} from './lobbyContentLayout';
export const UI_SPACE={xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,section:48} as const;
export const UI_FONT='GameUiVietnamese';
const ART={back:'assets/inventory/buttons/button_back.png',gold:'assets/ui/welfare_v21/buttons/button_primary_hd.png',
  red:'assets/ui/welfare_v21/buttons/button_secondary_hd.png'} as const;
export function loadSharedUi(scene:Phaser.Scene){
  for(const [id,path] of Object.entries(ART))if(!scene.textures.exists(`shared.${id}`))
    scene.load.image(`shared.${id}`,`${import.meta.env.BASE_URL}${path}`);
  if(![...document.fonts].some(f=>f.family===UI_FONT&&f.status==='loaded'))scene.load.font({key:UI_FONT,
    url:`${import.meta.env.BASE_URL}assets/fonts/NotoSerif-Bold-Vietnamese.woff2`,format:'woff2',descriptors:{weight:'700'}});
}
export function sharedButton(scene:Phaser.Scene,box:ContentRect,label:string,action?:()=>void,kind:keyof typeof ART='gold'){
  const key=`shared.${kind}`;
  // Isolated scene harnesses can omit Boot. Keep a usable, text-free fallback in that case.
  if(!scene.textures.exists(key)){
    const g=scene.make.graphics({},false);g.fillStyle(0x582b21).fillRoundedRect(1,1,238,67,10)
      .lineStyle(2,0xdbb45c).strokeRoundedRect(2,2,236,65,9);g.generateTexture(key,240,69);g.destroy();
  }
  const background=scene.add.image(box.x+box.width/2,box.y+box.height/2,key);
  background.setScale(Math.min(box.width/background.width,box.height/background.height));
  const text=scene.add.text(background.x,background.y,label,{fontFamily:UI_FONT,fontSize:18,fontStyle:'bold',
    color:kind==='gold'?'#4b281b':'#fff0c3',resolution:2,padding:{top:2,bottom:2}}).setOrigin(.5);
  for(let size=18;(text.width>background.displayWidth-28||text.height>background.displayHeight-12)&&size>11;)text.setFontSize(--size);
  if(kind==='back')background.setName('shared.back-to-lobby').setData('sharedBackToLobby',true);
  if(action){let pressed=false;background.setInteractive({useHandCursor:true});
    background.on('pointerdown',()=>{pressed=true;background.setTint(0xc5a077);});
    background.on('pointerover',()=>background.setTint(0xffe6b5));
    background.on('pointerout',()=>{pressed=false;background.clearTint();});
    background.on('pointerup',()=>{background.clearTint();if(pressed){pressed=false;action();}});
  }else{background.setTint(0x837766).setAlpha(.7);text.setAlpha(.7);}
  return{background,text};
}
export function sharedBackToLobby(scene:Phaser.Scene,box:ContentRect,action:()=>void){
  return sharedButton(scene,box,'← Về sảnh',action,'back');
}
