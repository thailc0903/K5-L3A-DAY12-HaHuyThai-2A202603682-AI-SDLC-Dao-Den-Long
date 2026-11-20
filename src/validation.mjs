export class InputError extends Error {}
const fail=(m)=>{throw new InputError(m);};
const object=(v,n)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(`${n} must be an object`);};
const number=(v,n,min=-Infinity,max=Infinity,int=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(int&&!Number.isSafeInteger(v)))fail(`${n}: invalid ${int?'integer':'number'}`);};
const bool=(v,n)=>{if(typeof v!=='boolean')fail(`${n} must be boolean`);};
const keys=(v,a,n)=>{for(const k of Object.keys(v))if(!a.includes(k))fail(`${n}: unknown field ${k}`);};
const pos=(v,n)=>{if(!Array.isArray(v)||v.length!==3)fail(`${n} must be [x,y,z]`);v.forEach((x)=>number(x,n));};
const ticks=(v,n)=>number(v,n,0,Number.MAX_SAFE_INTEGER,true);
function list(v,n,check){if(!Array.isArray(v))fail(`${n} must be an array`);const ids=new Set();v.forEach((item,i)=>{check(item,`${n}[${i}]`);if(!Array.isArray(item)&&item.id!==undefined){if(typeof item.id!=='string'||!item.id||ids.has(item.id))fail(`${n}: invalid or duplicate id`);ids.add(item.id);}});}
export function validateInputs(input={frames:[]}){
  object(input,'inputs');keys(input,['frames'],'inputs');if(!Array.isArray(input.frames))fail('inputs.frames must be an array');
  let previous=-1;
  input.frames.forEach((f,i)=>{const n=`frames[${i}]`;object(f,n);keys(f,['tick','move','cam_yaw_deg','jump','interact','pulse','dash','pause'],n);ticks(f.tick,`${n}.tick`);if(f.tick<=previous)fail('frame ticks must increase strictly');previous=f.tick;
    if('move'in f){if(!Array.isArray(f.move)||f.move.length!==2)fail(`${n}.move must be [x,z]`);f.move.forEach((x)=>number(x,`${n}.move`,-1,1));}
    if('cam_yaw_deg'in f)number(f.cam_yaw_deg,`${n}.cam_yaw_deg`);
    for(const k of ['jump','interact','pulse','dash','pause'])if(k in f)bool(f[k],`${n}.${k}`);
  });return input;
}
export function validateScenario(s={},t,night=1){
  object(s,'scenario');keys(s,['player','random_motes','random_shades','random_drifters','wind_enabled','motes','shades','lanterns','drifters','charms','time_left_s'],'scenario');
  for(const k of ['random_motes','random_shades','random_drifters','wind_enabled'])if(k in s)bool(s[k],k);
  if('time_left_s'in s)number(s.time_left_s,'time_left_s',0);
  if('player'in s){const p=s.player;object(p,'player');keys(p,['pos','carried','flames','invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks','vel','grounded'],'player');
    if('pos'in p)pos(p.pos,'player.pos');if('vel'in p)pos(p.vel,'player.vel');if('grounded'in p)bool(p.grounded,'player.grounded');
    if('carried'in p)number(p.carried,'player.carried',0,t.carry_capacity,true);if('flames'in p)ticks(p.flames,'player.flames');
    for(const k of ['invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks'])if(k in p)ticks(p[k],`player.${k}`);
  }
  if('motes'in s)list(s.motes,'motes',(m,n)=>{
    if(Array.isArray(m))return pos(m,n);object(m,n);keys(m,['id','pos','kind','ttl_s','ttl_ticks'],n);pos(m.pos,`${n}.pos`);
    if('kind'in m&&!['random','dropped'].includes(m.kind))fail(`${n}.kind must be random/dropped`);
    if('ttl_s'in m&&m.ttl_s!==null)number(m.ttl_s,`${n}.ttl_s`,0);if('ttl_ticks'in m)ticks(m.ttl_ticks,`${n}.ttl_ticks`);
  });
  if('lanterns'in s)list(s.lanterns,'lanterns',(l,n)=>{object(l,n);keys(l,['id','pos','deposited','lit'],n);
    if(!new RegExp(`^L[1-${night+4}]$`).test(l.id))fail(`${n}.id is not a lantern of night ${night}`);
    if('pos'in l)pos(l.pos,`${n}.pos`);if('deposited'in l)number(l.deposited,`${n}.deposited`,0,t.lantern_cost,true);if('lit'in l)bool(l.lit,`${n}.lit`);
    if(l.lit===false&&l.deposited===t.lantern_cost)fail(`${n}: full lantern cannot be unlit`);
  });
  if('shades'in s)list(s.shades,'shades',(e,n)=>{object(e,n);keys(e,['id','pos','state','state_ticks_left'],n);pos(e.pos,`${n}.pos`);
    if('state'in e&&!['spawning','wander','chase','recoil','stunned'].includes(e.state))fail(`${n}.state is invalid`);if('state_ticks_left'in e)ticks(e.state_ticks_left,`${n}.state_ticks_left`);
  });
  if('drifters'in s)list(s.drifters,'drifters',(e,n)=>{object(e,n);keys(e,['id','pos','state','stolen','state_ticks_left'],n);pos(e.pos,`${n}.pos`);
    if('state'in e&&!['idle','chase','flee','removed'].includes(e.state))fail(`${n}.state is invalid`);if('stolen'in e)number(e.stolen,`${n}.stolen`,0,3,true);if('state_ticks_left'in e)ticks(e.state_ticks_left,`${n}.state_ticks_left`);
  });
  if('charms'in s)list(s.charms,'charms',(e,n)=>{object(e,n);keys(e,['id','pos','available','respawn_ticks','respawn_s'],n);
    if(typeof e.id!=='string'||!e.id)fail(`${n}.id is required`);if('pos'in e)pos(e.pos,`${n}.pos`);else if(!(night===2&&e.id==='C1')&&!(night===3&&['C1','C2'].includes(e.id)))fail(`${n}.pos is required`);
    if('available'in e)bool(e.available,`${n}.available`);if('respawn_ticks'in e)ticks(e.respawn_ticks,`${n}.respawn_ticks`);if('respawn_s'in e)number(e.respawn_s,`${n}.respawn_s`,0);
  });return s;
}
