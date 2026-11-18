import type {UiScene} from './UiScene';
import {sharedButton,UI_FONT} from './sharedUi';
export function heroLabel(scene:UiScene,x:number,y:number,value:string,size=17,width=296,height=44,color='#ffe7b4'){
 const text=scene.text(x,y,value,size,color,{fontFamily:UI_FONT,fontStyle:'bold',resolution:2,align:'center',wordWrap:{width},padding:{top:3,bottom:3}}).setOrigin(.5);
 while((text.width>width||text.height>height)&&size>11)text.setFontSize(--size);
 return text;
}
export function heroAction(scene:UiScene,x:number,y:number,label:string,action:()=>void,enabled=true,width=298){
 return sharedButton(scene,{x:x-width/2,y:y-23,width,height:46},label,enabled?action:undefined,'red').background;
}
