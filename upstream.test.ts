import { expect, it } from 'vitest';
import { checkUpstream } from './src/upstream.js';

it('reports changes without treating a closed issue as proof of a fix', async () => {
  const calls: string[] = [];
  const data = [{ sha: 'new-plugin' }, { sha: 'new-kimi' }, { version: '0.6.104' }, { state: 'closed', html_url: 'https://github.com/dpolishuk/bb-kimi-code/issues/8' }];
  const report = await checkUpstream({ pluginBase: 'old-plugin', commit: 'old-kimi', sdk: '0.6.90' }, async url => {
    calls.push(url); return new Response(JSON.stringify(data.shift()), { status: 200 });
  });
  expect(calls).toHaveLength(4);
  expect(report.plugin.changed).toBe(true);
  expect(report.kimi.changed).toBe(true);
  expect(report.sdk.changed).toBe(true);
  expect(report.issue.state).toBe('closed');
  expect(report.regressionTestsRequired).toBe(true);
});

it('surfaces an upstream lookup failure', async () => {
  await expect(checkUpstream({ pluginBase: 'x', commit: 'y', sdk: 'z' }, async () => new Response('rate limited', { status: 403 }))).rejects.toThrow('403');
});
