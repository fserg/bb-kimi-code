type Pins = { pluginBase: string; commit: string; sdk: string };
type ReadResponse = (url: string) => Promise<Response>;

export async function checkUpstream(pins: Pins, fetchImpl: ReadResponse = url => fetch(url, {
  headers: { 'User-Agent': 'bb-kimi-code-fork-upstream-check' }, signal: AbortSignal.timeout(15_000),
})) {
  const read = async (url: string): Promise<Record<string, unknown>> => {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Upstream lookup ${response.status}: ${url}`);
    return await response.json() as Record<string, unknown>;
  };
  const [plugin, kimi, sdk, issue] = await Promise.all([
    read('https://api.github.com/repos/dpolishuk/bb-kimi-code/commits/HEAD'),
    read('https://api.github.com/repos/MoonshotAI/kimi-code/commits/HEAD'),
    read('https://registry.npmjs.org/@get-bb/plugin-sdk/latest'),
    read('https://api.github.com/repos/dpolishuk/bb-kimi-code/issues/8'),
  ]);
  return {
    plugin: { pinned: pins.pluginBase, latest: plugin.sha, changed: pins.pluginBase !== plugin.sha },
    kimi: { pinned: pins.commit, latest: kimi.sha, changed: pins.commit !== kimi.sha },
    sdk: { pinned: pins.sdk, latest: sdk.version, changed: pins.sdk !== sdk.version },
    issue: { state: issue.state, url: issue.html_url },
    regressionTestsRequired: true,
  };
}
