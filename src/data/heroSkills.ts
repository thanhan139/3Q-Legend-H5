import { COMBAT_BALANCE } from './skillCombat';
import { RAGE_CONFIG } from './rageConfig';

export type Target = 'single' | 'front' | 'all' | 'column' | 'weakest' | 'party' | 'self';
export const TARGET_LABEL: Record<Target, string> = {
  single: '1 địch ưu tiên hàng trước', front: 'hàng trước địch (hoặc hàng sau nếu hàng trước đã gục)',
  all: 'toàn bộ địch', column: 'địch cùng cột mục tiêu', weakest: 'đồng minh thấp HP nhất',
  party: 'toàn đội', self: 'bản thân',
};
export type Status = 'armor' | 'stun' | 'charm' | 'bleed' | 'taunt' | 'weaken';
export const STATUS_LABEL: Record<Status, string> = {
  armor: 'Phá giáp', stun: 'Choáng', charm: 'Mê hoặc', bleed: 'Chảy máu', taunt: 'Khiêu khích', weaken: 'Giảm sát thương',
};
type EffectKind = Status | 'heal' | 'shield' | 'rage' | 'attack' | 'critical' | 'cleanse';
interface Effect {
  kind: EffectKind;
  value?: number;
  chance?: number;
  turns?: number;
  target?: 'self' | 'weakest' | 'secondWeakest' | 'party' | 'hit';
}
export interface Skill {
  name: string;
  target: Target;
  power?: number;
  hits?: number;
  limit?: number;
  crit?: number;
  combo?: number;
  pierce?: number;
  pierceChance?: number;
  surge?: number;
  repeatOnKill?: boolean;
  effects?: Effect[];
}
export interface Passive {
  name: string;
  atk?: number;
  hp?: number;
  speed?: number;
  crit?: number;
  dodge?: number;
  counter?: number;
  counterChance?: number;
  counterOnDodge?: boolean;
  killRage?: number;
  critDamage?: number;
  lifestealBelowHalf?: number;
  heal?: number;
  teamHeal?: number;
  control?: number;
  charmDamage?: number;
}
interface Kit { normal: Skill; ultimate: Skill; passive: Passive }
const attack = (name: string, power = 1, extra: Partial<Skill> = {}): Skill => ({ name, power, target: 'single', ...extra });
const effect = (kind: EffectKind, value?: number, turns?: number, chance?: number, target?: Effect['target']): Effect =>
  ({ kind, value, turns, chance, target });

