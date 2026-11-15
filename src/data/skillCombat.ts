/** Data-only, original M3.8 balance. Presentation reads this table; it never resolves damage. */
export type UltimateStyle = 'dragon' | 'earth' | 'spear' | 'healing' | 'general' | 'warlord' | 'formation';
export interface UltimateProfile {
  title: string;
  style: UltimateStyle;
  castMs: number;
  impactGapMs: number;
}
const PROFILES: Readonly<Record<string, UltimateProfile>> = {
  'lu-bu': { title: 'Vô Song Phá Trận', style: 'warlord', castMs: 570, impactGapMs: 170 },
  'zhuge-liang': { title: 'Bát Trận Hộ Thiên', style: 'formation', castMs: 530, impactGapMs: 190 },
  'guan-yu': { title: 'Thanh Long Trảm', style: 'dragon', castMs: 480, impactGapMs: 190 },
  'zhang-fei': { title: 'Bá Vương Chấn Địa', style: 'earth', castMs: 540, impactGapMs: 165 },
  'zhao-yun': { title: 'Long Đảm Thiên Kích', style: 'spear', castMs: 420, impactGapMs: 180 },
  'liu-bei': { title: 'Nhân Đức Chi Quang', style: 'healing', castMs: 440, impactGapMs: 170 },
  'da-qiao': { title: 'Cam Lộ Ngọc Vũ', style: 'healing', castMs: 440, impactGapMs: 170 },
};
export function ultimateProfile(heroId: string): UltimateProfile {
  return PROFILES[heroId] ?? { title: 'Tuyệt Kỹ', style: 'general', castMs: 440, impactGapMs: 170 };
}
export const COMBAT_BALANCE = Object.freeze({
  criticalBaseChance: 8, criticalBuffBonus: 26, criticalDamageMultiplier: 1.5,
  attackBuffBonus: 0.18, buffActions: 2,
  tankShieldAtkMultiplier: 1.5, shieldMaxHpFraction: 0.28,
  multiTargetCap: 3,
});
