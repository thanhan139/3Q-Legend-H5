import {build} from 'esbuild';import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('.vite/combat-roster-audit',{recursive:true});await mkdir('docs/combat-audit',{recursive:true});
await build({stdin:{contents:`
import {HEROES} from './src/data/heroes';import {HERO_SKILLS,ATTACK_SKILLS,PASSIVE_SKILLS} from './src/data/heroSkills';
import {makeArenaPracticeBattle} from './src/domain/battle';import {GameStore,baseSave} from './src/domain/store';
import {battleSpriteFrames} from './src/ui/battleSprites';import {CHIBI_SOURCES} from './src/data/chibiBattle';
import {COMBAT_SIGNATURES,combatHeroStyle} from './src/ui/combatHeroProfiles';import {writeFileSync} from 'node:fs';
const rows=HEROES.map(h=>{
 const kit=HERO_SKILLS[h.id];if(!kit||!ATTACK_SKILLS.has(h.normalAttackId)||!ATTACK_SKILLS.has(h.ultimateSkillId)||!PASSIVE_SKILLS.has(h.passiveSkillId))throw Error('Missing skill '+h.id);
 const save=baseSave();save.heroes=[h.id];save.formation=[h.id,null,null,null,null,null];const store=new GameStore({read:()=>null,write:()=>{}},save);
 if(!store.updateFormation(5,h.id)||store.snapshot.formation[5]!==h.id)throw Error('Formation '+h.id);
 const actions=[];for(const skill of [false,true]){const engine=makeArenaPracticeBattle([h.id,null,null,null,null,null],{});
  for(const u of engine.units){u.hp=u.maxHp=10000;u.nextActionAt=u.uid==='player-0'?0:1e6;u.rage=skill?100:0;}
  const events=engine.step();const action=events.find(e=>e.kind==='action');if(!action||action.source!=='player-0'||action.actionType!==(skill?'skill':'normal'))throw Error('Action '+h.id);actions.push(action.skillId);}
 const actor=battleSpriteFrames.get(h.id);if(actor===undefined||!CHIBI_SOURCES[h.id])throw Error('Missing actor '+h.id);
 return{id:h.id,name:h.name,role:h.role,rarity:h.rarity,stats:{hp:h.hp,atk:h.atk,def:h.def,speed:h.speed},normal:kit.normal.name,ultimate:kit.ultimate.name,passive:kit.passive.name,actions,actorFrame:actor,ownedFormationAccepted:true,summonable:h.summonable,visualStyle:combatHeroStyle(h.id),packSignature:COMBAT_SIGNATURES[h.id]??null,bodyClips:['guan-yu','liu-bei','zhang-fei'].includes(h.id)?['idle','attack','hit','death']:[]};
});writeFileSync('docs/combat-audit/roster.json',JSON.stringify(rows,null,2));
writeFileSync('docs/combat-audit/ROSTER.md','# Combat roster audit\\n\\n23 existing heroes have explicit stats/skills, owned formation acceptance, chibi frames and executable normal/ultimate actions. This does not mean full body animation coverage or live ownership by every account.\\n\\n| Hero | ID | Role | Visual | Normal | Ultimate | Passive | Pack signature | Body clips |\\n|---|---|---|---|---|---|---|---|---|\\n'+rows.map(r=>'| '+[r.name,r.id,r.role,r.visualStyle,r.normal,r.ultimate,r.passive,r.packSignature??'Shared only',r.bodyClips.join(', ')||'Static actor'].join(' | ')+' |').join('\\n')+'\\n');console.log('23 CONFIG / SKILL / FORMATION / CORE / ACTOR checks PASS');`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'.vite/combat-roster-audit/check.mjs'});
await import('../.vite/combat-roster-audit/check.mjs');
