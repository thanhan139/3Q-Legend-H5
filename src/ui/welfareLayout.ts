import {rect} from './lobbyContentLayout';
import {UI_SPACE as S} from './sharedUi';
export function welfareLayout(width:number,height:number){
  const margin=S.xl,gap=S.xl,top=120,bottom=height-S.xl;
  const sideWidth=Math.min(280,Math.max(224,width*.185));
  const hostWidth=Math.min(440,Math.max(360,width*.30));
  const sidebar=rect(margin,top,sideWidth,bottom-top);
  const host=rect(sidebar.x+sidebar.width+gap,top,hostWidth,bottom-top);
  const panel=rect(host.x+host.width+gap,top,width-margin-(host.x+host.width+gap),bottom-top);
  const body=rect(panel.x+S.xl,panel.y+100,panel.width-S.section,panel.height-124);
  const cardWidth=(body.width-3*S.md)/4,cardHeight=(body.height-S.lg)/2;
  const days=Array.from({length:7},(_,i)=>{
    const row=i<4?0:1,column=i<4?i:i-4,offset=row?(cardWidth+S.md)/2:0;
    return rect(body.x+offset+column*(cardWidth+S.md),body.y+row*(cardHeight+S.lg),cardWidth,cardHeight);
  });
  return{sidebar,host,panel,body,days,back:rect(width-margin-204,28,204,56),title:rect(margin,24,440,70),
    tabs:Array.from({length:6},(_,i)=>rect(sidebar.x+S.md,sidebar.y+S.xl+i*76,sidebar.width-2*S.md,60)),
    hostess:rect(host.x+2,Math.max(top, height/2-222),host.width-4,444)};
}
