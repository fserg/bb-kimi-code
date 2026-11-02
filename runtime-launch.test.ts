import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it.skipIf(!existsSync(new URL('./.runtime/kimi/acp-local.mts', import.meta.url)))(
  'launches the maintained runtime and negotiates native steering', async () => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./scripts/launch-kimi.mjs', import.meta.url)), 'acp'], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', data => { stderr += data; });
    try {
      const result = await new Promise<any>((resolve, reject) => {
        let buffer = '';
        child.on('error', reject);
        child.on('exit', code => reject(new Error(`ACP exited ${code}: ${stderr}`)));
        child.stdout.on('data', data => {
          buffer += data;
          let newline;
          while ((newline = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
            const message = JSON.parse(line);
            if (message.id === 1) message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
          }
        });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: {} } }) + '\n');
      });
      expect(result.agentCapabilities._meta['bb.nativeSteer']).toBe(true);
      expect(result.agentInfo.version).toBe('2.4.1-local-acp');
    } finally {
      child.kill();
    }
  }, 30_000,
);
