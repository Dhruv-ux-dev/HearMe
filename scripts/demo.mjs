#!/usr/bin/env node
/**
 * One command for the whole demo:  npm run demo
 *   1. downloads the offline AI models the first time (≈370 MB, then never again)
 *   2. builds the phone app + web apps if they are missing (or with --rebuild)
 *   3. starts the cabin hub and opens the demo stage in your browser
 * Flags: --rebuild  --no-open  --no-ai (skip the speech models; taps/typing still work)
 */
import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (script, extra = []) => {
  const r = spawnSync(npm, ['run', script, ...extra], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const noAi = args.includes('--no-ai');
const modelsReady = existsSync(new URL('../apps/hub/.models/Xenova/multilingual-e5-small/onnx/model_quantized.onnx', import.meta.url));
if (!noAi && !modelsReady) {
  console.log('\n▶ First run: downloading the offline AI models (≈370 MB, one time)…');
  run('models');
}

const built = existsSync(new URL('../apps/ife/dist/index.html', import.meta.url)) && existsSync(new URL('../apps/ife/dist/mobile/index.html', import.meta.url));
if (!built || args.includes('--rebuild')) {
  console.log('\n▶ Building the phone app and the web apps…');
  run('build');
}

console.log('\n▶ Starting the cabin hub…');
const hubArgs = ['run', 'start', '-w', '@hearme/hub', '--', ...(args.includes('--no-open') ? [] : ['--open'])];
const hub = spawn(npm, hubArgs, { cwd: root, stdio: 'inherit', env: { ...process.env, ...(noAi ? { HEARME_NO_AI: '1' } : {}) } });
hub.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => hub.kill(sig));
