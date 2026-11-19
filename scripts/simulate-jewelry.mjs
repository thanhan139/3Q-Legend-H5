import { build } from 'esbuild';
import { resolve } from 'node:path';

const { outputFiles: [bundle] } = await build({
  entryPoints: [resolve('scripts/jewelry-simulation.ts')],
  format: 'esm', platform: 'node', bundle: true, write: false,
});
const { simulate, simulateEconomyV14 } = await import('data:text/javascript;base64,' + Buffer.from(bundle.contents).toString('base64'));
const journeys = Number(process.argv[2] ?? 10_000);
if (!Number.isSafeInteger(journeys) || journeys < 10_000) throw Error('At least 10,000 journeys per rarity are required');
const report = process.argv[3] === 'economy-v14' ? simulateEconomyV14(journeys) : simulate(journeys);
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
