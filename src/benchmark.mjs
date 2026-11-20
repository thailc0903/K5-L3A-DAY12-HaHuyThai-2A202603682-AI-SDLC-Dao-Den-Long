import {Game} from './game.mjs';
export function seeded(seed){let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
export function benchmarkScene(tuning,seed=42){
  const random=seeded(seed),angle=random()*2*Math.PI;
  const points=(n,height)=>Array.from({length:n},(_,i)=>{const a=angle+i*Math.PI*(3-Math.sqrt(5)),r=36*Math.sqrt((i+0.5)/n);return[r*Math.cos(a),height,r*Math.sin(a)];});
  const game=new Game(tuning,{seed,night:1,scenario:{random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,charms:[],motes:points(100,0),shades:points(200,0.8).map((pos,i)=>({id:`S${i+1}`,pos,state:'wander'})),lanterns:[1,2,3].map((i)=>({id:`L${i}`,lit:true,fuel:100}))}});
  game.activePlayer=()=>false; // Bench: no perception/chase, damage, pickup or player input.
  return game;
}
export function stepBenchmark(game){game.simTick++;game.moveShades();}
export function orbit(seconds){const a=2*Math.PI*seconds/15;return[30*Math.cos(a),15,-30*Math.sin(a)];}
export function frameStats(samples){if(!samples.length||samples.some((x)=>!Number.isFinite(x)||x<=0))throw new Error('No valid frame samples');const sorted=[...samples].sort((a,b)=>a-b),n=sorted.length,k=Math.max(1,Math.ceil(0.01*n)),slow=sorted.slice(-k);return{avg_fps:1000*n/sorted.reduce((a,b)=>a+b,0),p1_low_fps:1000*k/slow.reduce((a,b)=>a+b,0),frame_ms_p95:sorted[Math.ceil(0.95*n)-1],frames:n};}
