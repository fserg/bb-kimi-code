import { readFile } from 'node:fs/promises';
import { checkUpstream } from '../src/upstream.ts';

const pins = JSON.parse(await readFile(new URL('../patches/kimi-code/base.json', import.meta.url), 'utf8'));
console.log(JSON.stringify(await checkUpstream(pins), null, 2));
