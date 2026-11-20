import { mkdir, writeFile, readFile, rename, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { defaultPlaythrough } from './default-playthrough.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const proof=join(root,'docs/proof/phase-1'), pending=join(proof,'.pending');
await mkdir(pending,{recursive:true});
const run=(args)=>{
  const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
  if(r.status!==0) throw new Error(`${args.join(' ')} failed\n${r.stdout || ''}${r.stderr || ''}${r.error || ''}`);
  return r.stdout;
};
try {
  run(['scripts/check.mjs']);
  const http=run(['scripts/http-smoke.mjs']);
  await writeFile(join(pending,'http.json'),http);
  const report=run(['--test','--test-reporter=tap','tests/game.test.mjs']);
  await writeFile(join(pending,'tests.tap'),report);
  const { tuning }=JSON.parse(await readFile(join(root,'game.contract.json'),'utf8'));
  const route=defaultPlaythrough(tuning,12);
  await writeFile(join(pending,'playthrough-inputs.json'),JSON.stringify(route.inputs)+'\n');
  run(['scripts/headless.mjs','--seed','12','--night','1','--ticks','18000','--inputs',join(pending,'playthrough-inputs.json'),'--out',join(pending,'playthrough.jsonl')]);
  const replay=(await readFile(join(pending,'playthrough.jsonl'),'utf8')).trim().split('\n').map(JSON.parse).at(-1);
  if(JSON.stringify(replay)!==JSON.stringify(route.end)) throw new Error('Default playthrough replay mismatch');
  for(const [name,extra,ticks] of [
    ['win',['--scenario','tests/scenarios/win.json','--inputs','tests/scenarios/win-inputs.json'],60],
    ['hit',['--scenario','tests/scenarios/hit.json'],300],
    ['default-a',[],1800],['default-b',[],1800]
  ]) run(['scripts/headless.mjs','--seed','12','--night','1','--ticks',String(ticks),'--out',join(pending,`${name}.jsonl`),...extra]);
  const a=await readFile(join(pending,'default-a.jsonl')),b=await readFile(join(pending,'default-b.jsonl'));
  if(!a.equals(b)) throw new Error('Determinism failed');
  const win=(await readFile(join(pending,'win.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  const hit=(await readFile(join(pending,'hit.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  if(win.at(-1).state!=='won'||win.at(-1).score!==270||hit.at(-1).state!=='lost') throw new Error('Scenario outcomes incorrect');
  const summary={contract_version:'1.0',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,
    tests:'PASS; see tests.tap for actual count',win:win.at(-1),loss:hit.at(-1),default_playthrough:replay,determinism:{identical:true,sha256:createHash('sha256').update(a).digest('hex')},
    scope:'Automated Phase 1 logic/CLI verification. Does not certify browser visual QA or grading on macOS/Linux.'};
  await writeFile(join(pending,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  for(const name of ['tests.tap','win.jsonl','hit.jsonl','default-a.jsonl','default-b.jsonl','summary.json','playthrough-inputs.json','playthrough.jsonl','http.json']) {
    await rm(join(proof,name),{force:true}); await rename(join(pending,name),join(proof,name));
  }
  await rm(pending,{recursive:true,force:true});
  console.log(report); console.log('PASS: win, loss, deterministic JSONL; evidence written to docs/proof/phase-1/');
} catch(error) {
  console.error(error.message); process.exitCode=1;
}
