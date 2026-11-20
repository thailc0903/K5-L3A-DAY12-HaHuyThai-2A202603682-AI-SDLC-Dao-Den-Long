import {mkdir,writeFile,readFile,rename,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createLevel} from '../src/levels.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),proof=join(root,'docs/proof/phase-3'),pending=join(proof,'.pending');
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
  const changes=await json(join(root,'tests/scenarios/phase-3/cases.json'));
  for(const c of changes){
    const args=['scripts/headless.mjs','--seed','12','--night',String(c.night),'--ticks',String(c.ticks),'--snapshot-every',String(c.every),'--scenario',`tests/scenarios/phase-3/${c.name}.json`,'--out',join(pending,c.name+'.jsonl')];if(c.inputs)args.push('--inputs',`tests/scenarios/phase-3/${c.inputs}`);
    const result=run(args),rows=await lines(c.name),s=snap(rows),events=(name)=>rows.filter((r)=>r.name===name);
    switch(c.name){
      case 'oil-out': assert.equal(s.lanterns[0].fuel,0);assert.equal(s.lanterns[0].ever_lit,true);assert.equal(events('lantern_out')[0].tick,6000);break;
      case 'refuel': assert.deepEqual(events('refuel')[0].data,{lantern_id:'L1',amount:3,fuel:100});assert.equal(s.score,15);assert.equal(s.player.carried,7);break;
      case 'relight': assert.deepEqual(events('lantern_lit')[0].data,{lantern_id:'L1',relight:true});assert.equal(s.score,65);assert.equal(s.player.capacity,12);assert.equal(s.lanterns[0].relit_count,1);break;
      case 'drain': assert.deepEqual(events('fuel_drain').map((e)=>[e.tick,e.data.shade_id,e.data.fuel]),[[60,'S1',9],[60,'S2',9]]);assert.equal(events('lantern_out')[0].tick,110);assert.ok(s.shades.every((x)=>x.state==='wander'));break;
      case 'drain-pulse': assert.equal(s.score,20);assert.ok(s.shades.every((x)=>x.state==='stunned'));break;
      case 'safe-restored': close(Math.hypot(s.shades[0].pos[0],s.shades[0].pos[2]),6);assert.equal(s.player.flames,3);assert.equal(events('fuel_drain').length,0);break;
      case 'no-early-win': assert.equal(s.state,'playing');assert.equal(events('game_over').length,0);assert.ok(s.lanterns.every((l)=>l.fuel===99));break;
      case 'dawn-loss-oil': assert.equal(s.state,'lost');assert.equal(events('game_over')[0].data.reason,'dawn');assert.equal(s.score,0);break;
      case 'dawn-win-relight': assert.equal(s.state,'won');assert.equal(events('game_over')[0].data.reason,'dawn_survived');assert.equal(s.score,663);break;
      default: throw new Error('Missing assertion for '+c.name);
    }
    results.push({name:c.name,night:c.night,end:rows.at(-1),verified:true,elapsed_ms:result.ms});
  }
  run(['scripts/headless.mjs','--seed','12','--night','1','--ticks','120','--snapshot-every','1','--scenario','tests/scenarios/phase-3/drain.json','--out',join(pending,'drain-repeat.jsonl')]);
  assert.ok((await readFile(join(pending,'drain.jsonl'))).equals(await readFile(join(pending,'drain-repeat.jsonl'))),'Drain determinism mismatch');
  const campaign=[];
  for(const night of [1,2,3]){const level=createLevel(night),scenario={player:{pos:level.spawn,carried:10},random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,charms:[],time_left_s:1/60,lanterns:level.lanterns.map((l,i)=>({id:l.id,...(i<level.lanterns.length-1?{lit:true}:{pos:level.spawn})}))};
    const file=`night-${night}-win-scenario.json`;await writeFile(join(pending,file),JSON.stringify(scenario,null,2)+'\n');run(['scripts/headless.mjs','--seed','12','--night',String(night),'--ticks','60','--scenario',join(pending,file),'--inputs','tests/scenarios/phase-2/interact-inputs.json','--out',join(pending,`night-${night}-win.jsonl`)]);
    const data=await lines(`night-${night}-win`);assert.equal(data.at(-1).state,'won');assert.equal(data.find((r)=>r.name==='game_over').data.reason,'dawn_survived');assert.equal(data.at(-1).score,450+(night+3)*149);campaign.push(data.at(-1));
  }
  const benchmark=[];
  for(const suffix of ['a','b']){const r=run(['scripts/headless.mjs','--seed','12','--night','3','--ticks','18000','--scenario','tests/scenarios/phase-3/benchmark.json','--out',join(pending,`benchmark-${suffix}.jsonl`)]);assert.ok(r.ms<=30000,`Headless exceeded 30s: ${r.ms}`);benchmark.push(r.ms);}
  const a=await readFile(join(pending,'benchmark-a.jsonl')),b=await readFile(join(pending,'benchmark-b.jsonl'));assert.ok(a.equals(b),'Determinism mismatch');const end=JSON.parse(a.toString().trim().split('\n').at(-1));assert.equal(end.ticks,18000);assert.equal(end.state,'lost');
  const source={};for(const path of ['game.contract.json','index.html','src/style.css','src/game.mjs','src/levels.mjs','src/rules.mjs','src/validation.mjs','src/browser.mjs','src/view.mjs','src/campaign.mjs','src/audio.mjs','src/settings.mjs','src/performance.mjs','scripts/headless.mjs'])source[path]=hash((await readFile(join(root,path),'utf8')).replace(/\r\n/g,'\n'));
  const summary={contract_version:'1.2',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,
    tests:{total:Number(report.match(/^# tests (\d+)$/m)?.[1]),passed:Number(report.match(/^# pass (\d+)$/m)?.[1]),failed:Number(report.match(/^# fail (\d+)$/m)?.[1])},scenarios:results,campaign_win_fixtures:campaign,
    benchmark:{night:3,ticks:18000,elapsed_ms:benchmark,limit_ms:30000,scenario:'tests/scenarios/phase-3/benchmark.json',note:'Invulnerability keeps gameplay running to dawn; wind disabled so stationary player cannot fall.'},
    determinism:{identical:true,sha256:hash(a)},source_hash_format:'UTF-8 text with LF line endings',source_sha256:source,visual_qa:{verified:false,fps_720p:null,reason:'Browser rendering, audio and real FPS require a browser check. In-game FPS recorder provided.'}};
  assert.equal(summary.tests.failed,0);await writeFile(join(pending,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  const {readdir}=await import('node:fs/promises');for(const file of await readdir(pending)){await rm(join(proof,file),{force:true});await rename(join(pending,file),join(proof,file));}await rm(pending,{recursive:true,force:true});
  console.log(`PASS: ${summary.tests.passed}/${summary.tests.total} tests; ${results.length} headless feature cases; three night win fixtures.`);console.log(`Full 18000 ticks: ${benchmark.map((n)=>n.toFixed(1)+' ms').join(', ')}. Deterministic JSONL verified.`);console.log('Proof: docs/proof/phase-3/ (visual/FPS verification not claimed).');
}catch(error){console.error(error.stack??error.message);process.exitCode=1;}
