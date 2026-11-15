import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const input = process.argv[2];
if (!input) throw new Error('Usage: npm run legacy:digest -- <save.json>');
const bundle = await build({ stdin: {
  contents: 'export { canonicalJson, validateLegacy } from "./src/cloud/validateLegacy";',
  resolveDir: process.cwd(),
}, bundle: true, write: false, format: 'esm', target: 'es2022' });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`;
const { canonicalJson, validateLegacy } = await import(moduleUrl);
const save = JSON.parse(await readFile(input, 'utf8'));
validateLegacy(save);
console.log(createHash('sha256').update(canonicalJson(save)).digest('hex'));
