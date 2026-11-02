import { createInterface } from 'node:readline';
import { appendFileSync } from 'node:fs';
const trace = process.argv[2];
const send = (value) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...value }) + '\n');
let pending;
let count = 0;
createInterface({ input: process.stdin }).on('line', (line) => {
  const req = JSON.parse(line);
  appendFileSync(trace, JSON.stringify({ method: req.method, params: req.params }) + '\n');
  const reply = (result) => send({ id: req.id, result });
  if (req.method === 'initialize') return reply({ protocolVersion: 1, agentCapabilities: { _meta: { 'bb.nativeSteer': process.argv.includes('--native-steer') }, loadSession: true, promptCapabilities: {}, mcpCapabilities: {} }, authMethods: [], agentInfo: { name: 'fixture', version: '1' } });
  if (req.method === 'session/new') return reply({ sessionId: 'fixture-session' });
  if (req.method === 'session/prompt') {
    if (req.params._meta?.['bb.steer'] === true) return reply({ stopReason: process.argv.includes('--reject-native') ? 'cancelled' : 'end_turn' });
    count++;
    send({ method: 'session/update', params: { sessionId: 'fixture-session', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: count === 1 ? 'Working' : 'Received progress' } } } });
    if (count === 1) {
      pending = req.id;
      if (process.argv.includes('--finish-first')) setTimeout(() => {
        if (pending === undefined) return;
        send({ id: pending, result: { stopReason: 'end_turn' } });
        pending = undefined;
      }, 100);
    }
    else reply({ stopReason: 'end_turn' });
    return;
  }
  if (req.method === 'session/cancel') {
    if (pending !== undefined) send({ id: pending, result: { stopReason: 'cancelled' } });
    pending = undefined;
    return;
  }
  if (req.id !== undefined) reply({});
});
