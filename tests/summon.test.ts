import {describe,expect,it} from 'vitest';
import {drawSummon} from '../src/domain/summon';

describe('Golden Key gacha domain',()=>{
  it('SSR at roll 0, pity reset',()=>{
    const draw=drawSummon(17,()=>0);
    expect(draw.rarity).toBe('SSR');
    expect(draw.pityAfter).toBe(0);
  });
  it('guarantees SSR at 50th draw',()=>{
    const draw=drawSummon(49,()=>0.99);
    expect(draw.rarity).toBe('SSR');
    expect(draw.guaranteed).toBe(true);
    expect(draw.pityAfter).toBe(0);
  });
  it('R on high roll before pity',()=>{
    const draw=drawSummon(0,()=>0.9);
    expect(draw.rarity).toBe('R');
    expect(draw.pityAfter).toBe(1);
  });
  it('rejects invalid rng',()=>expect(()=>drawSummon(1,()=>1)).toThrow());
});

it('draws only the two released SSS+ heroes and applies the independent 200-pull guarantee', () => {
  const draws = [0, 0.99].map(pick => {
    const rolls = [0.027, pick];
    return drawSummon(20, () => rolls.shift()!, 40);
  });
  expect(draws.map(draw => draw.heroId)).toEqual(['lu-bu', 'zhuge-liang']);
  expect(draws.every(draw => draw.rarity === 'SSS+' && draw.pityAfter === 0 && draw.legendaryPityAfter === 0)).toBe(true);
  expect(drawSummon(49, () => 0.99, 199)).toMatchObject({ rarity: 'SSS+', guaranteed: true });
  expect(drawSummon(49, () => 0.99, 198)).toMatchObject({ rarity: 'SSR', legendaryPityAfter: 199 });
});

it('classifies the active roster from the requested list and keeps roadmap heroes out', async () => {
  const { HeroConfig } = await import('../src/data/heroes');
  const expected = {
    R: ['pan-feng', 'xing-dao-rong', 'cheng-yuan-zhi', 'pei-yuan-shao'],
    SR: ['hua-xiong', 'da-qiao', 'huang-yueying', 'guan-ping', 'zhou-cang', 'cao-hong'],
    SSR: ['liu-bei', 'guan-yu', 'zhang-fei', 'zhao-yun', 'ma-chao', 'cao-cao', 'xiahou-dun',
      'dian-wei', 'sun-quan', 'gan-ning', 'diao-chan'],
    'SSS+': ['lu-bu', 'zhuge-liang'],
  };
  for (const rarity of HeroConfig.rarities) {
    expect(HeroConfig.roster.filter(hero => hero.rarity === rarity).map(hero => hero.id).sort())
      .toEqual(expected[rarity].sort());
  }
});
