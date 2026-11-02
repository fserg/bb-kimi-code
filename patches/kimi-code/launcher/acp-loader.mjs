import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load as rawLoad } from './build/raw-text-loader.mjs';
import { transform } from './node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/lib/main.js';
export async function load(url, context, nextLoad) {
  if (/\.(ts|mts)$/.test(url)) {
    const path = fileURLToPath(url);
    const result = await transform(readFileSync(path, 'utf8'), { loader: 'ts', format: 'esm', target: 'node24', sourcefile: path, tsconfigRaw: { compilerOptions: { experimentalDecorators: true } } });
    return { format: 'module', source: result.code, shortCircuit: true };
  }
  return rawLoad(url, context, nextLoad);
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('#') && context.parentURL?.startsWith('file:')) {
    let dir = dirname(fileURLToPath(context.parentURL));
    while (true) {
      const manifest = resolvePath(dir, 'package.json');
      if (existsSync(manifest)) {
        const imports = JSON.parse(readFileSync(manifest, 'utf8')).imports ?? {};
        for (const [pattern, target] of Object.entries(imports)) {
          const prefix = pattern.split('*')[0];
          if (typeof target === 'string' && pattern.endsWith('*') && specifier.startsWith(prefix)) {
            let path = resolvePath(dir, target.replace('*', specifier.slice(prefix.length)));
            if (!existsSync(path) && path.endsWith('.ts') && existsSync(path.slice(0,-3)+'/index.ts')) path = path.slice(0,-3)+'/index.ts';
            return nextResolve(pathToFileURL(path).href, context);
          }
        }
        break;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return nextResolve(specifier, context);
}