export const HERO_SKILLS: Readonly<Record<string, Kit>> = {
  'guan-yu': { normal: attack('Võ Thánh Trảm'), ultimate: attack('Thanh Long Trảm', 3.2, {
    target: 'all', crit: 40, effects: [effect('armor', .30, 2, 70)],
  }), passive: { name: 'Võ Thánh', atk: .20, crit: 15, killRage: 20 } },
  'zhang-fei': { normal: attack('Trượng Vân', 1, { effects: [effect('stun', undefined, 1, 20)] }),
    ultimate: attack('Nộ Hống Trường Bản', 2.8, { target: 'front', effects: [effect('stun', undefined, 1, 70)] }),
    passive: { name: 'Hổ Khiếu', hp: .25, counterChance: 30, counter: 1.2 } },
  'zhao-yun': { normal: attack('Long Thương', 1.1, { combo: 20 }),
    ultimate: attack('Thất Tiến Thất Xuất', .6, { hits: 7, surge: 20 }),
    passive: { name: 'Long Đảm', speed: .15, dodge: 20, counter: 1.5, counterOnDodge: true } },
  'lu-bu': { normal: attack('Kích Vô Song', 1.2),
    ultimate: attack('Phương Thiên Loạn Vũ', 4, { pierce: .4, pierceChance: 50, repeatOnKill: true }),
    passive: { name: 'Vô Song', critDamage: .30, lifestealBelowHalf: .20 } },
  'zhuge-liang': { normal: attack('Vũ Phiến', 1, { effects: [effect('rage', 10, undefined, undefined, 'weakest')] }),
    ultimate: attack('Bát Trận Đồ', 2.6, { target: 'column', effects: [effect('rage', -30, undefined, 70), effect('weaken', .2, 2, 70)] }),
    passive: { name: 'Ngọa Long', teamHeal: .15, control: 10 } },
  'diao-chan': { normal: attack('Phi Y', 1, { effects: [effect('rage', -10, undefined, 20)] }),
    ultimate: { name: 'Quốc Sắc Thiên Hương', target: 'party', effects: [
      effect('heal', .25, undefined, undefined, 'party'), effect('cleanse', undefined, undefined, undefined, 'party'),
      effect('charm', undefined, 1, 50),
    ] }, passive: { name: 'Điểm Ảnh', heal: .20, charmDamage: .15 } },
  'liu-bei': { normal: attack('Song Cổ Kiếm'), ultimate: { name: 'Nhân Đức Chi Quang', target: 'weakest', limit: 2,
    effects: [effect('heal', 1.45), effect('attack', undefined, undefined, undefined, 'weakest'), effect('critical', undefined, undefined, undefined, 'secondWeakest')] },
    passive: { name: 'Nhân Nghĩa', heal: .08 } },
  'da-qiao': { normal: attack('Lạc Hoa'), ultimate: { name: 'Cam Lộ Ngọc Vũ', target: 'weakest', limit: 2, effects: [effect('heal', 1.35), effect('shield', .60)] },
    passive: { name: 'Ngọc Khiết', heal: .12 } },
  'ma-chao': { normal: attack('Tây Lương Thương', 1.05), ultimate: attack('Thiết Kỵ Xung Phong', 1.85, { pierce: .30 }),
    passive: { name: 'Cẩm Mã Siêu', speed: .10 } },
  'cao-cao': { normal: attack('Ỷ Thiên Trảm'), ultimate: attack('Ngụy Vũ Hùng Phong', 1.30, { target: 'front', effects: [effect('rage', -15)] }),
    passive: { name: 'Kiêu Hùng', killRage: 15 } },
  'xiahou-dun': { normal: attack('Độc Nhãn Đao'), ultimate: attack('Bất Khuất Hộ Quân', 1.5, { effects: [effect('shield', 1.5, undefined, undefined, 'self'), effect('taunt', undefined, 1, undefined, 'self')] }),
    passive: { name: 'Cương Liệt', counter: .85, counterChance: 25 } },
  'dian-wei': { normal: attack('Song Kích'), ultimate: attack('Ác Lai Trấn Ải', 1.72, { effects: [effect('shield', 1.5, undefined, undefined, 'self')] }),
    passive: { name: 'Hộ Chủ', hp: .12 } },
  'sun-quan': { normal: attack('Bích Nhãn Kiếm'), ultimate: attack('Giang Đông Hiệu Lệnh', 1.55, { effects: [effect('attack', undefined, undefined, undefined, 'party')] }),
    passive: { name: 'Đế Nghiệp', crit: 8 } },
  'gan-ning': { normal: attack('Cẩm Phàm Đao'), ultimate: attack('Dạ Tập', 1.55, { effects: [effect('bleed', .22, 2)] }),
    passive: { name: 'Cẩm Phàm', crit: 10 } },
  'huang-yueying': { normal: attack('Cơ Quan Nỗ'), ultimate: attack('Mộc Ngưu Lưu Mã', 1.15, { target: 'front', effects: [effect('armor', .18, 2)] }),
    passive: { name: 'Xảo Công', atk: .08 } },
  'hua-xiong': { normal: attack('Quan Tây Đao'), ultimate: attack('Hổ Lao Phá Trận', 1.8, { effects: [effect('bleed', .18, 2)] }),
    passive: { name: 'Quan Tây Uy', hp: .10 } },
  'pan-feng': { normal: attack('Đại Phủ'), ultimate: attack('Khai Sơn Phủ', 1.55, { effects: [effect('shield', 1.3, undefined, undefined, 'self')] }),
    passive: { name: 'Thượng Tướng', hp: .08 } },
  'xing-dao-rong': { normal: attack('Lê Hoa Phủ'), ultimate: attack('Mãnh Phủ', 1.65, { effects: [effect('stun', undefined, 1, 30)] }),
    passive: { name: 'Linh Lăng Dũng', atk: .06 } },
  'cheng-yuan-zhi': { normal: attack('Hoàng Cân Thương'), ultimate: attack('Liệt Thương', 1.5, { effects: [effect('bleed', .18, 2)] }),
    passive: { name: 'Khăn Vàng', killRage: 10 } },
  'pei-yuan-shao': { normal: attack('Sơn Trại Tiễn'), ultimate: attack('Song Tiễn', .90, { hits: 2 }),
    passive: { name: 'Ẩn Lâm', dodge: 8 } },
  'guan-ping': { normal: attack('Thanh Đao'), ultimate: attack('Thanh Long Tiểu Trảm', 1.7, { effects: [effect('armor', .20, 2)] }),
    passive: { name: 'Tiểu Võ Thánh', atk: .08 } },
  'zhou-cang': { normal: attack('Hộ Đao'), ultimate: attack('Thiết Vệ Trấn Thủ', 1.4, { effects: [effect('taunt', undefined, 1, undefined, 'self'), effect('shield', 1.5, undefined, undefined, 'self')] }),
    passive: { name: 'Trung Vệ', hp: .15 } },
  'cao-hong': { normal: attack('Thiết Kiếm'), ultimate: attack('Hộ Giá', 1.55, { effects: [effect('shield', 1, undefined, undefined, 'weakest')] }),
    passive: { name: 'Hộ Kỵ', counter: .80, counterChance: 20 } },
};
export const DEFAULT_KIT: Kit = { normal: attack('Đánh thường'), ultimate: attack('Tuyệt kỹ', 1.72), passive: { name: 'Binh pháp' } };
const pct = (value: number) => Math.round(value * 100);
export function describeSkill(skill: Skill, ultimate: boolean) {
  const parts = [`${TARGET_LABEL[skill.target]}${skill.limit ? ' · tối đa ' + skill.limit : ''}. ${ultimate
    ? `Cần và tiêu hao ${RAGE_CONFIG.skillCost} Nộ.` : `Tích ${RAGE_CONFIG.normalAttackGain} Nộ.`}`];
  if (skill.power) parts.push(`${skill.hits ?? 1} đòn × ${pct(skill.power)}% ATK${skill.crit ? `, +${skill.crit} điểm % chí mạng` : ''}.`);
  if (skill.combo) parts.push(`${skill.combo}% đánh thêm một đòn cùng hệ số.`);
  if (skill.surge) parts.push(`Mỗi đòn có ${skill.surge}% tăng 10% sát thương trước DEF.`);
  if (skill.repeatOnKill) parts.push('Hạ mục tiêu: đánh thêm một lần vào địch còn sống.');
  if (skill.pierce) parts.push(`${skill.pierceChance ?? 100}% bỏ qua ${pct(skill.pierce)}% DEF.`);
  const targets = { self: 'bản thân', weakest: 'đồng minh thấp HP nhất', secondWeakest: 'đồng minh thấp HP thứ hai', party: 'toàn đội', hit: 'mục tiêu' };
  for (const e of skill.effects ?? []) {
    const value = e.value ?? 0;
    const labels: Record<EffectKind, string> = {
      armor: `giảm ${pct(value)}% DEF`, stun: 'choáng, mất lượt', charm: 'mê hoặc, mất lượt', bleed: `chảy máu ${pct(value)}% ATK mỗi lượt`,
      taunt: 'khiêu khích, hút đòn đơn', weaken: `giảm ${pct(value)}% ATK hiệu dụng`,
      heal: `hồi ${pct(value)}% ${e.target === 'party' ? 'HP tối đa mục tiêu' : 'ATK'}`,
      shield: `tạo khiên ${pct(value)}% ATK (tối đa 28% HP)`, rage: `${value < 0 ? 'giảm' : 'hồi'} ${Math.abs(value)} Nộ`,
      attack: `tăng ${pct(COMBAT_BALANCE.attackBuffBonus)}% ATK trong ${COMBAT_BALANCE.buffActions} lượt`,
      critical: `+${COMBAT_BALANCE.criticalBuffBonus} điểm % chí mạng trong ${COMBAT_BALANCE.buffActions} lượt`, cleanse: 'xóa 1 hiệu ứng bất lợi',
    };
    parts.push(`${e.chance !== undefined ? e.chance + '% ' : ''}${labels[e.kind]}${e.turns ? ' trong ' + e.turns + ' lượt' : ''} · ${e.target ? targets[e.target] : e.kind === 'charm' && skill.target === 'party' ? 'tối đa 2 địch' : 'mục tiêu chiêu'}.`);
  }
  return parts.join(' ');
}

