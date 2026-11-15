import { STATUS_ART, ULTIMATE_KIT_VFX } from './ultimateKitVfx';
import { SignatureConfig } from './signatureConfig';
const dragon = 'azure_dragon';
const earth = 'fire_earth';
const light = 'healing_defense';
const dark = 'dark_control';

export const SKILL_VFX_ROOT = 'assets/battle/effects/skill_vfx_expansion/isolated';
export const SHIELD_VFX = `${light}-03`;
export const ATTACK_BUFF_VFX = `${light}-05`;
export const CRIT_BUFF_VFX = `${light}-06`;
export const HEAL_VFX = `${light}-07`;

export interface SkillEffect {
  cast: string;
  impact: string;
  travel?: string;
  icon?: string;
  cutin?: string;
  color: number;
}

const LEGACY_EFFECTS: Readonly<Record<string, SkillEffect>> = {
  ...Object.fromEntries(Object.values(SignatureConfig).map(({ hero, color, cast, impact }) => [
    `${hero}:ultimate:signature`, { cast, impact, color },
  ])),
  'pan-feng:ultimate': { cast: `${earth}-07`, impact: `${earth}-08`, color: 0xffc773 },
  'xing-dao-rong:ultimate': { cast: `${earth}-03`, impact: `${earth}-05`, color: 0xff946a },
  'cheng-yuan-zhi:ultimate': { cast: `${dragon}-07`, impact: `${dragon}-02`, color: 0xffcd70 },
  'pei-yuan-shao:ultimate': { cast: `${dragon}-08`, impact: `${dragon}-10`, color: 0xe6ff9d },
  'guan-ping:ultimate': { cast: `${dragon}-03`, impact: `${dragon}-12`, color: 0xa1ff9d },
  'zhou-cang:ultimate': { cast: `${earth}-04`, impact: `${earth}-02`, color: 0xa1d979 },
  'cao-hong:ultimate': { cast: `${earth}-07`, impact: `${earth}-05`, color: 0xc0bbff },
  'lu-bu:ultimate': { cast: `${earth}-09`, impact: `${earth}-10`, color: 0xff6b52 },
  'zhuge-liang:ultimate': { cast: `${dark}-02`, impact: `${light}-09`, color: 0x8bf5df },
  'guan-yu:ultimate': { cast: `${dragon}-05`, impact: `${dragon}-06`, color: 0x61ffdc },
  'zhao-yun:ultimate': { cast: `${dragon}-03`, impact: `${dragon}-12`, color: 0x91dfff },
  'ma-chao:ultimate': { cast: `${dragon}-08`, impact: `${dragon}-10`, color: 0x8dfff2 },
  'zhang-fei:ultimate': { cast: `${earth}-12`, impact: `${earth}-01`, color: 0xffaa4c },
  'hua-xiong:ultimate': { cast: `${earth}-07`, impact: `${earth}-08`, color: 0xff9a58 },
  'dian-wei:ultimate': { cast: `${earth}-03`, impact: `${earth}-05`, color: 0xffc773 },
  'xiahou-dun:ultimate': { cast: `${earth}-04`, impact: `${earth}-02`, color: 0xff946a },
  'liu-bei:ultimate': { cast: `${light}-02`, impact: `${light}-01`, color: 0xbbffb2 },
  'da-qiao:ultimate': { cast: `${light}-11`, impact: `${light}-07`, color: 0xb7ffe3 },
  'sun-quan:ultimate': { cast: `${light}-04`, impact: `${light}-08`, color: 0xffe395 },
  'diao-chan:ultimate': { cast: `${dark}-05`, impact: `${dark}-09`, color: 0xe896ff },
  'cao-cao:ultimate': { cast: `${dark}-01`, impact: `${dark}-03`, color: 0xb590ff },
  'huang-yueying:ultimate': { cast: `${dark}-12`, impact: `${dark}-04`, color: 0xe2adff },
  'gan-ning:ultimate': { cast: `${dragon}-07`, impact: `${dragon}-02`, color: 0x9ddfff },
};

export const SKILL_EFFECTS: Readonly<Record<string, SkillEffect>> = {
  ...LEGACY_EFFECTS,
  ...Object.fromEntries(Object.entries(ULTIMATE_KIT_VFX).map(([id, effect]) => [
    id, { ...LEGACY_EFFECTS[id], ...effect },
  ])),
  ...Object.fromEntries(Object.values(SignatureConfig).map(({ hero }) => {
    const id = `${hero}:ultimate:signature`;
    const aligned = ULTIMATE_KIT_VFX[`${hero}:ultimate` as keyof typeof ULTIMATE_KIT_VFX];
    return [id, { ...aligned, ...LEGACY_EFFECTS[id] }];
  })),
};

export const SKILL_TEXTURES = new Set([
  ...Object.values(SKILL_EFFECTS).flatMap(effect => [effect.cast, effect.impact, ...(effect.travel ? [effect.travel] : []), ...(effect.icon ? [effect.icon] : []), ...(effect.cutin ? [effect.cutin] : [])]),
  ...Object.values(STATUS_ART), SHIELD_VFX, ATTACK_BUFF_VFX, CRIT_BUFF_VFX, HEAL_VFX,
]);
export const skillTextureKey = (id: string) => `skill-vfx-${id}`;
export const skillTexturePath = (id: string) => `${id.startsWith('assets/') ? id : SKILL_VFX_ROOT + '/' + id}.png`;
