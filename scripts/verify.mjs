import {mkdir,writeFile,readFile,rename,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createLevel} from '../src/levels.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),proof=join(root,'docs/proof/phase-2'),pending=join(proof,'.pending');
await mkdir(pending,{recursive:true});
const run=(args)=>{const start=performance.now(),r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:60000});if(r.status!==0)throw new Error(`${args.join(' ')} failed\n${r.stdout??''}${r.stderr??''}${r.error??''}`);return{output:r.stdout,ms:performance.now()-start};};
const json=async(path)=>JSON.parse(await readFile(path,'utf8'));
const lines=async(name)=>(await readFile(join(pending,name+'.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
const snap=(rows)=>rows.filter((r)=>r.type==='snapshot').at(-1);
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.002,`${a} != ${b}`);
const hash=(value)=>createHash('sha256').update(value).digest('hex');
try{
  await writeFile(join(pending,'build.txt'),run(['scripts/check.mjs']).output);
  await writeFile(join(pending,'http.json'),run(['scripts/http-smoke.mjs']).output);
  const report=run(['--test','--test-reporter=tap','tests/game.test.mjs','tests/presentation.test.mjs','tests/scene.test.mjs']).output;
  await writeFile(join(pending,'tests.tap'),report);
  const cases=await json(join(root,'tests/scenarios/phase-2/cases.json')),results=[];
  for(const c of cases){assert.ok(['dash','pause','drifter-steal','drifter-drop','charm','fall','pad','tiers','wind'].includes(c.name),'Missing verification for scenario '+c.name);const args=['scripts/headless.mjs','--seed','12','--night',String(c.night),'--ticks',String(c.ticks),'--snapshot-every',String(c.every),'--scenario',`tests/scenarios/phase-2/${c.name}.json`,'--out',join(pending,c.name+'.jsonl')];if(c.inputs)args.push('--inputs',`tests/scenarios/phase-2/${c.inputs}`);const result=run(args),rows=await lines(c.name),s=snap(rows);
    if(c.name==='dash'){close(s.player.pos[0],2.8);assert.equal(rows.filter((e)=>e.name==='dash').length,1);}
    if(c.name==='pause'){const paused=rows.find((e)=>e.type==='snapshot'&&e.tick===60);assert.equal(paused.sim_tick,0);assert.equal(paused.state,'paused');assert.equal(paused.motes[0].ttl_s,8);assert.equal(s.sim_tick,2);}
    if(c.name==='drifter-steal'){assert.equal(s.player.carried,4);assert.equal(s.player.flames,2);const names=rows.filter((r)=>r.type==='event').map((r)=>r.name);assert.ok(names.indexOf('drifter_steal')<names.indexOf('player_hit'));}
    if(c.name==='drifter-drop'){assert.equal(s.drifters.length,0);assert.equal(s.motes.length,3);assert.equal(rows.find((e)=>e.name==='drifter_drop').data.amount,3);}
    if(c.name==='charm'){assert.equal(rows.filter((e)=>e.name==='dash').length,2);assert.equal(s.player.dash_cd_s,0);assert.ok(s.player.charm_s>9);}
    if(c.name==='fall'){assert.deepEqual(s.player.pos,[0,0,0]);assert.equal(s.player.flames,2);assert.equal(rows.find((e)=>e.name==='player_hit').data.lost,8);}
    if(c.name==='pad'){assert.ok(s.player.pos[0]>42);assert.equal(s.player.grounded,true);}
    if(c.name==='tiers'){assert.equal(s.player.pos[1],6);assert.equal(s.player.grounded,true);}
    if(c.name==='wind'){assert.equal(rows.find((e)=>e.type==='snapshot'&&e.sim_tick===1800).wind.active,true);assert.equal(s.wind.active,false);}
    results.push({name:c.name,night:c.night,end:rows.at(-1),verified:true,elapsed_ms:result.ms});
  }
  const campaign=[];
  for(const night of [1,2,3]){const level=createLevel(night),scenario={player:{pos:level.spawn,carried:10},random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,charms:[],time_left_s:121,lanterns:level.lanterns.map((l,i)=>({id:l.id,...(i<level.lanterns.length-1?{lit:true}:{pos:level.spawn})}))};
    const file=`night-${night}-win-scenario.json`;await writeFile(join(pending,file),JSON.stringify(scenario,null,2)+'\n');run(['scripts/headless.mjs','--seed','12','--night',String(night),'--ticks','60','--scenario',join(pending,file),'--inputs','tests/scenarios/phase-2/interact-inputs.json','--out',join(pending,`night-${night}-win.jsonl`)]);
    const data=await lines(`night-${night}-win`);assert.equal(data.at(-1).state,'won');assert.equal(data.at(-1).score,590);campaign.push(data.at(-1));
  }
  const benchmark=[];
  for(const suffix of ['a','b']){const r=run(['scripts/headless.mjs','--seed','12','--night','3','--ticks','21600','--scenario','tests/scenarios/phase-2/benchmark.json','--out',join(pending,`benchmark-${suffix}.jsonl`)]);assert.ok(r.ms<=30000,`Headless exceeded 30s: ${r.ms}`);benchmark.push(r.ms);}
  const a=await readFile(join(pending,'benchmark-a.jsonl')),b=await readFile(join(pending,'benchmark-b.jsonl'));assert.ok(a.equals(b),'Determinism mismatch');const end=JSON.parse(a.toString().trim().split('\n').at(-1));assert.equal(end.ticks,21600);assert.equal(end.state,'lost');
  const source={};for(const path of ['game.contract.json','index.html','src/style.css','src/game.mjs','src/levels.mjs','src/rules.mjs','src/validation.mjs','src/browser.mjs','src/view.mjs','src/campaign.mjs','src/audio.mjs','src/settings.mjs','src/performance.mjs','scripts/headless.mjs'])source[path]=hash((await readFile(join(root,path),'utf8')).replace(/\r\n/g,'\n'));
  const summary={contract_version:'1.1',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,
    tests:{total:Number(report.match(/^# tests (\d+)$/m)?.[1]),passed:Number(report.match(/^# pass (\d+)$/m)?.[1]),failed:Number(report.match(/^# fail (\d+)$/m)?.[1])},scenarios:results,campaign_win_fixtures:campaign,
    benchmark:{night:3,ticks:21600,elapsed_ms:benchmark,limit_ms:30000,scenario:'tests/scenarios/phase-2/benchmark.json',note:'Invulnerability keeps gameplay running to dawn; wind disabled so stationary player cannot fall.'},
    determinism:{identical:true,sha256:hash(a)},source_hash_format:'UTF-8 text with LF line endings',source_sha256:source,visual_qa:{verified:false,fps_720p:null,reason:'Browser rendering, audio and real FPS require a browser check. In-game FPS recorder provided.'}};
  assert.equal(summary.tests.failed,0);await writeFile(join(pending,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  const {readdir}=await import('node:fs/promises');for(const file of await readdir(pending)){await rm(join(proof,file),{force:true});await rename(join(pending,file),join(proof,file));}await rm(pending,{recursive:true,force:true});
  console.log(`PASS: ${summary.tests.passed}/${summary.tests.total} tests; ${results.length} headless feature cases; three night win fixtures.`);console.log(`Full 21600 ticks: ${benchmark.map((n)=>n.toFixed(1)+' ms').join(', ')}. Deterministic JSONL verified.`);console.log('Proof: docs/proof/phase-2/ (visual/FPS verification not claimed).');
}catch(error){console.error(error.stack??error.message);process.exitCode=1;}
