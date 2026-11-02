import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function forkLaunchSpec(entryUrl: string) {
  const entryDirectory = dirname(fileURLToPath(entryUrl));
  const root = basename(entryDirectory) === 'dist' ? dirname(entryDirectory) : entryDirectory;
  return {
    displayName: 'Kimi Code',
    command: 'node',
    args: [join(root, 'scripts', 'launch-kimi.mjs'), 'acp'],
    env: { KIMI_CODE_EXPERIMENTAL_GOAL_PRESERVE_ACTIVE_ON_RESUME: '1' },
  };
}
