import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {benchmarkScene,stepBenchmark,orbit,frameStats} from '../src/benchmark.mjs';
import {DEFAULT_BINDINGS,rebind,normalizeBindings,actionHeld} from '../src/bindings.mjs';
import {loadSettings,saveSettings} from '../src/settings.mjs';
import {rankEntries,validateEntry} from '../src/leaderboard.mjs';
import {readLeaderboard} from '../scripts/leaderboard-store.mjs';
import {createServer,root} from '../scripts/server.mjs';
import {crc32,makeZip} from '../scripts/zip.mjs';
import {inflateRawSync} from 'node:zlib';
const contract=JSON.parse(await readFile(new URL('../game.contract.json',import.meta.url),'utf8'));
test('v1.3 adds executable benchmark and bounded-memory soak commands, gameplay tuning is unchanged',async()=>{
  assert.equal(contract.contract_version,'1.3');assert.equal(contract.bench_cmd,'node scripts/bench.mjs');assert.equal(contract.soak_cmd,'node --jitless --expose-gc --max-semi-space-size=1 scripts/soak.mjs');
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);const source=Buffer.from('Đảo Đèn Lồng'),zip=makeZip([['game/test.txt',source]]),length=zip.readUInt16LE(26),size=zip.readUInt32LE(18);assert.equal(zip.readUInt32LE(0),0x04034b50);assert.deepEqual(inflateRawSync(zip.subarray(30+length,30+length+size)),source);assert.throws(()=>makeZip([['../bad',source]]));
});
test('standard benchmark freezes fuel/player/end/spawns, but moves exactly 200 wander shades with 100 motes',()=>{
  const a=benchmarkScene(contract.tuning,42),b=benchmarkScene(contract.tuning,42);assert.deepEqual(a.snapshot(),b.snapshot());const positions=a.shades.map((s)=>[...s.pos]);
  for(let i=0;i<1200;i++){stepBenchmark(a);stepBenchmark(b);}assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.shades.length,200);assert.equal(a.motes.length,100);assert.equal(a.player.flames,3);assert.equal(a.player.carried,0);assert.deepEqual(a.player.pos,[0,0,0]);assert.equal(a.timeLeft,240);assert.equal(a.state,'playing');assert.equal(a.lanterns.filter((l)=>l.lit).length,3);assert.ok(a.lanterns.filter((l)=>l.lit).every((l)=>l.fuelQ===6000));assert.ok(a.shades.every((s)=>s.state==='wander'));assert.ok(a.shades.some((s,i)=>JSON.stringify(s.pos)!==JSON.stringify(positions[i])));
});
test('orbit is CCW from +X with radius30 Y15 period15; frame statistics follow ticket formula',()=>{
  for(const s of [0,1,7.5,15]){const p=orbit(s);assert.ok(Math.abs(Math.hypot(p[0],p[2])-30)<1e-8);assert.equal(p[1],15);}assert.ok(orbit(3.75)[2]<-29.99);
  const stats=frameStats([...Array(99).fill(16),100]);assert.equal(stats.frames,100);assert.equal(stats.avg_fps,100000/1684);assert.equal(stats.p1_low_fps,10);assert.equal(stats.frame_ms_p95,16);assert.throws(()=>frameStats([]));
});
test('all nine actions rebind, reject conflicts, survive reload and recover malformed settings',()=>{
  let bindings={...DEFAULT_BINDINGS};for(const [i,key]of Object.keys(bindings).entries())bindings=rebind(bindings,key,`Digit${i}`);assert.equal(new Set(Object.values(bindings)).size,9);assert.throws(()=>rebind(bindings,'jump',bindings.pulse),/trùng/);assert.throws(()=>rebind(bindings,'jump','MetaLeft'));assert.deepEqual(normalizeBindings({jump:'KeyW'}),DEFAULT_BINDINGS);
  const data=new Map(),storage={getItem:(k)=>data.get(k),setItem:(k,v)=>data.set(k,v)};saveSettings(storage,{bindings,reduceMotion:true,largeText:true});const loaded=loadSettings(storage);assert.deepEqual(loaded.bindings,bindings);assert.equal(loaded.reduceMotion,true);assert.equal(loaded.largeText,true);
  assert.equal(actionHeld(new Set(['ArrowUp']),DEFAULT_BINDINGS,'forward'),true);const remapped=rebind(DEFAULT_BINDINGS,'jump','ArrowUp');assert.equal(actionHeld(new Set(['ArrowUp']),remapped,'forward'),false);assert.equal(actionHeld(new Set(['ArrowUp']),remapped,'jump'),true);
});
test('leaderboard validates names, ranks scores/time and keeps only ten with exact fields',()=>{
  const entry={name:'May_12',score:100,nights_won:1,seed:12,achieved_at:'2026-11-20T10:00:00+07:00'};assert.deepEqual(validateEntry(entry),entry);for(const name of ['ab','a'.repeat(13),'abc!','<svg>'])assert.throws(()=>validateEntry({...entry,name}));
  const rows=Array.from({length:14},(_,i)=>({...entry,name:`May_${i}`,score:i,achieved_at:'2026-11-20T03:00:00Z'}));rows.push({...entry,name:'Earlier',score:13,achieved_at:'2026-11-20T02:59:59Z'});const ranked=rankEntries(rows);assert.equal(ranked.length,10);assert.equal(ranked[0].name,'Earlier');assert.equal(ranked[1].score,13);assert.deepEqual(Object.keys(ranked[0]),['name','score','nights_won','achieved_at','seed']);
});
test('disk leaderboard survives server restart, serializes concurrent writes and CLI export matches',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'dao-board-')),previous=process.env.LEADERBOARD_PATH;process.env.LEADERBOARD_PATH=join(dir,'board.json');let server;
  const start=async()=>{server=createServer();await new Promise((r)=>server.listen(0,'127.0.0.1',r));return`http://127.0.0.1:${server.address().port}`;};
  try{let base=await start();const value={name:'Player_1',score:500,nights_won:2,seed:12};assert.equal((await fetch(base+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,name:'bad!'})})).status,400);
    await Promise.all(Array.from({length:12},(_,i)=>fetch(base+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,name:`May_${i}`,score:i})}).then((r)=>assert.equal(r.status,200))));await new Promise((r)=>server.close(r));base=await start();const board=await(await fetch(base+'/api/leaderboard')).json();assert.equal(board.entries.length,10);assert.equal(board.entries[0].score,11);assert.deepEqual(board,await readLeaderboard(process.env.LEADERBOARD_PATH));
    const output=join(dir,'export.json'),run=spawnSync(process.execPath,['scripts/serve.mjs','--export-leaderboard',output],{cwd:root,encoding:'utf8',env:process.env});assert.equal(run.status,0,run.stderr);assert.deepEqual(JSON.parse(await readFile(output,'utf8')),board);assert.equal((await fetch(base+'/.local/leaderboard.json')).status,404);
  }finally{if(server?.listening)await new Promise((r)=>server.close(r));if(previous===undefined)delete process.env.LEADERBOARD_PATH;else process.env.LEADERBOARD_PATH=previous;await rm(dir,{recursive:true,force:true});}
});
