import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, '.runtime', 'kimi');
const manifest = JSON.parse(await readFile(new URL('../patches/kimi-code/base.json', import.meta.url), 'utf8'));
const run = (command, args, cwd = root, check = false) => {
  const result = spawnSync(command, args, { cwd, stdio: check ? 'pipe' : 'inherit', windowsHide: true });
  if (!check && result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.error ?? args.join(' ')}`);
  return result;
};
const git = (args, check = false) => run('git', ['-c', `safe.directory=${source.replaceAll('\\', '/')}`, ...args], source, check);
await mkdir(join(root, '.runtime'), { recursive: true });
if (!existsSync(join(source, '.git'))) {
  run('git', ['clone', '--filter=blob:none', '--no-checkout', manifest.repository, source]);
  git(['checkout', '--detach', manifest.commit]);
}
const head = git(['rev-parse', 'HEAD'], true).stdout.toString().trim();
if (head !== manifest.commit) throw new Error(`Refusing to patch unexpected Kimi revision ${head}`);
const fullyPatched = git(['apply', '--reverse', '--check', '--ignore-space-change', join(root, 'patches/kimi-code/combined.patch')], true).status === 0;
for (const name of fullyPatched ? [] : ['001-autonomous-turns.patch', '002-native-steering-and-goal-restore.patch', '003-windows-test-paths.patch']) {
  const patch = join(root, 'patches', 'kimi-code', name);
  if (git(['apply', '--reverse', '--check', '--ignore-space-change', patch], true).status === 0) continue;
  git(['apply', '--check', '--ignore-space-change', patch]);
  git(['apply', '--ignore-space-change', patch]);
}
for (const name of ['acp-loader.mjs', 'acp-register.mjs', 'acp-local.mts']) {
  await copyFile(join(root, 'patches', 'kimi-code', 'launcher', name), join(source, name));
}
const pnpm = join(root, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');
run(process.execPath, [pnpm, 'install', '--frozen-lockfile', '--ignore-scripts', '--store-dir', join(root, '.runtime', 'pnpm-store')], source);
console.log(`Prepared Kimi ${manifest.version} (${manifest.commit}) with both autonomy fixes.`);
