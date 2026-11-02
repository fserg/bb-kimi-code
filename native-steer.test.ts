import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { experimental_createBridgeJsonRpcTestHarness as makeHarness } from '@get-bb/plugin-sdk/provider-bridge/testing';
import { describe, expect, it } from 'vitest';
import { experimental_providerBridge as bridge } from './host.js';

describe.sequential('negotiated native ACP steering', () => {
  it.each([
    { native: true, reject: false, narrow: false },
    { native: false, reject: false, narrow: false },
    { native: true, reject: true, narrow: false },
    { native: true, reject: false, narrow: true },
    { native: true, reject: false, narrow: false, transientInstructions: true },
  ])('native=$native rejection=$reject permission change=$narrow instructions=$transientInstructions', async ({ native, reject, narrow, transientInstructions }) => {
    const cwd = mkdtempSync(join(tmpdir(), 'kimi-native-steer-'));
    const trace = join(cwd, 'wire.ndjson');
    writeFileSync(trace, '');
    const wire = (): Array<{ method: string; params?: any }> => readFileSync(trace, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const harness = makeHarness(bridge.handleLine);
    const options = {
      permissionMode: 'full', permissionScope: 'full', approvalReviewer: null, permissionEscalation: null,
      providerOptions: { acpDialect: 'kimi', acpLaunchSpec: {
        displayName: 'Fixture', command: process.execPath,
        args: [fileURLToPath(new URL('./fixtures/native-steer-acp.mjs', import.meta.url)), trace, ...(native ? ['--native-steer'] : []), ...(reject ? ['--reject-native'] : [])], env: {},
      } },
    };
    const request = async (id: number, method: string, params: any) => {
      harness.sendRequest(id, method, params);
      const response = await harness.waitForResponse(id);
      expect(response.error).toBeUndefined();
      return response.result as any;
    };
    try {
      await request(1, 'initialize', { client: { name: 'native-steer-test', version: '1' }, protocolVersion: 2 });
      const start = await request(2, 'thread/start', { threadId: 'thr_fixture', cwd, instructionMode: 'replace', options });
      const common = { threadId: 'thr_fixture', providerThreadId: start.providerThreadId, options };
      await request(3, 'turn/start', { ...common, options: { ...options, ...(transientInstructions ? { instructions: 'Existing session instructions' } : {}) }, clientRequestId: 'creq_aaaaaaaaaa', input: [{ type: 'text', text: 'Continue work', mentions: [] }] });
      await expect.poll(() => wire().filter(e => e.method === 'session/prompt').length).toBe(1);
      harness.sendRequest(4, 'turn/steer', { ...common, options: { ...options, ...(narrow ? { permissionMode: 'accept-edits', permissionScope: 'workspace', approvalReviewer: 'user', permissionEscalation: 'ask' } : {}) }, clientRequestId: 'creq_bbbbbbbbbb', expectedTurnId: 'fixture-turn', input: [{ type: 'text', text: 'Child progress: checks passed', mentions: [] }] });
      const response = await harness.waitForResponse(4);
      if (reject) expect(response.error).toBeDefined();
      else expect(response.error).toBeUndefined();
      await expect.poll(() => wire().filter(e => e.method === 'session/prompt').length).toBe(2);
      expect(wire().some(e => e.method === 'session/cancel')).toBe(!native || narrow);
      expect(wire().filter(e => e.method === 'session/prompt')[1]?.params?._meta?.['bb.steer']).toBe(native && !narrow ? true : undefined);
      expect(harness.messages.flatMap(m => (m.params as any)?.deltas ?? []).filter(d => d.kind === 'input.accepted' && d.clientRequestId === 'creq_bbbbbbbbbb')).toHaveLength(reject ? 0 : 1);
      if (native && !narrow) {
        expect(harness.messages.flatMap(m => (m.params as any)?.deltas ?? []).filter(d => d.kind === 'turn.boundary')).toHaveLength(0);
        await request(5, 'thread/stop', { threadId: 'thr_fixture', providerThreadId: start.providerThreadId, intent: 'interrupt', activeTurnId: 'fixture-turn' });
        expect(wire().some(e => e.method === 'session/cancel')).toBe(true);
        expect(harness.messages.flatMap(m => (m.params as any)?.deltas ?? []).filter(d => d.kind === 'turn.boundary')).toHaveLength(1);
      }
    } finally {
      await request(6, 'thread/stop', { threadId: 'thr_fixture', providerThreadId: 'fixture-session', intent: 'release', activeTurnId: null });
      harness.restore();
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 20_000);
});
