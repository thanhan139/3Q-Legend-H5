// Optional fallback for environments that forbid native esbuild/fork subprocesses.
// Runs the same Vitest suites using worker threads and the installed TypeScript compiler.
import ts from 'typescript';
import { startVitest } from 'vitest/node';

await startVitest('test', process.argv.slice(2), {
  config: false, pool: 'threads', maxWorkers: 1, minWorkers: 1,
}, {
  esbuild: false,
  resolve: { preserveSymlinks: true },
  plugins: [{
    name: 'in-process-typescript',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.tsx?$/.test(id)) return;
      const result = ts.transpileModule(code, { fileName: id,
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
          isolatedModules: true, sourceMap: true, inlineSources: true } });
      return { code: result.outputText, map: result.sourceMapText };
    },
  }],
});
