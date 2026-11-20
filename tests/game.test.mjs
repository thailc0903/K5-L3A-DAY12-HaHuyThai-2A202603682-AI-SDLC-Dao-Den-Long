import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Game,distance} from '../src/game.mjs';
import {createLevel,surfacesAt} from '../src/levels.mjs';
import {validateInputs,validateScenario,InputError} from '../src/validation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const contract=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url),'utf8')),t=contract.tuning;
const empty={random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,charms:[]};
const make=(scenario={},night=1)=>new Game(t,{night,seed:12,scenario:{...empty,...scenario}});
const steps=(g,n,input={})=>{const result=[];for(let i=0;i<n&&!['won','lost'].includes(g.state);i++)result.push(...g.step(input));return result;};
const close=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const allLit=(n)=>Array.from({length:n+4},(_,i)=>({id:`L${i+1}`,lit:true}));

test('fuel uses exact integer quanta: decay, extinction, ever_lit and no construction credit',()=>{
  const g=make({lanterns:[{id:'L1',lit:true}]});assert.equal(g.lanterns[0].fuelQ,6000);assert.equal(g.capacity(),10);
  steps(g,5999);assert.equal(g.lanterns[0].fuelQ,1);assert.equal(g.lanterns[0].lit,true);
  const e=g.step();assert.deepEqual(e.find((e)=>e.name==='lantern_out').data,{lantern_id:'L1'});
  assert.deepEqual(g.snapshot().lanterns[0],{id:'L1',pos:[0,0,25],lit:false,deposited:0,fuel:0,ever_lit:true,relit_count:0});assert.equal(g.score,0);assert.equal(g.step().length,0);
});
test('first light costs ten; partial relight costs five, resets oil, raises capacity and scores 40',()=>{
  const g=make({player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]}]});let e=g.step({interact:true});
  assert.deepEqual(e.find((e)=>e.name==='lantern_lit').data,{lantern_id:'L1',relight:false});assert.equal(g.capacity(),12);assert.equal(g.score,150);assert.equal(g.lanterns[0].fuelQ,6000);
  steps(g,6000,{interact:false});g.player.carried=3;e=g.step({interact:true});assert.equal(g.lanterns[0].deposited,3);assert.equal(g.lanterns[0].lit,false);assert.equal(g.score,165);
  g.step({interact:false});g.player.carried=5;e=g.step({interact:true});assert.equal(g.player.carried,3);assert.equal(g.score,215);assert.equal(g.capacity(),14);assert.equal(g.lanterns[0].relit_count,1);assert.equal(g.lanterns[0].fuelQ,6000);assert.deepEqual(e.at(-1).data,{lantern_id:'L1',relight:true});
});
test('refuel uses ceil of exact deficit, clamps 100, awards only consumed motes and emits refuel',()=>{
  const g=make({player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:79.5}]});const e=g.step({interact:true});
  assert.deepEqual(e.find((e)=>e.name==='refuel').data,{lantern_id:'L1',amount:3,fuel:100});assert.equal(g.player.carried,7);assert.equal(g.score,15);assert.equal(g.player.successfulLights,0);assert.equal(g.lanterns[0].relit_count,0);
  const poor=make({player:{carried:1},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:40}]});poor.step({interact:true});assert.equal(poor.lanterns[0].fuelQ,2999);assert.equal(poor.score,5);
});
test('interaction filters full oil, then nearest receptive lamp and id; decay precedes interaction',()=>{
  const g=make({player:{carried:3},lanterns:[{id:'L1',pos:[0,0,0],lit:true},{id:'L2',pos:[1,0,0],lit:true,fuel:50},{id:'L3',pos:[-1,0,0]}]});
  g.interact(()=>true);assert.equal(g.events[0].data.lantern_id,'L2');assert.equal(g.lanterns[0].fuelQ,6000);
  const full=make({player:{carried:2},lanterns:[{id:'L1',pos:[0,0,0],lit:true}]});full.interact(()=>true);assert.deepEqual(full.events,[]);assert.equal(full.score,0);assert.equal(full.player.carried,2);
  full.step({interact:true});assert.equal(full.events[0].name,'refuel');assert.equal(full.player.carried,1);assert.equal(full.lanterns[0].fuelQ,6000);
});
test('extinction before interaction permits relight on that very tick',()=>{
  const g=make({player:{carried:5},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:1/60}]});const e=g.step({interact:true});
  assert.deepEqual(e.map((e)=>e.name),['lantern_out','deposit','lantern_lit']);assert.equal(g.score,65);assert.equal(g.lanterns[0].fuelQ,6000);assert.equal(g.lanterns[0].relit_count,1);
});
test('capacity increases per successful lighting, clamps twenty, scenario lights do not count, resets each night',()=>{
  for(const [n,cap]of [[0,10],[1,12],[4,18],[5,20],[12,20]]){const g=make({player:{successful_lights:n,carried:cap-1},lanterns:allLit(1),motes:[[0,0,0],[0,0,0]]});g.step();assert.equal(g.snapshot().player.capacity,cap);assert.equal(g.player.carried,cap);assert.equal(g.motes.length,1);}
  assert.equal(make({},2).capacity(),10);assert.equal(make({},3).capacity(),10);
});
test('safe zone is inclusive at exactly 30 real fuel, absent below even when snapshot rounds to 30',()=>{
  const g=make({lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:30+1/60}],shades:[{pos:[7,0.8,0]}]});g.step();assert.equal(g.lanterns[0].fuelQ,1800);assert.equal(g.safeAt([6,0,0]),true);g.step();assert.equal(g.safeAt([0,0,0]),false);assert.equal(g.snapshot().lanterns[0].fuel,30);
});
test('wander chooses nearest weak lit lamp over off lamps, ties by id; chase keeps player target',()=>{
  const scenario={player:{pos:[-30,0,0]},lanterns:[{id:'L1',pos:[11,0,0],lit:true,fuel:20},{id:'L2',pos:[9,0,0],lit:true,fuel:20},{id:'L3',pos:[10,0,0]}],shades:[{pos:[10,0.8,0],state:'wander'}]};
  const g=make(scenario);g.step();assert.equal(g.shades[0].state,'drain');assert.equal(g.shades[0].target_lantern_id,'L1');
  const chase=make({...scenario,player:{pos:[0,0,0]},shades:[{pos:[10,0.8,0],state:'chase'}]});chase.step();assert.equal(chase.shades[0].state,'chase');assert.ok(chase.shades[0].pos[0]<10);
  const off=make({player:{pos:[-30,0,0]},lanterns:[{id:'L1',pos:[12,0,0]},{id:'L2',pos:[8,0,0]}],shades:[{pos:[10,0.8,0],state:'wander'}]});off.step();assert.equal(off.shades[0].target_lantern_id,'L1');assert.ok(off.shades[0].pos[0]>10);
});
test('drain is stationary; two shades stack with natural decay and report each sixty drain ticks',()=>{
  const g=make({player:{pos:[-30,0,0]},lanterns:[{id:'L1',pos:[10,0,0],lit:true,fuel:20}],shades:[{id:'S1',pos:[10,0.8,0],state:'drain',target_lantern_id:'L1'},{id:'S2',pos:[11,0.8,0],state:'drain',target_lantern_id:'L1'}]});
  const e=steps(g,59);assert.equal(e.filter((e)=>e.name==='fuel_drain').length,0);const last=g.step();assert.deepEqual(last.filter((e)=>e.name==='fuel_drain').map((e)=>e.data),[{lantern_id:'L1',shade_id:'S1',fuel:9},{lantern_id:'L1',shade_id:'S2',fuel:9}]);assert.deepEqual(g.shades.map((s)=>s.pos),[[10,0.8,0],[11,0.8,0]]);assert.equal(g.lanterns[0].fuelQ,540);
  const out=steps(g,50);assert.equal(out.filter((e)=>e.name==='lantern_out').length,1);assert.ok(g.shades.every((s)=>s.state==='wander'));assert.equal(g.lanterns[0].fuelQ,0);
});
test('drain stops for player within six, stale or remote targets; stunned recovers to wander',()=>{
  const base={lanterns:[{id:'L1',pos:[10,0,0],lit:true,fuel:20}],shades:[{pos:[10,0.8,0],state:'drain',target_lantern_id:'L1'}]};
  const near=make({...base,player:{pos:[4,0,0]}});near.step();assert.equal(near.shades[0].state,'chase');
  const far=make({...base,player:{pos:[-30,0,0]},shades:[{pos:[13,0.8,0],state:'drain',target_lantern_id:'L1'}]});far.step();assert.equal(far.shades[0].state,'wander');assert.equal(far.lanterns[0].fuelQ,1199);
  const missing=make({player:{pos:[-30,0,0]},shades:[{pos:[10,0.8,0],state:'drain',target_lantern_id:'L1'}]});missing.step();assert.equal(missing.shades[0].state,'wander');
  const stun=make({...base,player:{pos:[-30,0,0]},shades:[{pos:[10,0.8,0],state:'stunned',state_ticks_left:1}]});stun.step();assert.equal(stun.shades[0].state,'drain'); // expired -> wander -> selects weak lamp in AI step
});
test('refuel restoring safe radius evacuates draining shade by tick thirty without damage',()=>{
  const g=make({player:{pos:[0,0,0],carried:3},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:20}],shades:[{pos:[0,0.8,0],state:'drain',target_lantern_id:'L1'}]});g.step({interact:true});assert.equal(g.lanterns[0].fuelQ,2994);assert.notEqual(g.shades[0].state,'drain');steps(g,29);close(distance(g.shades[0].pos,[0,0,0]),6);assert.equal(g.player.flames,3);
});
test('safety restoration at exactly thirty completes evacuation even when oil falls below thirty next tick',()=>{
  const g=make({player:{carried:1},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:20.1}],shades:[{pos:[0,0.8,0],state:'drain',target_lantern_id:'L1'}]});g.step({interact:true});assert.equal(g.lanterns[0].fuelQ,1800);assert.equal(g.shades[0].state,'wander');steps(g,29);close(distance(g.shades[0].pos,[0,0,0]),6);assert.equal(g.player.flames,3);assert.equal(g.lanterns[0].fuelQ,1771);
});
test('safety evacuation also meets thirty-tick deadline during sixty-tick recoil',()=>{
  const g=make({player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]}],shades:[{pos:[0,0.8,0],state:'recoil',state_ticks_left:60}]});g.step({interact:true});steps(g,29);close(distance(g.shades[0].pos,[0,0,0]),6);assert.equal(g.player.flames,3);
});
test('pulse awards total fifteen for a pre-pulse drainer, five for every other shade',()=>{
  const g=make({player:{carried:3},lanterns:[{id:'L1',pos:[4,0,0],lit:true,fuel:20}],shades:[{id:'S1',pos:[4,0.8,0],state:'drain',target_lantern_id:'L1'},{id:'S2',pos:[3,0.8,0],state:'chase'},{id:'S3',pos:[2,0.8,0],state:'stunned'}]});g.step({pulse:true});assert.equal(g.score,25);assert.ok(g.shades.every((s)=>s.state==='stunned'));assert.ok(g.shades.every((s)=>s.target_lantern_id===null));
});
test('pause freezes oil, drain cadence, capacity and time',()=>{
  const g=make({player:{pos:[-30,0,0],successful_lights:2},lanterns:[{id:'L1',pos:[10,0,0],lit:true,fuel:20}],shades:[{pos:[10,0.8,0],state:'drain',target_lantern_id:'L1'}]});g.step({pause:true});steps(g,120);assert.equal(g.lanterns[0].fuelQ,1200);assert.equal(g.shades[0].drainTicks,0);assert.equal(g.capacity(),14);g.step({pause:false});g.step({pause:true});assert.equal(g.lanterns[0].fuelQ,1194);
});
test('dawn thresholds are 3/5, 4/6, 5/7; final fuel floors and flame bonuses only on win',()=>{
  for(const night of [1,2,3])for(const enough of [false,true]){const needed=night+2,count=needed-(enough?0:1),g=make({player:{flames:2},lanterns:allLit(night).slice(0,count),time_left_s:1/60},night);const e=g.step();assert.equal(g.state,enough?'won':'lost');assert.equal(e.at(-1).data.reason,enough?'dawn_survived':'dawn');assert.equal(g.score,enough?count*149+100:0);g.step();assert.equal(g.score,enough?count*149+100:0);}
});
test('final tick sees oil-out, relight and lethal fall before evaluating dawn',()=>{
  const lamps=[{id:'L1',lit:true},{id:'L2',lit:true},{id:'L3',pos:[0,0,0],lit:true,fuel:1/60}];
  const out=make({lanterns:lamps,time_left_s:1/60});assert.equal(out.step().at(-1).data.reason,'dawn');
  const relight=make({lanterns:lamps,player:{carried:5},time_left_s:1/60});assert.equal(relight.step({interact:true}).at(-1).data.reason,'dawn_survived');assert.equal(relight.score,65+2*149+150+150);
  const dead=make({player:{pos:[41,-11,0],flames:1},lanterns:allLit(1),time_left_s:1/60});assert.equal(dead.step().at(-1).data.reason,'no_flames');assert.equal(dead.score,0);
});
test('scenario defaults and new v1.2 fields validate bounds and deterministic fuel precision',()=>{
  const g=make({player:{successful_lights:3,carried:16},lanterns:[{id:'L1',lit:true},{id:'L2',lit:false,fuel:40,ever_lit:true},{id:'L3',lit:true,fuel:0}]});assert.equal(g.capacity(),16);assert.equal(g.snapshot().lanterns[0].fuel,100);assert.equal(g.snapshot().lanterns[1].fuel,0);assert.equal(g.snapshot().lanterns[2].lit,false);assert.equal(g.score,0);
  for(const bad of [{player:{successful_lights:-1}},{player:{successful_lights:1.1}},{player:{successful_lights:1,carried:13}},{lanterns:[{id:'L1',fuel:101}]},{lanterns:[{id:'L1',fuel:-1}]},{lanterns:[{id:'L1',ever_lit:1}]},{shades:[{pos:[0,0,0],state:'drain',target_lantern_id:'L9'}]}])assert.throws(()=>make(bad),InputError);
});

