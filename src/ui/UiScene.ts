import { playCommand } from '../cloud/cloudRepository';
import type { GameCommand } from '../cloud/gameProtocol';
import Phaser from 'phaser';
import { PALETTE } from './theme';
import { registerTutorialTarget, type TutorialTarget } from './tutorialTargets';

export abstract class UiScene extends Phaser.Scene {
  constructor(key:string){super(key);}
  tutorialTarget(id: string, target?: TutorialTarget) { registerTutorialTarget(this, id, target); }

  text(x:number,y:number,value:string,size=22,color='#fff5dc',options:Partial<Phaser.Types.GameObjects.Text.TextStyle>={}) {
    return this.add.text(x,y,value,{fontFamily:'Arial, sans-serif',fontSize:`${size}px`,color,...options});
  }
  panel(x:number,y:number,w:number,h:number,color:number=PALETTE.panel,alpha=0.94){
    const g=this.add.graphics();g.fillStyle(color,alpha);g.fillRoundedRect(x,y,w,h,14);
    g.lineStyle(2,0xf4d28a,0.19);g.strokeRoundedRect(x,y,w,h,14);
    return g;
  }
  button(x:number,y:number,w:number,h:number,label:string,fn:()=>void,accent:number=PALETTE.gold,enabled=true,dark=false){
    const background=this.add.rectangle(x,y,w,h,enabled?accent:0x45516a,1)
      .setStrokeStyle(2,0xffffff,enabled?(dark?0.48:0.24):0.08);
    const text=this.text(x,y,label,Math.min(21,Math.max(14,Math.floor(w/Math.max(label.length,9)*1.65))),enabled?(dark?'#fff1cf':'#202238'):'#acb6c5',
      {fontStyle:'bold',align:'center'}).setOrigin(0.5);
    if(enabled){
      background.setInteractive({useHandCursor:true});
      let pressed = false;
      const hover = dark ? 0x694936 : 0xffe3a2;
      background.on('pointerover',()=>background.setFillStyle(hover));
      background.on('pointerout',()=>{
        pressed = false;
        background.setFillStyle(accent).setScale(1);
      });
      background.on('pointerdown',()=>{
        pressed = true;
        background.setScale(0.97).setFillStyle(dark ? 0x513223 : 0xf5c977);
      });
      background.on('pointerup',()=>{
        background.setScale(1).setFillStyle(hover);
        if (!pressed) return;
        pressed = false;
        fn();
      });
    }
    return {background,text};
  }
  private changingSave = false;

  protected async saveAction<T>(command: GameCommand, offline: () => T, apply: (value: T) => void) {
    if (this.changingSave) return;
    this.changingSave = true;
    let active = true;
    const stop = () => { active = false; this.changingSave = false; };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
    try {
      const result = await playCommand(command, offline);
      if (active) apply(result);
    } catch (error) {
      if (active) this.toast(error instanceof Error ? error.message : 'Không thể lưu tiến trình.');
    } finally {
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, stop);
      if (active) this.changingSave = false;
    }
  }

  private navigating = false;

  go(key: string, data?: object) {
    const camera = this.cameras.main;
    if (this.navigating) return;
    this.navigating = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.navigating = false; });
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
    camera.fadeOut(150, 17, 14, 20);
  }

  background(title:string,subtitle?:string){
    this.cameras.main.fadeIn(180, 17, 14, 20);
    const g=this.add.graphics();
    g.fillGradientStyle(0x233a5a,0x233a5a,0x111a32,0x111a32,1);
    g.fillRect(0,0,1280,720);
    // Layered stylized mountains & floating dust, no external sprite dependencies.
    g.fillStyle(0x38506b,0.43);g.fillTriangle(0,420,390,136,700,420);g.fillTriangle(480,420,950,172,1280,420);
    g.fillStyle(0x243855,0.88);g.fillTriangle(0,515,270,300,660,515);g.fillTriangle(420,515,890,295,1280,515);
    g.fillStyle(0x16263f,1);g.fillRect(0,555,1280,165);
    g.lineStyle(3,PALETTE.gold,0.27);g.lineBetween(20,101,1260,101);
    this.text(36,28,title,43,'#f5c86a',{fontStyle:'bold'});
    if(subtitle)this.text(38,77,subtitle,16,'#c3cadc');
  }
  headerBack(title:string,description=''){
    this.background(title,description);
    this.button(1150,57,186,52,'← Về sảnh',()=>this.go('Lobby'),PALETTE.gold);
  }
  toast(msg:string,color='#f6da9a'){
    const t=this.text(640,648,msg,21,color,{backgroundColor:'#122035',padding:{x:18,y:12},align:'center'}).setOrigin(0.5).setDepth(100);
    this.tweens.add({targets:t,alpha:0,y:628,duration:2600,delay:900,onComplete:()=>t.destroy()});
  }
  heroAvatar(x:number,y:number,color:number,scale=1){
    const g=this.add.graphics();
    g.fillStyle(0x040d20,0.21);g.fillEllipse(x,y+60*scale,96*scale,23*scale);
    g.fillStyle(color,1);g.fillTriangle(x-30*scale,y+39*scale,x+30*scale,y+39*scale,x,y-26*scale);
    g.fillStyle(0xffdfb3,1);g.fillCircle(x,y-40*scale,20*scale);
    g.fillStyle(0xf2c66a,1);g.fillTriangle(x-28*scale,y-49*scale,x,y-80*scale,x+28*scale,y-49*scale);
    g.fillStyle(0x283251,0.95);g.fillRect(x-8*scale,y-43*scale,5*scale,4*scale);g.fillRect(x+7*scale,y-43*scale,5*scale,4*scale);
    return g;
  }
}
