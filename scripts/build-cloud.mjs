import { build } from 'esbuild';

await Promise.all(['game-command', 'arena-command'].map(name => build({
  entryPoints: [`supabase/functions/${name}/edge.ts`],
  outfile: `supabase/functions/${name}/index.js`,
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: 'es2022',
  external: ['npm:*'],
})));
