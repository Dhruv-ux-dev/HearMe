/**
 * Adds a language for understanding requests, from a data file:
 *
 *   npm run add-language -w @hearme/hub -- bn
 *
 * 1. checks apps/hub/data/languages/<code>.json covers the 40 needs,
 * 2. retrains the need classifier with the pack's keywords and templates,
 * 3. measures typed requests in the zero-shot set (see zeroshot.ts).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACK_DIR, checkPack, type LanguagePack } from '../langpacks';

const code = process.argv[2];
const file = code ? join(PACK_DIR, `${code}.json`) : '';
if (!code || !existsSync(file)) {
  console.log(`Usage: npm run add-language -w @hearme/hub -- <code>   (needs ${join(PACK_DIR, '<code>.json')})`);
  process.exit(1);
}
const pack = JSON.parse(readFileSync(file, 'utf8')) as LanguagePack;
const { missing, unknown } = checkPack(pack);
console.log(`▶ ${pack.name} (${pack.code}): ${40 - missing.length}/40 needs have keywords, ${pack.templates.length} templates`);
if (missing.length) console.log(`  missing: ${missing.join(', ')}`);
if (unknown.length) console.log(`  not needs (ignored): ${unknown.join(', ')}`);

const hub = fileURLToPath(new URL('../../', import.meta.url));
for (const script of ['train-head.ts', 'zeroshot.ts']) {
  const r = spawnSync('npx', ['tsx', `src/scripts/${script}`], { cwd: hub, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
