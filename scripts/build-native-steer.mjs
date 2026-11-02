import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const sdk = require.resolve('@get-bb/plugin-sdk/provider-bridge/acp-next');
const source = await readFile(sdk, 'utf8');
const pins = JSON.parse(await readFile(new URL('../patches/kimi-code/base.json', import.meta.url), 'utf8'));
if (createHash('sha256').update(source).digest('hex') !== pins.sdkSha256) {
  throw new Error('Published SDK bundle changed; revalidate native steering before changing the pin.');
}
const anchor = `    case "turn/steer": {
      const params = request.params;
      const session = liveSessionForThread(params.threadId);
      if (session === void 0) {
        sendError(request.id, -32e3, "No active ACP session");
        return;
      }
`;
if (source.split(anchor).length !== 2) {
  throw new Error('SDK 0.6.90 turn/steer anchor changed; review before rebuilding');
}
const native = `      if (session.capabilities?.meta?.["bb.nativeSteer"] === true &&
          isDeepStrictEqual(session.nativeSteerOptions, params.options) &&
          (session.activePromptKind === "turn" || session.activePromptKind === "agent")) {
        if (session.stopping || session.cancelRequested || session.connection.exited) {
          throw new Error("ACP session is stopping");
        }
        const result = await session.connection.request({
          method: "session/prompt",
          params: {
            sessionId: session.providerThreadId,
            prompt: buildPromptContentBlocks(session, params.input),
            _meta: { "bb.steer": true }
          },
          resultSchema: acpPromptResultSchema
        });
        if (result.stopReason !== "end_turn") {
          throw new Error("ACP did not accept native steer: " + result.stopReason);
        }
        acceptTurnInput(session, {
          clientRequestId: params.clientRequestId,
          requestId: request.id
        });
        return;
      }
`;
const optionsAnchor = '        const prompt = buildPromptContentBlocks(session, pending.input);';
if (source.split(optionsAnchor).length !== 2) throw new Error('SDK prompt options anchor changed');
const patched = source.replace(anchor, anchor + native).replace(optionsAnchor,
  '        session.nativeSteerOptions = pending.options;\n' + optionsAnchor);
await writeFile(new URL('../native-steer-sdk.patch', import.meta.url),
  '--- SDK 0.6.90 provider-bridge-acp-next.js\n+++ local native steering\n@@ after turn/steer session lookup @@\n' +
  native.split('\n').map(line => '+' + line).join('\n') + '\n');
await writeFile(new URL('../src/acp-native.js', import.meta.url), patched);
