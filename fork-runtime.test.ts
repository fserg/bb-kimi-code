import { describe, expect, it } from 'vitest';
import { forkLaunchSpec } from './src/fork-runtime.js';

describe('fork runtime launch', () => {
  it.each(['file:///D:/fork/server.ts', 'file:///D:/fork/dist/server.js'])(
    'resolves the maintained launcher from %s', (entry) => {
      const spec = forkLaunchSpec(entry);
      expect(spec.command).toBe('node');
      expect(spec.args[0].replaceAll('\\', '/')).toBe('D:/fork/scripts/launch-kimi.mjs');
      expect(spec.args.slice(1)).toEqual(['acp']);
      expect(spec.env.KIMI_CODE_EXPERIMENTAL_GOAL_PRESERVE_ACTIVE_ON_RESUME).toBe('1');
    },
  );
});