test('standard tuning v1.2, durations and score constants are exact',()=>{
  assert.equal(contract.contract_version,'1.2');
  for(const [key,value] of Object.entries({player_speed:6,carry_capacity:10,lantern_cost:10,pickup_radius:1,interact_radius:2,dash_speed:14,dash_duration_s:0.2,dash_cooldown_s:1.5,pulse_cost:3,pulse_radius:5,pulse_cooldown_s:3,pulse_stun_s:2,pulse_push_m:4,flames:3,invuln_s:1.5,hit_drop_ratio:0.5,safe_radius:6,shade_speed:4,shade_hit_radius:1,fall_enabled:true,night1_duration_s:240,night2_duration_s:270,night3_duration_s:300,fuel_max:100,fuel_decay_per_s:1,fuel_per_mote:10,relight_cost:5,win_ratio:0.6,drain_per_s:5,low_fuel_threshold:30,capacity_max:20}))assert.equal(t[key],value,key);
  assert.deepEqual(t.score,{per_mote:5,per_lantern:100,per_stun:5,per_relight:40,per_drain_stun:15,per_lit_at_dawn:50,per_flame_left:50});
});
test('three standard maps have correct lamps, spawn sets and no initial shades',()=>{
  for(const night of [1,2,3]){const g=new Game(t,{night});assert.equal(g.lanterns.length,night+4);assert.equal(g.motes.length,20);assert.equal(new Set(g.motes.map((m)=>JSON.stringify(m.pos))).size,20);assert.equal(g.shades.length,0);assert.equal(g.timeLeft,t[`night${night}_duration_s`]);}
  assert.deepEqual(createLevel(1).lanterns[1].pos,[23.8,0,7.7]);assert.equal(createLevel(1).moteSpawns.length,24);assert.equal(createLevel(2).moteSpawns.length,24);assert.equal(createLevel(3).moteSpawns.length,30);
  assert.deepEqual(createLevel(2).lanterns[5].pos,[53,0,-10]);assert.deepEqual(createLevel(3).lanterns[0].pos,[0,6,6]);
});
test('regression: origin tick zero, five lamps, no construction rewards',()=>{
  const g=make({player:{carried:10},lanterns:[{id:'L3',lit:true}]});assert.deepEqual(g.snapshot().player.pos,[0,0,0]);assert.equal(g.tick,0);assert.equal(g.simTick,0);assert.equal(g.score,0);assert.deepEqual(g.events,[]);assert.equal(g.lanterns[0].lit,false);
});
test('regression: camera movement, six metres per second, diagonal normalization',()=>{
  const g=make();steps(g,60,{move:[0,1]});close(g.player.pos[2],6);close(g.timeLeft,239);
  const yaw=make();steps(yaw,60,{move:[0,1],cam_yaw_deg:90});close(yaw.player.pos[0],6);close(yaw.player.pos[2],0);
  const diagonal=make();steps(diagonal,60,{move:[1,1]});close(distance(diagonal.player.pos,[0,0,0]),6);
});
test('regression: omitted fields persist and stopping is immediate',()=>{
  const g=make();g.step({move:[1,0]});steps(g,9);close(g.player.pos[0],1);g.step({move:[0,0]});close(g.player.pos[0],1);close(g.player.vel[0],0);
});
test('regression: jump uses 7/-20, full air control, held jump does not repeat',()=>{
  const g=make();g.step({jump:true,move:[1,0]});close(g.player.vel[1],7-20/60);assert.ok(!g.player.grounded);g.step({move:[-1,0]});close(g.player.pos[0],0);
  steps(g,100,{move:[0,0]});assert.equal(g.player.pos[1],0);g.step({jump:false});g.step({jump:true});assert.ok(g.player.pos[1]>0);
});
test('regression: pickup radius/capacity plus the new height bound; pickup gives no score',()=>{
  const g=make({motes:[[1,0,0],[1.001,0,0],[0,1.5,0],[0,1.501,0],...Array.from({length:10},()=>[0,0,0])]});g.step();assert.equal(g.player.carried,10);assert.equal(g.motes.length,4);assert.equal(g.score,0);
});
test('regression: deposit remaining cost, partial progress and held input edges',()=>{
  const g=make({player:{carried:10},lanterns:[{id:'L1',pos:[2,0,0],deposited:4}]});const e=g.step({interact:true});assert.deepEqual(e.find((e)=>e.name==='deposit').data,{lantern_id:'L1',amount:6,deposited:10});assert.equal(g.player.carried,4);assert.equal(g.score,130);assert.equal(g.lanterns[0].lit,true);assert.equal(g.step().length,0);
});
test('regression: nearest unlit lamp wins; equal distance resolves by id',()=>{
  const g=make({player:{carried:3},lanterns:[{id:'L1',pos:[2.001,0,0]},{id:'L2',pos:[-2,0,0]},{id:'L3',pos:[2,0,0]}]});const e=g.step({interact:true});assert.equal(e[0].data.lantern_id,'L2');assert.equal(g.lanterns[1].deposited,3);assert.equal(g.lanterns[1].lit,false);assert.equal(g.score,15);
});
test('new order: pickup and deposit before pulse (insufficient remainder prevents pulse)',()=>{
  const g=make({player:{carried:9},motes:[[0,0,0]],lanterns:[{id:'L1',pos:[0,0,0]}]});const e=g.step({interact:true,pulse:true});assert.deepEqual(e.map((e)=>e.name),['mote_picked','deposit','lantern_lit']);assert.equal(g.score,150);assert.equal(g.player.carried,0);
});
test('dash: 14 m/s for exactly 12 ticks, held button cannot retrigger',()=>{
  const g=make();const e=g.step({dash:true});assert.equal(e[0].name,'dash');steps(g,11);close(g.player.pos[2],2.8);steps(g,78);close(g.player.pos[2],2.8);assert.equal(g.player.dashCd,1);g.step({dash:false});assert.equal(g.player.dashCd,0);g.step({dash:true});assert.ok(g.player.pos[2]>2.8);
});
test('dash follows movement/facing, freezes airborne height, does not give invulnerability',()=>{
  const g=make({player:{pos:[0,4,0]}});steps(g,12,{dash:true,move:[1,0]});close(g.player.pos[0],2.8);close(g.player.pos[1],4);g.step();assert.ok(g.player.pos[1]<4);
  const hit=make({shades:[{pos:[0.9,0.8,0]}]});hit.step({dash:true});assert.equal(hit.player.flames,2);
});
test('pulse: exact 3D radius at foot+0.8, spend three and push four over fifteen ticks',()=>{
  const g=make({player:{carried:6},shades:[{id:'S1',pos:[5,0.8,0]},{id:'S2',pos:[0,6,0]}]});const e=g.step({pulse:true});assert.deepEqual(e.find((e)=>e.name==='pulse').data.stunned_ids,['S1']);assert.equal(g.player.carried,3);close(g.shades[0].pos[0],5+4/15);steps(g,14);close(g.shades[0].pos[0],9);assert.equal(g.score,5);
});
test('pulse refreshes stunned targets and cannot activate with insufficient light or held input',()=>{
  const poor=make({player:{carried:2}});assert.equal(poor.step({pulse:true}).length,0);assert.equal(poor.player.carried,2);
  const g=make({player:{carried:6},shades:[{pos:[2,0.8,0],state:'stunned',state_ticks_left:300}]});g.step({pulse:true});assert.equal(g.shades[0].left,120);assert.equal(g.score,5);steps(g,179);assert.equal(g.player.carried,3);g.step({pulse:false});g.step({pulse:true});assert.equal(g.player.carried,0);
});
test('stun expires on the exact 120 tick boundary',()=>{
  const g=make({player:{carried:3},shades:[{pos:[2,0.8,0]}]});g.step({pulse:true});steps(g,119);assert.equal(g.shades[0].state,'stunned');g.step();assert.notEqual(g.shades[0].state,'stunned');
});
test('shades chase at 4 m/s (4.5 at night 3), detect 12 and forget 18',()=>{
  const g=make({shades:[{pos:[12,0,0],state:'wander'}]});steps(g,60);close(g.shades[0].pos[0],8);assert.equal(g.shades[0].state,'chase');
  const far=make({shades:[{pos:[19,0,0],state:'chase'}]});far.step();assert.equal(far.shades[0].state,'wander');
  const n3=make({player:{pos:[30,0,0]},shades:[{pos:[38,0.8,0]}]},3);steps(n3,60);close(n3.shades[0].pos[0],33.5);
});
test('shade hit drops floor(carried/2), no pickup in that step, recoil and immunity',()=>{
  const g=make({player:{carried:9},shades:[{id:'S2',pos:[0,0.8,0]},{id:'S1',pos:[0,0.8,0]}]});const e=g.step();assert.equal(e.filter((e)=>e.name==='player_hit').length,1);assert.equal(g.player.flames,2);assert.equal(g.player.carried,5);assert.equal(g.shades[0].state,'recoil');assert.equal(g.shades[1].state,'chase');
  assert.equal(g.motes.length,4);for(const m of g.motes){assert.equal(m.ttl,480);assert.ok(distance(m.pos,g.player.pos)>=1.5-1e-8&&distance(m.pos,g.player.pos)<=2.5+1e-8);}
  assert.equal(steps(g,89).filter((e)=>e.name==='player_hit').length,0);assert.equal(g.step().filter((e)=>e.name==='player_hit').length,1);
});
test('shade touch respects vertical limit and recoil pushes a total of two metres',()=>{
  const high=make({shades:[{pos:[0,1.501,0]}]});high.step();assert.equal(high.player.flames,3);
  const g=make({shades:[{pos:[0.5,0.8,0]}]});g.step();const x=g.shades[0].pos[0];steps(g,60);close(g.shades[0].pos[0]-x,2);
});
test('safe radius blocks outside shades, evacuates insiders in 30 ticks',()=>{
  const g=make({lanterns:[{id:'L1',pos:[0,0,0],lit:true}],shades:[{pos:[0,0.8,0]}]});steps(g,30);close(distance(g.shades[0].pos,[0,0,0]),6);assert.equal(g.player.flames,3);
  const outside=make({lanterns:[{id:'L1',pos:[0,0,0],lit:true}],shades:[{pos:[7,0.8,0]}]});steps(outside,60);assert.ok(distance(outside.shades[0].pos,[0,0,0])>=6-1e-8);
});
test('dropped motes expire after 480 simulation ticks and can be picked before expiration',()=>{
  const g=make({motes:[{pos:[10,0,0],kind:'dropped',ttl_ticks:480}]});steps(g,479);assert.equal(g.motes[0].ttl,1);g.step();assert.equal(g.motes.length,0);
  const pickup=make({motes:[{pos:[0,0,0],kind:'dropped',ttl_ticks:480}]});pickup.step();assert.equal(pickup.player.carried,1);
});
test('fall bypasses invulnerability, loses all light, waits 60 ticks and respawns once',()=>{
  const g=make({player:{pos:[41,-10.01,0],carried:9,invuln_ticks:100}});const e=g.step();assert.deepEqual(e[0].data,{by:'fall',flames:2,dropped:0,lost:9});assert.equal(g.player.respawnTicks,60);
  assert.equal(steps(g,59).filter((e)=>e.name==='player_hit').length,0);assert.equal(g.player.flames,2);g.step();assert.deepEqual(g.player.pos,[0,0,0]);assert.deepEqual(g.player.vel,[0,0,0]);assert.equal(g.player.invulnTicks,90);
});
test('fall with last flame ends immediately without respawning',()=>{
  const g=make({player:{pos:[41,-11,0],flames:1}});const e=g.step();assert.equal(g.state,'lost');assert.equal(e.at(-1).data.reason,'no_flames');assert.equal(g.player.respawnTicks,0);
});
test('pause advances tick only; freezes timers, ttl, spawns and position',()=>{
  const g=make({player:{carried:3,charm_ticks:600,dash_cd_ticks:90,pulse_cd_ticks:180,invuln_ticks:90},motes:[{pos:[10,0,0],kind:'dropped',ttl_ticks:480}]});g.step({pause:true,move:[1,0]});steps(g,600);assert.equal(g.state,'paused');assert.equal(g.tick,601);assert.equal(g.simTick,0);assert.equal(g.timeLeft,240);assert.equal(g.player.charmTicks,600);assert.equal(g.player.invulnTicks,90);assert.equal(g.motes[0].ttl,480);assert.equal(g.player.pos[0],0);
  g.step({pause:false});const e=g.step({pause:true});assert.equal(e[0].name,'resumed');assert.equal(g.state,'playing');assert.equal(g.simTick,1);close(g.player.pos[0],0.12);
});
test('mote schedule: 20 unique initially, one at tick 240, no free point means skip',()=>{
  const g=new Game(t,{scenario:{random_shades:false,random_drifters:false}});steps(g,239);assert.equal(g.motes.length,20);g.step();assert.equal(g.motes.length,21);steps(g,720);assert.equal(g.motes.length,24);steps(g,480);assert.equal(g.motes.length,24);
});
test('new spawn cannot interact in its birth tick',()=>{
  const points=createLevel(1).moteSpawns,target=points[0];const g=make({random_motes:true,motes:points.slice(1),player:{pos:target}});steps(g,240);assert.equal(g.motes.length,24);assert.equal(g.player.carried,0);assert.ok(g.motes.some((m)=>distance(m.pos,target)<1e-8));g.step();assert.equal(g.player.carried,1);
});
test('standard spawn caps hold in all three nights and motes cap at thirty',()=>{
  for(const [night,cap]of [[1,6],[2,8],[3,10]]){const g=make({player:{invuln_ticks:6000},random_shades:true},night);steps(g,5000);assert.equal(g.shades.length,cap);}
  const g=make({random_motes:true},3);steps(g,3000);assert.equal(g.motes.length,30);
});
test('dash becomes available exactly 90 ticks after starting, not one tick early',()=>{
  const early=make();early.step({dash:true});early.step({dash:false});steps(early,87);assert.equal(early.tick,89);assert.equal(early.step({dash:true}).filter((e)=>e.name==='dash').length,0);
  const ready=make();ready.step({dash:true});ready.step({dash:false});steps(ready,88);assert.equal(ready.tick,90);assert.equal(ready.step({dash:true}).filter((e)=>e.name==='dash').length,1);
});
test('shade schedule: two at 300, one at 780; canonical spawning state and unique ids',()=>{
  const g=make({random_shades:true});steps(g,299);assert.equal(g.shades.length,0);let e=g.step();assert.equal(g.shades.length,2);assert.equal(e.filter((e)=>e.name==='shade_spawned').length,2);assert.ok(g.shades.every((s)=>s.state==='spawning'));assert.deepEqual(g.shades.map((s)=>s.id),['S1','S2']);steps(g,480);assert.equal(g.shades.length,3);
});
test('scenario flags disable schedules; explicit ids do not collide',()=>{
  const g=make({player:{invuln_ticks:5000},shades:[{id:'S1',pos:[35,0.8,0]},{pos:[36,0.8,0]}]});assert.deepEqual(g.shades.map((s)=>s.id),['S1','S2']);steps(g,1200);assert.equal(g.shades.length,2);assert.equal(g.motes.length,0);assert.equal(g.drifters.length,0);
});
test('night 2 bridge surface is exactly four metres wide; pads launch to the other island',()=>{
  const l=createLevel(2);assert.deepEqual(surfacesAt(l,35,2),[0]);assert.deepEqual(surfacesAt(l,35,2.001),[]);
  for(const pos of [[20,0,18],[50,0,-18]]){const g=make({player:{pos}},2);g.step({move:[0,1],jump:true});assert.ok(g.player.vel[1]>13);close(Math.hypot(g.player.vel[0],g.player.vel[2]),24);steps(g,84,{move:[0,1]});assert.equal(g.player.grounded,true);assert.ok(pos[0]===20?g.player.pos[0]>42:g.player.pos[0]<28);}
});
test('launch pad allows dash while retaining flight and resumes launch afterwards',()=>{
  const g=make({player:{pos:[20,0,18]}},2);g.step();const y=g.player.pos[1];g.step({dash:true});close(g.player.pos[1],y);close(Math.hypot(g.player.vel[0],g.player.vel[2]),14);steps(g,11);g.step({dash:false});close(Math.hypot(g.player.vel[0],g.player.vel[2]),24);
});
test('night 3 tiers, ramps, walls and tower are physical, not visual only',()=>{
  const l=createLevel(3);assert.equal(surfacesAt(l,0,18).at(-1),3);assert.equal(surfacesAt(l,5,0).at(-1),6);
  const a=Math.PI/6;close(surfacesAt(l,27*Math.cos(a),27*Math.sin(a)).at(-1),1.5);
  const wall=make({player:{pos:[0,0,24.1]}},3);steps(wall,10,{move:[0,-1]});assert.ok(wall.player.pos[2]>=24);
  const ramp=make({player:{pos:[30*Math.cos(a),0,30*Math.sin(a)]}},3);steps(ramp,60,{move:[-Math.cos(a),-Math.sin(a)]});close(ramp.player.pos[1],3);
  const tower=make({player:{pos:[2.1,6,0]}},3);steps(tower,20,{move:[-1,0]});assert.ok(tower.player.pos[0]>=2);
});
test('night 3 launch pad reaches tier two; walking off tiers falls down',()=>{
  const g=make({player:{pos:[0,3,13]}},3);steps(g,60);assert.equal(g.player.grounded,true);close(g.player.pos[1],6);assert.ok(g.player.pos[2]>2&&g.player.pos[2]<=8);
  const edge=make({player:{pos:[12.05,3,0.5]}},3);steps(edge,35,{move:[-1,0]});assert.ok(edge.player.pos[1]<3);
});
test('drifter detects carried>=5 within 15, otherwise idles at 2 m/s',()=>{
  const g=make({player:{carried:5},drifters:[{id:'D1',pos:[10,0.8,0]}]},2);g.step();assert.equal(g.drifters[0].state,'chase');close(g.drifters[0].pos[0],10-7/60);
  const idle=make({player:{carried:4},drifters:[{pos:[10,0.8,0],state:'chase'}]},2);const old=[...idle.drifters[0].pos];idle.step();assert.equal(idle.drifters[0].state,'idle');close(distance(old,idle.drifters[0].pos),2/60);
});
test('drifter steals once before shade hit; immunity and safe zones do not prevent theft',()=>{
  const g=make({player:{carried:10},drifters:[{id:'D1',pos:[0,0.8,0]}],shades:[{pos:[0,0.8,0]}]},2);const e=g.step();assert.deepEqual(e.filter((e)=>['drifter_steal','player_hit'].includes(e.name)).map((e)=>e.name),['drifter_steal','player_hit']);assert.equal(g.player.carried,4);assert.equal(g.drifters[0].stolen,3);assert.equal(steps(g,10).filter((e)=>e.name==='drifter_steal').length,0);
  const safe=make({player:{carried:5,invuln_ticks:90},lanterns:[{id:'L1',pos:[0,0,0],lit:true}],drifters:[{pos:[0,0.8,0]}]},2);safe.step();assert.equal(safe.player.carried,2);assert.equal(safe.player.flames,3);
});
test('pulse repels chasing drifter before theft; fleeing thief drops all and leaves after 120 ticks',()=>{
  const g=make({player:{carried:5},drifters:[{id:'D1',pos:[0,0.8,0],state:'chase'}]},2);const e=g.step({pulse:true});assert.equal(e.filter((e)=>e.name==='drifter_steal').length,0);assert.equal(g.drifters[0].state,'flee');assert.equal(g.player.carried,2);
  const thief=make({player:{carried:3},drifters:[{id:'D1',pos:[3,0.8,0],state:'flee',stolen:3,state_ticks_left:240}]},2);const events=thief.step({pulse:true});assert.deepEqual(events.find((e)=>e.name==='drifter_drop').data,{drifter_id:'D1',amount:3});assert.equal(thief.motes.length,3);assert.ok(thief.motes.every((m)=>m.kind==='dropped'&&m.pos[0]===3));steps(thief,119);assert.equal(thief.drifters.length,1);thief.step();assert.equal(thief.drifters.length,0);
});
test('drifter flee timeout is 240; scheduled spawns occur at 1200 and cap at two',()=>{
  const g=make({drifters:[{pos:[10,0.8,0],state:'flee',stolen:2,state_ticks_left:240}]},2);steps(g,239);assert.equal(g.drifters.length,1);g.step();assert.equal(g.drifters.length,0);
  const spawns=make({random_drifters:true},2);steps(spawns,1199);assert.equal(spawns.drifters.length,0);spawns.step();assert.equal(spawns.drifters[0].id,'D1');steps(spawns,2400);assert.equal(spawns.drifters.length,2);
});
test('charm pickup lasts 600 ticks, speed 7.2 and respawns at 2700',()=>{
  const g=make({charms:[{id:'C1',pos:[0,0,0]}]},2);const e=g.step();assert.deepEqual(e[0].data,{charm_id:'C1',charm_ticks:600});assert.equal(g.player.charmTicks,600);g.step({move:[1,0]});close(g.player.pos[0],0.12);g.step({move:[0,0]});steps(g,598);assert.equal(g.player.charmTicks,0);assert.equal(g.charms[0].available,false);steps(g,2100);assert.equal(g.player.charmTicks,600);assert.equal(g.charms[0].respawnTicks,2700);
});
test('charm dash has no cooldown but still requires edges and ignores presses during dash',()=>{
  const g=make({player:{charm_ticks:600,dash_cd_ticks:90}});g.step({dash:true});assert.equal(g.player.dashCd,0);g.step({dash:false});g.step({dash:true});assert.equal(g.events.filter((e)=>e.name==='dash').length,0);steps(g,20);close(g.player.pos[2],2.8);g.step({dash:false});assert.equal(g.step({dash:true})[0].name,'dash');
});
test('a new charm refreshes an existing buff even with a full carried inventory',()=>{
  const g=make({player:{carried:10,charm_ticks:300},charms:[{id:'C1',pos:[0,0,0]}]},2);g.step();assert.equal(g.player.charmTicks,600);assert.equal(g.player.carried,10);
});
test('wind warns 120 ticks, pushes 2 m/s for 300 ticks, disabled flag is respected',()=>{
  const g=make({player:{pos:[35,0,0]},wind_enabled:true},3);steps(g,1679);assert.equal(g.wind.warning,false);g.step();assert.equal(g.wind.warning,true);assert.equal(g.wind.active,false);steps(g,119);const before=[...g.player.pos];g.step();assert.equal(g.wind.active,true);close(distance(before,g.player.pos),2/60);steps(g,299);assert.equal(g.wind.active,true);g.step();assert.equal(g.wind.active,false);
  const off=make({},3);steps(off,1800);assert.equal(off.wind.active,false);
});
test('replaced early-win rule: all lamps lit stays playing, no time bonus; no-flames beats dawn',()=>{
  const lamps=allLit(1);lamps[4]={id:'L5',pos:[0,0,0]};const g=make({player:{carried:10,flames:2},lanterns:lamps,time_left_s:121});g.step({interact:true});assert.equal(g.state,'playing');assert.equal(g.score,150);g.step();assert.equal(g.score,150);
  const dead=make({player:{flames:0},lanterns:allLit(1)});assert.equal(dead.state,'lost');
});
test('last lamp at dawn wins if alive; zero time or zero flames otherwise loses',()=>{
  const lamps=allLit(1);lamps[4]={id:'L5',pos:[0,0,0]};const g=make({player:{carried:10},lanterns:lamps,time_left_s:1/60});assert.equal(g.step({interact:true}).at(-1).data.reason,'dawn_survived');
  const dawn=make({time_left_s:1/60});assert.equal(dawn.step().at(-1).data.reason,'dawn');const hit=make({player:{flames:1},shades:[{pos:[0,0.8,0]}]});assert.equal(hit.step().at(-1).data.reason,'no_flames');
});
test('scenario replacement, mandatory snapshot arrays, stable ids and seed determinism',()=>{
  const s={...empty,shades:[{id:'S1',pos:[12,0,0]},{pos:[13,0,0]}],drifters:[],charms:[]};const a=new Game(t,{night:2,seed:9,scenario:s}),b=new Game(t,{night:2,seed:9,scenario:s});for(let i=0;i<400;i++){assert.deepEqual(a.step({move:[0,1]}),b.step({move:[0,1]}));assert.deepEqual(a.snapshot(),b.snapshot());}
  const snap=a.snapshot();for(const k of ['night','wind','motes','drifters','charms'])assert.ok(k in snap);for(const k of ['vel','grounded','invuln','dash_cd_s','pulse_cd_s','charm_s'])assert.ok(k in snap.player);
});
test('invalid frames, new scenario fields and night-specific ids are validated',()=>{
  for(const bad of [{frames:[{tick:0},{tick:0}]},{frames:[{tick:2},{tick:1}]},{frames:[{tick:0,move:[2,0]}]},{frames:[{tick:0,pause:1}]},{frames:[{tick:-1}]}])assert.throws(()=>validateInputs(bad),InputError);
  for(const bad of [{player:{pos:[0,0]}},{player:{carried:11}},{player:{charm_ticks:-1}},{lanterns:[{id:'L6'}]},{shades:[{pos:[0,0,0],state:'bad'}]},{random_drifters:'false'}])assert.throws(()=>validateScenario(bad,t,1),InputError);
  assert.doesNotThrow(()=>validateScenario({lanterns:[{id:'L7'}]},t,3));
});
test('CLI v1.2: all nights, tick zero/one, pause snapshots, deterministic bytes and errors',()=>{
  const temp=mkdtempSync(join(tmpdir(),'dao-den-long-v12-'));
  try{
    writeFileSync(join(temp,'scenario.json'),JSON.stringify({...empty,motes:[[0,0,0]]}));writeFileSync(join(temp,'inputs.json'),JSON.stringify({frames:[{tick:0,pause:true},{tick:1,pause:false},{tick:3,pause:true}]}));
    const run=(out,night=1)=>spawnSync(process.execPath,['scripts/headless.mjs','--seed','12','--night',String(night),'--ticks','5','--snapshot-every','1','--scenario',join(temp,'scenario.json'),'--inputs',join(temp,'inputs.json'),'--out',join(temp,out)],{cwd:root,encoding:'utf8'});
    for(const n of [1,2,3])assert.equal(run(`n${n}.jsonl`,n).status,0);assert.equal(run('a.jsonl').status,0);assert.equal(run('b.jsonl').status,0);const raw=readFileSync(join(temp,'a.jsonl'),'utf8');assert.equal(raw,readFileSync(join(temp,'b.jsonl'),'utf8'));
    const lines=raw.trim().split('\n').map(JSON.parse),snaps=lines.filter((r)=>r.type==='snapshot');assert.equal(lines[0].tick,0);assert.equal(lines[1].name,'night_start');assert.equal(snaps[1].state,'paused');assert.equal(snaps[1].sim_tick,0);assert.equal(snaps[4].sim_tick,1);assert.equal(lines.find((r)=>r.name==='mote_picked').tick,4);assert.equal(lines.at(-1).type,'end');
    writeFileSync(join(temp,'inputs.json'),'{bad json');const bad=run('bad.jsonl');assert.equal(bad.status,2);assert.match(bad.stderr,/inputs/);
    writeFileSync(join(temp,'inputs.json'),JSON.stringify({frames:[]}));writeFileSync(join(temp,'scenario.json'),JSON.stringify({player:{dash_cd_ticks:'x'}}));assert.equal(run('bad2.jsonl').status,2);
    const zero=spawnSync(process.execPath,['scripts/headless.mjs','--seed','1','--night','2','--ticks','0','--out',join(temp,'zero.jsonl')],{cwd:root,encoding:'utf8'});assert.equal(zero.status,0);assert.equal(JSON.parse(readFileSync(join(temp,'zero.jsonl'),'utf8').trim().split('\n').at(-1)).ticks,0);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
