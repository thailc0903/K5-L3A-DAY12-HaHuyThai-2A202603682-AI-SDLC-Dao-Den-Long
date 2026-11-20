import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Campaign} from '../src/campaign.mjs';
import {normalizeSettings,saveSettings,loadSettings} from '../src/settings.mjs';
import {FrameMeter} from '../src/performance.mjs';
import {Game} from '../src/game.mjs';
import {DEFAULT_BINDINGS} from '../src/bindings.mjs';
import {PALETTE} from '../src/rules.mjs';
const t=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url),'utf8')).tuning;
test('campaign follows all three nights and only counts won nights',()=>{
  const c=new Campaign();assert.equal(c.screen,'menu');assert.equal(c.next(),false);c.intro();assert.equal(c.screen,'intro');c.start();assert.equal(c.screen,'playing');
  for(const night of [1,2,3]){
    const lamps=Array.from({length:night+4},(_,i)=>({id:`L${i+1}`,lit:i<night+3,...(i===night+3?{pos:[0,0,-30]}:{})}));
    const g=new Game(t,{night,scenario:{player:{pos:[0,0,-30],carried:10},lanterns:lamps,random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,time_left_s:1/60}});
    g.step({interact:true});assert.equal(g.state,'won');c.finish(g);const expected=Array.from({length:night},(_,i)=>150+(i+4)*149+150+150).reduce((a,b)=>a+b,0);assert.equal(c.total,expected);c.finish(g);assert.equal(c.total,expected);
    if(night<3){assert.equal(c.next(),true);assert.equal(c.screen,'intro');c.start();}else assert.equal(c.screen,'dawn');
  }
  assert.equal(c.next(),false);c.reset();assert.equal(c.total,0);
});
test('retrying a lost night preserves earlier wins and resets current credit',()=>{
  const c=new Campaign();c.finish({night:1,state:'won',score:900});c.next();c.start();c.finish({night:2,state:'lost',score:300});assert.equal(c.total,900);c.retry();assert.equal(c.screen,'playing');assert.equal(c.night,2);assert.equal(c.total,900);assert.throws(()=>c.finish({night:2,state:'playing',score:400}));
});
test('volume/sensitivity/creative preferences survive storage reload, clamp invalid values',()=>{
  const data=new Map(),storage={getItem:(k)=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  saveSettings(storage,{volume:0.7,sensitivity:0.62,creative:false,colorblind:true,reduceMotion:false,largeText:false,bindings:{...DEFAULT_BINDINGS}});assert.deepEqual(loadSettings(storage),{volume:0.7,sensitivity:0.62,creative:false,colorblind:true,reduceMotion:false,largeText:false,bindings:{...DEFAULT_BINDINGS}});
  assert.deepEqual(normalizeSettings({volume:4,sensitivity:-3}),{volume:1,sensitivity:0.1,creative:true,colorblind:false,reduceMotion:false,largeText:false,bindings:{...DEFAULT_BINDINGS}});assert.equal(normalizeSettings(null).volume,0.35);
  assert.doesNotThrow(()=>loadSettings({getItem:()=>{throw new Error('disabled');}}));assert.doesNotThrow(()=>saveSettings(undefined,{}));
});
test('FPS meter excludes warmup/paused intervals and only passes complete 720p measurements',()=>{
  const m=new FrameMeter();for(let i=0;i<2100;i++)m.sample(i*1000/60,true);const report=m.report({width:1280,height:720});assert.equal(report.complete,true);assert.equal(report.passes,true);assert.ok(Math.abs(report.average_fps-60)<0.01);assert.equal(m.report({width:640,height:360}).passes,false);
  const partial=new FrameMeter();partial.sample(0,true);partial.sample(1000,true);partial.sample(50000,false);partial.sample(100000,true);assert.equal(partial.warmup,1000);assert.equal(partial.report({width:1280,height:720}).passes,false);
});
test('ticket colour palette matches exact hex values',()=>{
  assert.deepEqual(Object.values(PALETTE),['#0E1430','#1B2350','#2F5D50','#C9B48A','#6B4A2F','#12384A','#FFB347','#FFE9B0','#5B5F6E','#FFF6C2','#FFE58A','#120A1A','#7A3CFF','#3A3450','#E8E2D0','#C8102E','#F2C14E','#8FA3B8','#FF5A5F','#F5F1E6']);
});
