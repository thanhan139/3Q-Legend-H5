import Phaser from 'phaser';
import {remasterFor,rigTexture,type RigPart} from '../data/characterRemaster';
import {registerRigFrames} from './remasterAssets';
import type {RigPose} from './characterRigPose';
import {solveArm} from './characterRigIK';

type Bone={node:Phaser.GameObjects.Container;length:number};
const rad=(degrees:number)=>degrees*Math.PI/180;
/** Articulated cutout puppet. Limbs are separate textures rotating about actual joints. */
export class BattleCharacterRig extends Phaser.GameObjects.Container {
  readonly pipeline='layered-rig';
  readonly heroId:string;
  flipX=false;
  private parts:Phaser.GameObjects.Image[]=[];
  private torsoNode:Phaser.GameObjects.Container;
  private head:Phaser.GameObjects.Image;
  private headHit:Phaser.GameObjects.Image;
  private cape:Phaser.GameObjects.Image;
  private hair:Phaser.GameObjects.Image;
  private skirt:Phaser.GameObjects.Image;
  private accessory?:Phaser.GameObjects.Image;
  private weapon:Phaser.GameObjects.Image;
  private weaponFar?:Phaser.GameObjects.Image;
  private upperNear:Bone;private foreNear:Bone;private upperFar:Bone;private foreFar:Bone;
  private thighNear:Bone;private shinNear:Bone;private thighFar:Bone;private shinFar:Bone;
  constructor(scene:Phaser.Scene,id:string,facingLeft:boolean){
    super(scene,0,0);this.heroId=remasterFor(id).heroId;registerRigFrames(scene,this.heroId);
    this.setName(`rig.${id}`).setData('remasterRig',true);scene.add.existing(this);
    const image=(part:RigPart,height:number,originX=.5,originY=0)=>{
      const art=scene.add.image(0,0,rigTexture(id),part).setOrigin(originX,originY);
      art.setScale(height/art.height);this.parts.push(art);return art;
    };
    const limb=(part:RigPart,length:number,top:[number,number],bottom:[number,number]):Bone=>{
      const art=image(part,1),width=art.width,height=art.height;
      const tx=width*top[0],ty=height*top[1],vx=width*(bottom[0]-top[0]),vy=height*(bottom[1]-top[1]);
      const angle=Math.atan2(vx,vy),scale=length/Math.hypot(vx,vy);
      art.setOrigin(0,0).setScale(scale).setRotation(angle);
      art.setPosition((-tx*Math.cos(angle)+ty*Math.sin(angle))*scale,(-tx*Math.sin(angle)-ty*Math.cos(angle))*scale);
      return{node:scene.add.container(0,0,[art]),length};
    };
    this.cape=image('cape',77);this.hair=image('hair',31);
    this.thighFar=limb('thighFar',25,[.5,.10],[.52,.90]);
    this.shinFar=limb('shinFar',24,[.40,.18],[.55,.94]);this.shinFar.node.y=25;this.thighFar.node.add(this.shinFar.node);
    this.thighNear=limb('thighNear',25,[.5,.10],[.52,.90]);
    this.shinNear=limb('shinNear',24,[.40,.18],[.55,.94]);this.shinNear.node.y=25;this.thighNear.node.add(this.shinNear.node);
    this.upperFar=limb('upperFar',20,[.5,.30],[.53,.90]);
    this.foreFar=limb('foreFar',19,[.32,.08],[.78,.86]);this.foreFar.node.y=20;this.upperFar.node.add(this.foreFar.node);
    this.upperNear=limb('upperNear',20,[.5,.30],[.53,.90]);
    this.foreNear=limb('foreNear',19,[.32,.08],[.78,.86]);this.foreNear.node.y=20;this.upperNear.node.add(this.foreNear.node);
    const torso=image('torso',42);torso.y=-41;
    this.head=image('head',20,.5,.97);this.head.setPosition(1,-40);
    this.headHit=image('headHit',20,.5,.97).setVisible(false);this.headHit.setPosition(1,-40);
    this.skirt=image('skirt',25);this.skirt.y=-2;
    const dual=this.heroId==='liu-bei'||this.heroId==='dian-wei';
    this.weapon=image('weapon',dual?44:84,this.heroId==='guan-yu'?.38:.5,dual?.80:.60);this.weapon.y=19;
    this.foreNear.node.add(this.weapon);
    if(dual){
      this.weaponFar=image('accessory',44,.5,.80);this.weaponFar.y=19;this.foreFar.node.add(this.weaponFar);
    }else if(this.heroId==='guan-yu'||this.heroId==='zhang-fei'){
      this.accessory=image('accessory',this.heroId==='guan-yu'?28:17,.5,.03);this.accessory.setPosition(4,-41);
    }
    this.torsoNode=scene.add.container(0,0,[torso,this.upperFar.node,this.skirt,this.head,this.headHit]);
    if(this.accessory)this.torsoNode.add(this.accessory);
    this.torsoNode.add(this.upperNear.node);
    this.add([this.cape,this.hair,this.thighFar.node,this.thighNear.node,this.torsoNode]);
    this.setFlipX(facingLeft);
  }
  setFlipX(value:boolean){this.flipX=value;this.scaleX=value?-1:1;return this;}
  setTintFill(color:number){for(const part of this.parts)part.setTintFill(color);return this;}
  clearTint(){for(const part of this.parts)part.clearTint();return this;}
  applyPose(p:RigPose,hit=false){
    // -8px keeps soles clear of the approved nameplate, without moving any HUD.
    const hipY=p.hipY-8;
    this.torsoNode.setPosition(p.hipX,hipY).setRotation(rad(p.torso));
    this.head.setRotation(rad(p.head)).setVisible(!hit);this.headHit.setRotation(rad(p.head)).setVisible(hit);
    const torsoAngle=rad(p.torso),headAngle=rad(p.head);
    const attach=(x:number,y:number)=>({x:p.hipX+x*Math.cos(torsoAngle)-y*Math.sin(torsoAngle),
      y:hipY+x*Math.sin(torsoAngle)+y*Math.cos(torsoAngle)});
    const cloak=attach(-5,-38),hair=attach(1-7*Math.cos(headAngle)+10*Math.sin(headAngle),-40-7*Math.sin(headAngle)-10*Math.cos(headAngle));
    this.cape.setPosition(cloak.x,cloak.y).setRotation(rad(p.cape+p.torso));
    this.hair.setPosition(hair.x,hair.y).setRotation(rad(p.hair+p.head+p.torso));
    this.hair.setOrigin(.77,.20);
    this.skirt.setRotation(rad(-p.torso*.35));
    this.upperNear.node.setPosition(this.heroId==='zhang-fei'?13:11,-35).setRotation(rad(p.nearArm));
    this.foreNear.node.setRotation(rad(p.nearElbow));
    this.upperFar.node.setPosition(-11,-36).setRotation(rad(p.farArm));this.foreFar.node.setRotation(rad(p.farElbow));
    if(['zhao-yun','guan-yu','zhang-fei'].includes(this.heroId)){
      // Both gripping hands follow one polearm. Targets stay inside both arm reaches.
      // Body/hips still supply anticipation and weight; the root never fabricates limb motion.
      const a=rad(p.nearArm),b=rad(p.nearArm+p.nearElbow),blade=rad(p.weapon-p.torso);
      const cx=Math.max(-5,Math.min(12,11-Math.sin(a)*20-Math.sin(b)*19));
      const cy=Math.max(-52,Math.min(-12,-35+Math.cos(a)*20+Math.cos(b)*19));
      const dx=-Math.sin(blade)*7,dy=Math.cos(blade)*7;
      const near=solveArm(cx+dx-this.upperNear.node.x,cy+dy+35,20,19,-1);
      const far=solveArm(cx-dx+11,cy-dy+36,20,19,1);
      this.upperNear.node.setAngle(near.shoulder);this.foreNear.node.setAngle(near.elbow);
      this.upperFar.node.setAngle(far.shoulder);this.foreFar.node.setAngle(far.elbow);
    }
    this.thighNear.node.setPosition(p.hipX+6,hipY).setRotation(rad(p.nearLeg));this.shinNear.node.setRotation(rad(p.nearKnee));
    this.thighFar.node.setPosition(p.hipX-6,hipY).setRotation(rad(p.farLeg));this.shinFar.node.setRotation(rad(p.farKnee));
    // Weapon is attached to the hand's joint, not a separately travelling illustration.
    this.weapon.setRotation(rad(-this.upperNear.node.angle-this.foreNear.node.angle-p.torso+p.weapon));
    this.weaponFar?.setRotation(rad(-this.upperFar.node.angle-this.foreFar.node.angle-p.torso-p.weapon-12));
  }
  socket(name:'hand'|'weaponTip'|'chest'|'head'){
    if(name==='weaponTip'){
      const p=this.weapon.getWorldTransformMatrix().transformPoint((.5-this.weapon.originX)*this.weapon.width,-this.weapon.originY*this.weapon.height);
      return{x:p.x,y:p.y};
    }
    const node=name==='hand'?this.foreNear.node:this.torsoNode;
    const p=node.getWorldTransformMatrix().transformPoint(name==='head'?1:0,name==='hand'?19:name==='head'?-51:-25);
    return{x:p.x,y:p.y};
  }
  jointSnapshot(){
    const point=(node:Phaser.GameObjects.Container,x=0,y=0)=>{const p=node.getWorldTransformMatrix().transformPoint(x,y);return{x:p.x,y:p.y};};
    return{nearKnee:point(this.shinNear.node),farKnee:point(this.shinFar.node),
      nearFoot:point(this.shinNear.node,0,24),farFoot:point(this.shinFar.node,0,24),
      hand:this.socket('hand'),weaponTip:this.socket('weaponTip'),chest:this.socket('chest'),head:this.socket('head'),
      angles:{nearLeg:this.thighNear.node.angle,nearKnee:this.shinNear.node.angle,
        farLeg:this.thighFar.node.angle,farKnee:this.shinFar.node.angle,arm:this.upperNear.node.angle,elbow:this.foreNear.node.angle}};
  }
}
