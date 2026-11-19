import { build } from 'esbuild';

const { outputFiles: [bundle] } = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    export { HEROES } from './src/data/heroes';
    export { SignatureConfig } from './src/data/signatureConfig';
    export { makeArenaBattle } from './src/domain/battle';
    export { signatureSpentThrough, signatureStarBonus } from './src/domain/signatureStars';
  ` },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { HEROES, SignatureConfig, makeArenaBattle, signatureSpentThrough, signatureStarBonus } =
  await import('data:text/javascript;base64,' + Buffer.from(bundle.contents).toString('base64'));

const scenarios = 5000;
const levels = [20, 45, 50].map(vndMillion => {
  const budget = vndMillion * 60;
  let nodes = 0;
  while (nodes < 25 && signatureSpentThrough(nodes + 1) <= budget) nodes++;
  return { vndMillion, budget, nodes, spent: signatureSpentThrough(nodes), bonus: signatureStarBonus(nodes) };
});
const signatures = Object.entries(SignatureConfig);
const heroPool = HEROES.filter(hero => hero.summonable && !hero.baseHeroId).map(hero => hero.id);
const counterTeam = ['diao-chan', 'dian-wei', 'xiahou-dun', 'liu-bei', 'gan-ning', 'da-qiao'];
const pairs = [[1, 0], [2, 0], [2, 1], [0, 0], [2, 2]];
const report = { scenariosPerMatchup: scenarios, seed: '0x3f627', budgets: levels, matchups: [] };

let state = 0x3f627;
function random(max) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return Math.floor(state / 0x100000000 * max);
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function squad(formation, exp, stars, itemId, heroId, nodes) {
  return {
    formation,
    heroExp: Object.fromEntries(formation.map(id => [id, exp])),
    heroStars: Object.fromEntries(formation.map(id => [id, stars])),
    equipment: [{ uid: 'sim:1', itemId, level: 1, heroId, signatureNodes: nodes }],
  };
}

for (const [higher, lower] of pairs) {
  const high = levels[higher], low = levels[lower];
  for (const cohort of ['same-roster', 'control-tank-support']) {
    state = 0x3f627;
    let attackWins = 0, defenseWins = 0;
    for (let i = 0; i < scenarios; i++) {
      const [itemId, { hero }] = signatures[i % signatures.length];
      const roster = [hero, ...shuffle(heroPool.filter(id => id !== hero)).slice(0, 5)];
      const opponent = cohort === 'same-roster' ? roster : [hero, ...counterTeam.filter(id => id !== hero).slice(0, 5)];
      const exp = [0, 800, 3200][random(3)];
      const stars = [1, 3, 5][random(3)];
      const a = squad(shuffle(roster), exp, stars, itemId, hero, high.nodes);
      const b = squad(shuffle(opponent), exp, stars, itemId, hero, low.nodes);
      if (makeArenaBattle(a, b).finish() === 'player') attackWins++;
      if (makeArenaBattle(b, a).finish() === 'enemy') defenseWins++;
    }
    report.matchups.push({ high: high.vndMillion, low: low.vndMillion, cohort, battles: scenarios * 2,
      attackWins, defenseWins, winPct: (attackWins + defenseWins) * 100 / (scenarios * 2) });
  }
}
console.log(JSON.stringify(report, null, 2));
