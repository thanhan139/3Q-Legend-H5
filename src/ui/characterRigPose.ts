import type {CharacterState} from './HeroAnimationController';
export interface RigPose{hipX:number;hipY:number;torso:number;head:number;nearLeg:number;nearKnee:number;farLeg:number;farKnee:number;
  nearArm:number;nearElbow:number;farArm:number;farElbow:number;weapon:number;cape:number;hair:number}
export const REST_POSE:RigPose={hipX:0,hipY:-49,torso:0,head:0,nearLeg:-9,nearKnee:13,farLeg:10,farKnee:4,
  nearArm:-18,nearElbow:-32,farArm:21,farElbow:-12,weapon:0,cape:0,hair:0};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export function mixPose(a:RigPose,b:RigPose,t:number):RigPose{
  const result={...a};for(const key of Object.keys(a) as (keyof RigPose)[])result[key]=a[key]+(b[key]-a[key])*t;return result;
}
/** Keyed articulated poses only. This module has no Battle Core or reward dependency. */
export function characterRigPose(hero:string,state:CharacterState,elapsed:number,duration=700,seed=0):RigPose{
  const p={...REST_POSE},t=clamp(elapsed/duration),breath=Math.sin((elapsed+seed)/2400*Math.PI*2);
  if(state==='idle'){
    p.hipX=breath*.25;p.hipY-=breath*.35;p.torso=breath*.8;p.head=-breath*.7;
    p.nearArm+=breath*1.2;p.farArm-=breath;p.cape=Math.sin((elapsed+seed-160)/2700*Math.PI*2)*2;
    p.hair=Math.sin((elapsed+seed-250)/2300*Math.PI*2)*2.5;return p;
  }
  if(state==='run'){
    const phase=elapsed/450*Math.PI*2,s=Math.sin(phase);
    p.torso=-9;p.hipY-=Math.abs(Math.cos(phase))*1.3;p.nearLeg=s*34;p.farLeg=-s*34;
    p.nearKnee=8+Math.max(0,-s)*64;p.farKnee=8+Math.max(0,s)*64;
    p.nearArm=-30-s*19;p.nearElbow=-32;p.farArm=20+s*28;p.farElbow=-26;
    p.cape=-10-Math.cos(phase)*4;p.hair=-8-Math.sin(phase-.4)*5;return p;
  }
  if(state==='ready')return mixPose(p,{...p,hipY:-47,torso:-7,nearLeg:-15,nearKnee:22,nearArm:10,nearElbow:-70,cape:-5},smooth(elapsed/120));
  if(state==='hit'||state==='criticalHit'){
    const force=state==='criticalHit'?1.5:1,hit=Math.sin(Math.PI*t)*force;
    p.torso=hit*15;p.head=hit*9;p.hipY+=hit*2;p.nearArm+=hit*16;p.farArm+=hit*12;
    p.nearKnee+=hit*14;p.cape=hit*8;return p;
  }
  if(state==='death'){
    const fall=smooth(elapsed/300);p.hipY+=fall*28;p.hipX+=fall*10;p.torso=fall*66;p.head=fall*20;
    p.nearLeg=-10-fall*48;p.nearKnee=13+fall*87;p.farLeg=10+fall*25;p.farKnee=4+fall*75;
    p.nearArm=-18+fall*60;p.nearElbow=-32+fall*50;p.farArm=21-fall*15;p.weapon=fall*80;p.cape=fall*32;return p;
  }
  if(state==='victory'){
    const a=smooth(elapsed/380);p.nearArm=-18-a*130;p.nearElbow=-32+a*40;p.head=-a*6;p.cape=-a*6;return p;
  }
  const skill=state==='skill'||state==='ultimate';
  const charge:RigPose={...p,hipY:-46,torso:8,nearLeg:-15,nearKnee:25,nearArm:32,nearElbow:-105,
    farArm:-36,farElbow:-32,weapon:-25,cape:8,hair:5};
  const strike:RigPose={...p,hipX:4,torso:-15,nearLeg:-21,nearKnee:25,farLeg:18,farKnee:12,
    nearArm:-82,nearElbow:2,farArm:26,farElbow:-65,weapon:hero==='liu-bei'?65:hero==='guan-yu'?100:85,cape:-15,hair:-10};
  if(skill){
    charge.nearArm=-148;charge.nearElbow=24;charge.farArm=-112;charge.farElbow=-15;charge.hipY=-45;
    strike.hipY=-46;strike.torso=-24;strike.nearArm=-25;strike.nearElbow=-20;strike.weapon=64;strike.cape=-24;
    if(hero==='zhao-yun'){charge.nearArm=38;charge.nearElbow=-95;strike.nearArm=-91;strike.nearElbow=3;strike.weapon=42;strike.hipX=8;}
    if(hero==='liu-bei'){charge.nearArm=-100;charge.farArm=95;charge.nearElbow=-55;charge.farElbow=55;
      strike.nearArm=-108;strike.farArm=107;strike.nearElbow=12;strike.farElbow=-12;strike.torso=0;strike.hipX=0;strike.weapon=-10;}
    if(hero==='zhang-fei'){strike.nearArm=-3;strike.nearElbow=-15;strike.hipY=-42;strike.nearKnee=38;strike.farKnee=27;strike.weapon=72;}
    if(hero==='dian-wei'){charge.nearArm=-150;charge.farArm=145;charge.nearElbow=18;charge.farElbow=-18;
      strike.nearArm=-35;strike.farArm=42;strike.nearElbow=-12;strike.farElbow=15;
      strike.hipY=-42;strike.nearKnee=38;strike.farKnee=30;strike.weapon=115;strike.torso=-18;}
  }else if(state==='attack2'){strike.nearArm=-118;strike.nearElbow=22;strike.weapon=-32;}
  // Blueprint's visual contact marker is 64%. No damage is emitted here.
  if(t<.30)return mixPose(p,charge,smooth(t/.30));
  if(t<.64)return mixPose(charge,strike,smooth((t-.30)/.34));
  return mixPose(strike,p,smooth((t-.64)/.36));
}
