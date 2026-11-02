import { runAcpServer } from './packages/acp-server/src/start.ts';
await runAcpServer({ agentInfo: { name: 'Kimi Code CLI (local ACP fix)', version: '2.4.1-local-acp' } });
