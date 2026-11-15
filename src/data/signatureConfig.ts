export const SignatureConfig = {
  azureMoon: { hero: 'guan-yu', name: 'Thanh Long Yển Nguyệt Đao', cast: 'azure_dragon-11', impact: 'azure_dragon-06', hp: 35, atk: 14, def: 4, bonus: 0.12, color: 0x73f6ae },
  serpentSpear: { hero: 'zhang-fei', name: 'Trượng Bát Xà Mâu', cast: 'fire_earth-11', impact: 'fire_earth-01', hp: 55, atk: 11, def: 5, bonus: 0.10, color: 0xff9850 },
  silverSpear: { hero: 'zhao-yun', name: 'Long Đảm Lượng Ngân Thương', cast: 'azure_dragon-12', impact: 'azure_dragon-10', hp: 25, atk: 15, def: 3, bonus: 0.10, color: 0x93dbff },
  skyHalberd: { hero: 'lu-bu', name: 'Phương Thiên Họa Kích', cast: 'fire_earth-09', impact: 'fire_earth-11', hp: 30, atk: 16, def: 3, bonus: 0.10, color: 0xff6255 },
  featherFan: { hero: 'zhuge-liang', name: 'Ngọa Long Vũ Phiến', cast: 'healing_defense-09', impact: 'dark_control-02', hp: 40, atk: 13, def: 4, bonus: 0.12, color: 0xe7ffe2 },
  heavenSword: { hero: 'cao-cao', name: 'Ỷ Thiên Kiếm', cast: 'dark_control-01', impact: 'dark_control-03', hp: 35, atk: 14, def: 4, bonus: 0.12, color: 0xcf99ff },
} as const;

export type SignatureId = keyof typeof SignatureConfig;
export const signatureIds = Object.keys(SignatureConfig) as SignatureId[];
export function isSignature(id: string): id is SignatureId {
  return Object.hasOwn(SignatureConfig, id);
}
