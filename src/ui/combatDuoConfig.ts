import config from '../data/combatDuoManifest.json';
import {heroFamily,HERO_BY_ID} from '../data/heroes';
import {RAGE_CONFIG} from '../data/rageConfig';
import type {BattleEvent} from '../domain/battle';
import type {CharacterClipSet} from './HeroAnimationController';
export const DUO_ALIASES:Record<string,keyof typeof config.actor_animations>={'lu-bu':'lu_bo','diao-chan':'dieu_thuyen'};
export const duoSlug=(id:string)=>DUO_ALIASES[heroFamily(id)];
export const duoActor=(id:string)=>config.actor_animations[duoSlug(id)];
export const duoActorKey=(id:string)=>'combat.duo.actor.'+id;
export function duoClips(id:string):CharacterClipSet|undefined{
 const a=duoActor(id);if(!a)return;const clips:CharacterClipSet={};
 for(const [name,frames] of Object.entries(a.states))clips[name as keyof CharacterClipSet]={start:frames[0],end:frames[frames.length-1],frameRate:a.baseFPS[name as keyof typeof a.baseFPS],contactFrame:name==='attack'?10:frames[frames.length-1]};
 clips.ultimate=clips.skill;return clips;
}
export function isDuoSkillCast(event:BattleEvent,id:string){return Boolean(duoActor(id)&&event.kind==='action'&&event.actionType==='skill'&&event.skill===true&&
 (event.rageBefore??0)>=RAGE_CONFIG.skillThreshold&&event.skillId?.replace(/:signature$/,'')===HERO_BY_ID[id]?.ultimateSkillId);}
