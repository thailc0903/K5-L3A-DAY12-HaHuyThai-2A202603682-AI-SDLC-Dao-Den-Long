import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
for (const file of ['src/game.mjs','src/validation.mjs','src/browser.mjs','scripts/headless.mjs','scripts/serve.mjs','scripts/verify.mjs','tests/game.test.mjs','vendor/three.module.js']) {
  await access(new URL(file,root));
  const r=spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,root))],{stdio:'inherit'});
  if(r.status!==0) process.exit(1);
}
const contract=JSON.parse(await readFile(new URL('game.contract.json',root),'utf8'));
if(contract.contract_version!=='1.0' || contract.tuning.lantern_count_night1!==5) throw new Error('Invalid Phase 1 contract');
console.log('PASS: source syntax and Phase 1 contract. No dependency installation needed.');
