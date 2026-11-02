import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const [directory, tests] of [
  ['acp-server', []],
  ['agent-core-v2', ['test/features/goal/goal.test.ts']],
]) {
  const result = spawnSync(process.execPath, ['../../node_modules/vitest/vitest.mjs', 'run', ...tests], {
    cwd: fileURLToPath(new URL(`../.runtime/kimi/packages/${directory}/`, import.meta.url)),
    stdio: 'inherit', windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
