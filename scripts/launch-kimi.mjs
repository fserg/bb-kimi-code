import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';

if (process.argv[2] === 'acp') {
  const source = new URL('../.runtime/kimi/', import.meta.url);
  if (!existsSync(new URL('acp-local.mts', source))) {
    throw new Error('Fork runtime is not prepared. Run npm run runtime:prepare in the fork checkout.');
  }
  process.env.KIMI_CODE_EXPERIMENTAL_GOAL_PRESERVE_ACTIVE_ON_RESUME = '1';
  await import(new URL('node_modules/tsx/dist/loader.mjs', source).href);
  await import(new URL('acp-register.mjs', source).href);
  await import(new URL('acp-local.mts', source).href);
} else {
  const command = process.platform === 'win32' ? join(homedir(), '.kimi-code', 'bin', 'kimi.exe') : 'kimi';
  const child = spawn(command, process.argv.slice(2), { stdio: 'inherit', windowsHide: true });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