export function describePassive(p: Passive) {
  return [
    p.atk && `+${pct(p.atk)}% ATK`, p.hp && `+${pct(p.hp)}% HP tối đa`, p.speed && `+${pct(p.speed)}% SPD`,
    p.crit && `+${p.crit} điểm % chí mạng`, p.dodge && `${p.dodge}% né đòn`,
    p.counter && `${p.counterOnDodge ? 'Khi né' : 'Khi trúng đòn, ' + p.counterChance + '%'} phản kích ${pct(p.counter)}% ATK, tối đa 1 lần mỗi địch trong lượt`,
    p.killRage && `Hạ địch: +${p.killRage} Nộ`, p.critDamage && `+${pct(p.critDamage)} điểm % hệ số sát thương chí mạng`,
    p.lifestealBelowHalf && `Dưới 50% HP: hút máu ${pct(p.lifestealBelowHalf)}% HP gây mất`,
    p.heal && `+${pct(p.heal)}% hồi máu`, p.teamHeal && `Khi còn sống: toàn đội +${pct(p.teamHeal)}% hồi máu`,
    p.control && `+${p.control} điểm % xác suất khống chế`, p.charmDamage && `+${pct(p.charmDamage)}% sát thương bản thân lên địch mê hoặc`,
  ].filter(Boolean).join('. ') + '.';
}

const kits = Object.entries(HERO_SKILLS);
export const ATTACK_SKILLS = new Map<string, Skill>(kits.flatMap(([id, kit]) => [
  [`${id}:normal`, kit.normal] as const, [`${id}:ultimate`, kit.ultimate] as const,
]));
export const PASSIVE_SKILLS = new Map(kits.map(([id, kit]) => [`${id}:passive`, kit.passive]));
