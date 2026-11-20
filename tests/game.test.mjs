import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Game, distance } from '../src/game.mjs';
import { validateInputs, validateScenario, InputError } from '../src/validation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const t = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8')).tuning;
const empty = { random_motes: false, random_shades: false };
const make = (scenario = {}, seed = 12) => new Game(t, { seed, scenario: { ...empty, ...scenario } });
const steps = (g, n, input = {}) => { const events = []; for (let i = 0; i < n && g.state === 'playing'; i++) events.push(...g.step(input)); return events; };
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('default level has five lamps, 30 motes, three shades and starts at origin', () => {
  const g = new Game(t); assert.equal(g.lanterns.length, 5); assert.equal(g.motes.length, 30); assert.equal(g.shades.length, 3);
  assert.deepEqual(g.snapshot().player.pos, [0,0,0]); assert.equal(g.timeLeft, 300); assert.equal(g.events.length, 0);
});
test('60 forward ticks travel five metres; yaw uses contract formula', () => {
  const a = make(); steps(a, 60, { move: [0,1] }); close(a.player.pos[2], 5); close(a.timeLeft, 299);
  const b = make(); steps(b, 60, { move: [0,1], cam_yaw_deg: 90 }); close(b.player.pos[0], 5); close(b.player.pos[2], 0);
});
test('diagonal input is normalized and frame fields persist', () => {
  const g = make(); g.step({ move: [1,1] }); steps(g, 59); close(distance(g.player.pos, [0,0,0]), 5);
});
test('island prevents falling but does not move outside scenario positions at tick zero', () => {
  const g = make({player:{pos:[29.99,0,0]}}); g.step({move:[1,0]}); close(g.player.pos[0],30); assert.equal(g.player.flames,3);
  const outside = make({player:{pos:[40,0,0]}}); assert.equal(outside.snapshot().player.pos[0],40); outside.step(); close(outside.player.pos[0],40);
});
test('jump leaves ground and held jump does not trigger again after landing', () => {
  const g = make(); g.step({ jump:true }); assert.ok(g.player.pos[1] > 0); steps(g, 119); close(g.player.pos[1],0);
  g.step({jump:false}); g.step({jump:true}); assert.ok(g.player.pos[1]>0);
});
test('pickup includes the exact radius, excludes outside, and respects capacity', () => {
  const g = make({motes:[[1,0,0],[1.001,0,0],...Array.from({length:5},()=>[0,0,0])]});
  const events = g.step(); assert.equal(events.filter((e)=>e.name==='mote_picked').length,5);
  assert.equal(g.player.carried,5); assert.equal(g.motes.length,2); assert.equal(g.score,50);
});
test('snapshot distances ignore visual height', () => {
  const g = make({player:{pos:[0,3,0]},motes:[[1,0,0]]}); g.step(); assert.equal(g.player.carried,1);
});
test('deposit consumes only remaining cost and lights once at interact boundary', () => {
  const g = make({player:{carried:5},lanterns:[{id:'L1',pos:[2,0,0],deposited:1}]});
  const events=g.step({interact:true}); assert.equal(g.player.carried,3); assert.equal(g.lanterns[0].lit,true);
  assert.deepEqual(events[0].data,{lantern_id:'L1',amount:2,deposited:3}); assert.equal(g.score,100);
  assert.equal(g.step({interact:true}).length,0);
  g.step({interact:false}); assert.equal(g.step({interact:true}).length,0);
});
test('partial deposit, outside interaction and deterministic nearest lamp', () => {
  const g=make({player:{carried:1},lanterns:[{id:'L1',pos:[2.001,0,0]},{id:'L2',pos:[-2,0,0]},{id:'L3',pos:[2,0,0]}]});
  const events=g.step({interact:true}); assert.equal(events[0].data.lantern_id,'L2'); assert.equal(g.lanterns[1].deposited,1); assert.equal(g.lanterns[1].lit,false);
});
test('scenario patches lamps by id and replaces empty entity lists without rewards', () => {
  const g=make({player:{carried:3},lanterns:[{id:'L3',lit:true}],motes:[],shades:[]});
  assert.equal(g.lanterns[2].lit,true); assert.equal(g.lanterns[0].lit,false); assert.equal(g.score,0); assert.deepEqual(g.events,[]);
});
test('random flags are respected, supplied arrays replace defaults, ids never collide', () => {
  const g = new Game(t,{scenario:{random_motes:false,random_shades:false,shades:[{pos:[12,0,0]},{id:'S1',pos:[15,0,0]}]}});
  assert.equal(g.motes.length,0); assert.equal(g.shades.length,2); assert.deepEqual(g.shades.map((s)=>s.id),['S1','S2']);
});
test('pulse consumes light, includes radius boundary and pushes three metres', () => {
  const g=make({player:{carried:2},shades:[{id:'A',pos:[5,0,0]},{id:'B',pos:[5.001,0,0]}]});
  const e=g.step({pulse:true}).find((e)=>e.name==='pulse'); assert.deepEqual(e.data.stunned_ids,['A']);
  assert.equal(g.player.carried,1); close(g.shades[0].pos[0],8); assert.equal(g.shades[0].state,'stunned'); assert.equal(g.score,0);
});
test('pulse requires resources and a fresh press after 180 ticks', () => {
  const poor=make(); assert.equal(poor.step({pulse:true}).length,0);
  const g=make({player:{carried:5}}); assert.equal(g.step({pulse:true})[0].name,'pulse');
  g.step({pulse:false}); g.step({pulse:true}); assert.equal(g.player.carried,4);
  steps(g,177,{pulse:false}); assert.equal(g.tick,180); g.step({pulse:true}); assert.equal(g.player.carried,3);
  steps(g,200); assert.equal(g.player.carried,3);
});
test('stun lasts exactly 120 steps including the pulse step', () => {
  const g=make({player:{carried:1},shades:[{pos:[2,0,0]}]}); g.step({pulse:true}); steps(g,119);
  assert.equal(g.tick,120); assert.equal(g.shades[0].state,'stunned'); close(g.shades[0].pos[0],5);
  g.step(); assert.equal(g.shades[0].state,'chase'); assert.ok(g.shades[0].pos[0]<5);
});
test('pickup precedes pulse; pulse precedes deposit when pressed together', () => {
  const g=make({player:{carried:3},motes:[[0,0,0]],lanterns:[{id:'L1',pos:[0,0,0]}]});
  const events=g.step({pulse:true,interact:true}); assert.deepEqual(events.map((e)=>e.name),['mote_picked','pulse','deposit','lantern_lit']); assert.equal(g.player.carried,0);
});
test('shade chase moves at declared speed without overshooting', () => {
  const g=make({shades:[{pos:[20,0,0]}]}); steps(g,60); close(g.shades[0].pos[0],17.8);
});
test('damage is one hit per step and immunity expires at t+90', () => {
  const g=make({player:{carried:4},shades:[{id:'B',pos:[0,0,0]},{id:'A',pos:[0,0,0]}]});
  let hits=g.step().filter((e)=>e.name==='player_hit'); assert.equal(hits.length,1); assert.deepEqual(hits[0].data,{by:'shade',flames:2,dropped:0});
  assert.equal(g.player.carried,4); hits=steps(g,89).filter((e)=>e.name==='player_hit'); assert.equal(hits.length,0);
  assert.equal(g.tick,90); assert.equal(g.step().find((e)=>e.name==='player_hit').data.flames,1);
});
test('lit lamp protects player and excludes shades; unlit lamp does not', () => {
  const s={lanterns:[{id:'L1',pos:[0,0,0],lit:true}],shades:[{pos:[0,0,0]}]};
  const g=make(s); assert.deepEqual(g.snapshot().shades[0].pos,[0,0,0]); g.step(); close(distance(g.shades[0].pos,[0,0,0]),4); assert.equal(g.player.flames,3);
  const dark=make({lanterns:[{id:'L1',pos:[0,0,0]}],shades:[{pos:[0,0,0]}]}); dark.step(); assert.equal(dark.player.flames,2);
});
test('victory awards only new lamp and final bonuses, then stops', () => {
  const g=make({time_left_s:121,player:{carried:3,flames:2},lanterns:Array.from({length:5},(_,i)=>({id:`L${i+1}`,lit:i<4,...(i===4?{pos:[0,0,0]}:{})}))});
  const events=g.step({interact:true}); assert.equal(g.state,'won'); assert.equal(g.score,100+120+50);
  assert.equal(events.filter((e)=>e.name==='game_over').length,1); assert.deepEqual(events.at(-1).data,{result:'won',reason:'all_lit'});
  g.step(); assert.equal(g.tick,1); assert.equal(g.score,270);
});
test('dawn loss, no-flames loss, and initial terminal scenarios', () => {
  const dawn=make({time_left_s:1/60}); assert.equal(dawn.step().at(-1).data.reason,'dawn');
  const dead=make({player:{flames:1},shades:[{pos:[0,0,0]}]}); assert.equal(dead.step().at(-1).data.reason,'no_flames');
  const won=make({lanterns:Array.from({length:5},(_,i)=>({id:`L${i+1}`,lit:true}))}); assert.equal(won.state,'won'); assert.equal(won.tick,0); assert.equal(won.score,0); assert.deepEqual(won.events,[]);
});
test('victory takes priority when the final deposit coincides with dawn', () => {
  const g=make({time_left_s:1/60,player:{carried:3},lanterns:Array.from({length:5},(_,i)=>({id:`L${i+1}`,lit:i<4,...(i===4?{pos:[0,0,0]}:{})}))});
  assert.equal(g.step({interact:true}).at(-1).data.reason,'all_lit');
});
test('same seeded game and actions produce identical snapshots/events', () => {
  const a=new Game(t,{seed:42}), b=new Game(t,{seed:42});
  for(let i=0;i<600;i++){const input={move:[Math.sin(i/70),Math.cos(i/70)],pulse:i%181===0,jump:i%100===0};assert.deepEqual(a.step(input),b.step(input));assert.deepEqual(a.snapshot(),b.snapshot());}
  assert.notDeepEqual(new Game(t,{seed:43}).snapshot().shades,new Game(t,{seed:42}).snapshot().shades);
});
test('malformed inputs and scenarios are rejected instead of coerced', () => {
  for (const value of [{frames:[{tick:0},{tick:0}]},{frames:[{tick:2},{tick:1}]},{frames:[{tick:0,move:[2,0]}]},{frames:[{tick:0,pulse:1}]},{frames:[{tick:-1}]},{frames:[{tick:0,cam_yaw_deg:NaN}]}]) assert.throws(()=>validateInputs(value),InputError);
  for (const value of [{player:{pos:[0,0]}},{player:{carried:6}},{lanterns:[{id:'L6'}]},{shades:[{id:'S1',pos:[0,0,0]},{id:'S1',pos:[1,0,0]}]},{random_motes:'false'},{time_left_s:-1}]) assert.throws(()=>validateScenario(value,t),InputError);
});
test('CLI honours tick model, snapshot cadence, deterministic bytes and exit code 2', () => {
  const temp=mkdtempSync(join(tmpdir(),'dao-den-long-'));
  try {
    writeFileSync(join(temp,'scenario.json'),JSON.stringify({...empty,motes:[[0,0,0]],time_left_s:10}));
    writeFileSync(join(temp,'inputs.json'),JSON.stringify({frames:[{tick:0,move:[0,1]},{tick:2,move:[0,0]}]}));
    const run=(out,more=[])=>spawnSync(process.execPath,['scripts/headless.mjs','--seed','12','--night','1','--ticks','3','--scenario',join(temp,'scenario.json'),'--inputs',join(temp,'inputs.json'),'--out',join(temp,out),...more],{cwd:root,encoding:'utf8'});
    assert.equal(run('a.jsonl',['--snapshot-every','1']).status,0); assert.equal(run('b.jsonl',['--snapshot-every','1']).status,0);
    const text=readFileSync(join(temp,'a.jsonl'),'utf8'); assert.equal(text,readFileSync(join(temp,'b.jsonl'),'utf8'));
    const lines=text.trim().split('\n').map(JSON.parse); assert.equal(lines[0].tick,0); assert.equal(lines[0].player.carried,0);
    assert.equal(lines.find((r)=>r.name==='mote_picked').tick,1); const end=lines.at(-1); assert.deepEqual(end,{type:'end',ticks:3,state:'playing',score:10});
    const snap=lines.filter((r)=>r.type==='snapshot'); assert.deepEqual(snap.map((r)=>r.tick),[0,1,2,3]); assert.equal(snap.at(-1).player.pos[2],0.167);
    assert.equal(run('zero.jsonl',['--ticks','0']).status,2); // duplicate CLI flag is invalid
    const zero=spawnSync(process.execPath,['scripts/headless.mjs','--seed','0','--night','1','--ticks','0','--out',join(temp,'zero.jsonl')],{cwd:root,encoding:'utf8'}); assert.equal(zero.status,0);
    assert.equal(readFileSync(join(temp,'zero.jsonl'),'utf8').trim().split('\n').length,2);
    writeFileSync(join(temp,'inputs.json'),'{bad json'); const bad=run('bad.jsonl'); assert.equal(bad.status,2); assert.match(bad.stderr,/inputs/);
    writeFileSync(join(temp,'inputs.json'),JSON.stringify({frames:[{tick:0,pulse:'yes'}]})); assert.equal(run('bad2.jsonl').status,2);
    writeFileSync(join(temp,'scenario.json'),JSON.stringify({lanterns:[{id:'unknown'}]})); assert.equal(run('bad3.jsonl').status,2);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
