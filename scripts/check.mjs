import { access, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const files=['vendor/three.module.js'];
for(const directory of ['src','scripts','tests'])for(const name of await readdir(new URL(directory+'/',root)))if(name.endsWith('.mjs'))files.push(directory+'/'+name);
for (const file of files) {
  await access(new URL(file,root));
  const r=spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,root))],{stdio:'inherit'});
  if(r.status!==0) process.exit(1);
}
const contract=JSON.parse(await readFile(new URL('game.contract.json',root),'utf8'));
if(contract.contract_version!=='1.2' || contract.tuning.lantern_count_night1!==5) throw new Error('Invalid Phase 3 contract');
console.log('PASS: source syntax and Contract v1.2. No dependency installation needed.');
