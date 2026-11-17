import type Phaser from 'phaser';
import {REMASTER_RIGS,RIG_PARTS,rigTexture} from '../data/characterRemaster';
export function loadRemasterAssets(scene:Phaser.Scene){
  for(const spec of Object.values(REMASTER_RIGS))if(!scene.textures.exists(rigTexture(spec.heroId)))
    scene.load.image(rigTexture(spec.heroId),`${import.meta.env.BASE_URL}${spec.texture}`);
}
export function registerRigFrames(scene:Phaser.Scene,id:string){
  const spec=REMASTER_RIGS[id],texture=scene.textures.get(rigTexture(id));
  for(const part of RIG_PARTS)if(!texture.has(part)){
    const [x,y,width,height]=spec.frames[part];texture.add(part,0,x,y,width,height);
  }
}
