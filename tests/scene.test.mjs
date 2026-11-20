// Exercises real Three.js geometry/math on CPU. This is NOT a WebGL, screenshot,
// audio or FPS test; the drawing backend below intentionally does not draw.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/game.mjs';
import {GameView} from '../src/view.mjs';
const t=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url),'utf8')).tuning;
function backend(){return{
  width:0,height:0,info:{render:{calls:0,triangles:0}},
  setPixelRatio(){},setSize(w,h){this.width=w;this.height=h;},
  render(scene,camera){scene.updateMatrixWorld();camera.updateMatrixWorld();},
  getDrawingBufferSize(vector){return vector.set(this.width,this.height);}
};}
test('CPU scene construction/update for all standard maps, without claiming GPU render',()=>{
  const view=new GameView(null,{renderer:backend()});
  for(const night of [1,2,3]){
    const game=new Game(t,{night,scenario:{random_shades:false,random_drifters:false,wind_enabled:false}});view.build(game);view.render(game,0,1000,1/60,true);
    assert.equal(view.maps.lamps.size,night+4);assert.equal(view.motes.count,20);assert.equal(view.ambient.intensity,0.15);assert.equal(view.creative.visible,true);
    view.render(game,45,1016,1/60,false);assert.equal(view.creative.visible,false);assert.doesNotThrow(()=>view.beacon(game));
  }
  view.setBenchmark(true);assert.equal(view.metrics().width,1280);assert.equal(view.metrics().height,720);
});
test('CPU scene responds to real lamp and pulse events, including new enemy models',()=>{
  const game=new Game(t,{night:2,scenario:{random_motes:false,random_shades:false,random_drifters:false,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]}],shades:[{pos:[3,0.8,0]}],drifters:[{pos:[8,0.8,0]}]}});
  const view=new GameView(null,{renderer:backend()});view.build(game);for(const e of game.step({interact:true}))view.onEvent(e,game);view.render(game,0,1000,1/60,true);
  assert.equal(view.maps.lamps.get('L1').userData.core.visible,true);assert.equal(view.maps.lamps.get('L1').userData.safe.visible,true);assert.equal(view.ambient.intensity,0.15+0.55/6);assert.equal(view.maps.shades.size,1);assert.equal(view.maps.drifters.size,1);assert.equal(view.burst.visible,true);
});

test('CPU fuel bar, non-colour lamp shape/tear, threshold and one-Hz blink follow simulation',()=>{
  const game=new Game(t,{scenario:{random_motes:false,random_shades:false,lanterns:[{id:'L1',lit:true,fuel:30},{id:'L2',lit:true,fuel:20}]}}),view=new GameView(null,{renderer:backend()});view.build(game);view.render(game,0,0,1/60,false);
  const a=view.maps.lamps.get('L1').userData,b=view.maps.lamps.get('L2').userData,off=view.maps.lamps.get('L3').userData;
  assert.equal(a.safe.visible,true);assert.equal(b.safe.visible,false);assert.equal(b.bar.visible,true);assert.equal(b.fill.scale.x,0.2);assert.equal(a.body.scale.y,1.2);assert.equal(off.body.scale.y,1.2*0.8);assert.equal(off.tear.visible,true);assert.equal(a.tear.visible,false);assert.equal(off.bar.visible,false);
  for(const [tick,visible]of [[29,true],[30,false],[59,false],[60,true]]){game.simTick=tick;view.render(game,0,tick*1000/60,1/60,false);assert.equal(b.bar.visible,visible);assert.equal(b.core.visible,visible);assert.equal(a.core.visible,true);}
  game.lanterns[0].lit=false;game.lanterns[0].fuelQ=0;view.render(game,0,1000,1/60,false);assert.equal(a.light.intensity,0);assert.equal(a.tear.visible,true);assert.equal(view.ambient.intensity,0.15+0.55/5);
});
test('CPU colour accessibility changes shade eyes and edge; enabling it cannot change headless state',()=>{
  const game=new Game(t,{scenario:{random_shades:false,shades:[{pos:[10,0.8,0]}]}}),view=new GameView(null,{renderer:backend()});view.build(game);const before=game.snapshot();
  view.render(game,0,0,1/60,true,true);assert.equal(view.mat.edge.color.getHexString(),'00b3ff');assert.equal(view.mat.eyes.color.getHexString(),'00b3ff');assert.deepEqual(game.snapshot(),before);
  view.render(game,0,16,1/60,true,false);assert.equal(view.mat.edge.color.getHexString(),'7a3cff');assert.equal(view.mat.eyes.color.getHexString(),'7a3cff');assert.deepEqual(game.snapshot(),before);
});
