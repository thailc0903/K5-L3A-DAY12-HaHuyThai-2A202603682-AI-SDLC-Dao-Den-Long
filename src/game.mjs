import { validateScenario, InputError } from './validation.mjs';
import { createLevel, surfacesAt, floorBelow, blocked } from './levels.mjs';
import { RULES as R } from './rules.mjs';
export const DT=1/60;
const EPS=1e-9;
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const distance3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
export const byId=(a,b)=>{const x=/^(.*?)(\d+)$/.exec(a.id),y=/^(.*?)(\d+)$/.exec(b.id);if(x&&y&&x[1]===y[1])return Number(x[2])-Number(y[2]);return a.id<b.id?-1:a.id>b.id?1:0;};
const round=(a)=>a.map((x)=>{const n=Math.round(x*1000)/1000;return Object.is(n,-0)?0:n;});
const direction=(a,b)=>{let x=b[0]-a[0],z=b[2]-a[2],d=Math.hypot(x,z);return d<EPS?[1,0]:[x/d,z/d];};
const decrease=(object,key)=>{object[key]=Math.max(0,object[key]-1);};
const initialInput=()=>({move:[0,0],cam_yaw_deg:0,jump:false,dash:false,interact:false,pulse:false,pause:false});
export class Game{
  constructor(tuning,{seed=1,night=1,scenario={}}={}){
    if(![1,2,3].includes(night))throw new InputError('Night must be 1, 2 or 3');
    validateScenario(scenario,tuning,night);
    this.tuning={...tuning,score:{...tuning.score}};this.night=night;this.level=createLevel(night);
    this.tick=0;this.simTick=0;this.score=0;this.state='playing';this.events=[];this.input=initialInput();this.seedValue=seed>>>0;
    this.counters={M:1,S:1,D:1};this.ids={M:new Set(),S:new Set(),D:new Set()};
    this.initialTime=scenario.time_left_s??tuning[`night${night}_duration_s`];this.timeLeft=this.initialTime;
    const p=scenario.player??{};
    this.player={pos:[...(p.pos??this.level.spawn)],vel:[...(p.vel??[0,0,0])],carried:p.carried??0,flames:p.flames??tuning.flames,
      invulnTicks:p.invuln_ticks??0,dashCd:p.dash_cd_ticks??0,pulseCd:p.pulse_cd_ticks??0,charmTicks:p.charm_ticks??0,respawnTicks:0,grounded:false};
    this.player.grounded=p.grounded??surfacesAt(this.level,this.player.pos[0],this.player.pos[2]).some((y)=>Math.abs(y-this.player.pos[1])<EPS);
    this.vy=this.player.vel[1];this.facing=[0,1];this.dashLeft=0;this.dashDir=[0,1];this.launch=null;
    this.lanterns=this.level.lanterns.map((l)=>({...l,pos:[...l.pos]}));
    for(const patch of scenario.lanterns??[]){const l=this.lanterns.find((x)=>x.id===patch.id);Object.assign(l,patch);l.pos=[...l.pos];if(patch.lit===true)l.deposited=tuning.lantern_cost;l.lit=l.deposited>=tuning.lantern_cost;}
    this.randomMotes=scenario.random_motes!==false;this.randomShades=scenario.random_shades!==false;this.randomDrifters=night>=2&&scenario.random_drifters!==false;
    this.windEnabled=night===3&&scenario.wind_enabled!==false;this.wind={active:false,dir_deg:0,warning:false};
    this.motes=[];this.shades=[];this.drifters=[];
    if(scenario.motes){for(const m of scenario.motes)if(!Array.isArray(m)&&m.id)this.ids.M.add(m.id);for(const m of scenario.motes){const value=Array.isArray(m)?{pos:m}:m;this.motes.push(this.makeMote(value));}}
    else if(this.randomMotes){const points=this.shuffle(this.level.moteSpawns);this.motes=points.slice(0,R.moteInitial).map((pos)=>this.makeMote({pos}));}
    if(scenario.shades){for(const s of scenario.shades)if(s.id)this.ids.S.add(s.id);this.shades=scenario.shades.map((s)=>this.makeShade(s,true));}
    if(scenario.drifters){for(const d of scenario.drifters)if(d.id)this.ids.D.add(d.id);this.drifters=scenario.drifters.map((d)=>this.makeDrifter(d));}
    this.charms=(scenario.charms??this.level.charms).map((c)=>({id:c.id,pos:[...(c.pos??this.level.charms.find((x)=>x.id===c.id).pos)],available:c.available??true,respawnTicks:c.respawn_ticks??Math.round((c.respawn_s??(c.available===false?45:0))*60)})).sort(byId);
    this.sortEntities();const terminal=this.terminal();if(terminal)this.state=terminal.result;
  }
  random(){this.seedValue=(Math.imul(this.seedValue,1664525)+1013904223)>>>0;return this.seedValue/4294967296;}
  shuffle(values){const list=[...values];for(let i=list.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
  id(kind){while(this.ids[kind].has(`${kind}${this.counters[kind]}`))this.counters[kind]++;const id=`${kind}${this.counters[kind]++}`;this.ids[kind].add(id);return id;}
  sortEntities(){this.motes.sort(byId);this.shades.sort(byId);this.drifters.sort(byId);}
  makeMote(m){const kind=m.kind??'random';return{id:m.id??this.id('M'),pos:[...m.pos],kind,ttl:kind==='dropped'?(m.ttl_ticks??Math.round((m.ttl_s??R.droppedTTL/60)*60)):null,born:this.simTick};}
  makeShade(s,scenario=false){const state=s.state??(scenario?'chase':'spawning'),left=s.state_ticks_left??({spawning:R.shadeSpawnTicks,stunned:120,recoil:R.recoilTicks}[state]??0);
    return{id:s.id??this.id('S'),pos:[...s.pos],state,left,
    pushLeft:state==='recoil'?left:state==='stunned'?Math.max(0,Math.min(15,left-105)):0,pushAmount:state==='recoil'?2/60:4/15,pushDir:direction(this.player.pos,s.pos),safeLeft:0,born:scenario?-1:this.simTick,angle:this.random()*Math.PI*2};}
  makeDrifter(d){return{id:d.id??this.id('D'),pos:[...d.pos],state:d.state??'idle',stolen:d.stolen??0,left:d.state_ticks_left??(d.state==='flee'?R.drifterFleeTicks:0),born:this.simTick-1,angle:this.random()*Math.PI*2};}
  emit(name,data={}){this.events.push({type:'event',tick:this.tick,name,data});}
  initialEvents(){return[{type:'event',tick:0,name:'night_start',data:{night:this.night}}];}
  terminal(){
    if(this.player.flames<=0)return{result:'lost',reason:'no_flames'};
    if(this.lanterns.every((l)=>l.lit))return{result:'won',reason:'all_lit'};
    if(this.timeLeft<=0)return{result:'lost',reason:'dawn'};return null;
  }
  safeAt(pos){return this.lanterns.some((l)=>l.lit&&distance(l.pos,pos)<=this.tuning.safe_radius+EPS);}
  activePlayer(){return this.player.respawnTicks===0&&this.player.flames>0;}
  timers(){
    const p=this.player;for(const k of ['invulnTicks','dashCd','pulseCd','charmTicks'])decrease(p,k);
    this.justRespawned=false;
    if(p.respawnTicks>0){decrease(p,'respawnTicks');if(!p.respawnTicks){p.pos=[...this.level.spawn];p.vel=[0,0,0];p.grounded=true;p.invulnTicks=Math.round(this.tuning.invuln_s*60);this.vy=0;this.dashLeft=0;this.launch=null;this.facing=[0,1];this.justRespawned=true;}}
    if(p.charmTicks>0)p.dashCd=0;
    for(const s of this.shades){decrease(s,'left');if(s.left===0&&['spawning','stunned'].includes(s.state)){s.state='wander';s.pushLeft=0;}}
    for(const d of this.drifters)if(d.state==='flee'){decrease(d,'left');if(d.left===0)d.state='removed';}
    this.drifters=this.drifters.filter((d)=>d.state!=='removed');
    this.motes=this.motes.filter((m)=>{if(m.ttl===null)return true;decrease(m,'ttl');return m.ttl>0;});
    for(const c of this.charms)if(!c.available){decrease(c,'respawnTicks');if(!c.respawnTicks)c.available=true;}
    this.timeLeft=Math.max(0,this.initialTime-this.simTick/60);
    if(this.windEnabled){const phase=this.simTick%R.windPeriod;if(phase===R.windPeriod-R.windWarning)this.wind.dir_deg=this.random()*360;this.wind.active=phase<R.windDuration&&this.simTick>=R.windPeriod;this.wind.warning=phase>=R.windPeriod-R.windWarning;}
  }
  movePlayer(pressed){
    const p=this.player,t=this.tuning;if(!this.activePlayer()||this.justRespawned){p.vel=[0,0,0];return;}
    const old=[...p.pos],wasGrounded=p.grounded;
    const [mx,mz]=this.input.move,scale=Math.max(1,Math.hypot(mx,mz)),a=this.input.cam_yaw_deg*Math.PI/180;
    const move=[(mx*Math.cos(a)+mz*Math.sin(a))/scale,(-mx*Math.sin(a)+mz*Math.cos(a))/scale];
    let jump=false;
    if(pressed('jump')&&p.grounded){this.vy=R.jumpSpeed;p.grounded=false;jump=true;}
    const pad=this.level.pads.find((j)=>p.grounded&&distance(p.pos,j.pos)<=j.radius+EPS&&Math.abs(p.pos[1]-j.pos[1])<0.2);
    if(pad){const dir=pad.direction??direction(pad.pos,pad.target);this.launch=[dir[0]*pad.speed,dir[1]*pad.speed];this.vy=pad.vy;p.grounded=false;jump=true;}
    let horizontal=this.launch??move.map((v)=>v*(p.charmTicks>0?R.charmSpeed:t.player_speed));
    if(Math.hypot(...horizontal)>EPS){const n=Math.hypot(...horizontal);this.facing=horizontal.map((v)=>v/n);}
    if(pressed('dash')&&!this.dashLeft&&(p.dashCd===0||p.charmTicks>0)){
      this.dashDir=[...this.facing];this.dashLeft=Math.round(t.dash_duration_s*60);p.dashCd=p.charmTicks>0?0:Math.round(t.dash_cooldown_s*60);this.emit('dash');
    }
    const dashing=this.dashLeft>0;
    if(dashing)horizontal=this.dashDir.map((v)=>v*t.dash_speed);
    if(this.wind.active){const w=this.wind.dir_deg*Math.PI/180;horizontal=[horizontal[0]+R.windSpeed*Math.cos(w),horizontal[1]+R.windSpeed*Math.sin(w)];}
    const next=[old[0]+horizontal[0]*DT,old[1],old[2]+horizontal[1]*DT];
    if(blocked(this.level,old,next)){next[0]=old[0];next[2]=old[2];}
    const freeze=dashing&&!p.grounded;
    if(!freeze){this.vy-=R.gravity*DT;next[1]+=this.vy*DT;}
    p.grounded=false;
    const floors=surfacesAt(this.level,next[0],next[2]);
    const walk=floors.filter((h)=>Math.abs(h-old[1])<=0.22).at(-1);
    if(wasGrounded&&!jump&&!this.launch&&walk!==undefined){next[1]=walk;this.vy=0;p.grounded=true;}
    else if(!freeze&&this.vy<=0){const land=floors.filter((h)=>h<=old[1]+EPS&&h>=next[1]-EPS).at(-1);if(land!==undefined){next[1]=land;this.vy=0;p.grounded=true;this.launch=null;}}
    p.pos=next;p.vel=[(next[0]-old[0])/DT,(next[1]-old[1])/DT,(next[2]-old[2])/DT];
    if(dashing)this.dashLeft--;
    if(p.pos[1]<R.fallHeight){const lost=p.carried;p.carried=0;p.flames=Math.max(0,p.flames-1);p.respawnTicks=p.flames?R.respawnTicks:0;p.invulnTicks=0;p.vel=[0,0,0];this.dashLeft=0;this.launch=null;this.emit('player_hit',{by:'fall',flames:p.flames,dropped:0,lost});}
  }
  pickup(){const p=this.player,t=this.tuning;if(!this.activePlayer())return;
    this.motes=this.motes.filter((m)=>{if(m.born<this.simTick&&p.carried<t.carry_capacity&&distance(p.pos,m.pos)<=t.pickup_radius+EPS&&Math.abs(p.pos[1]-m.pos[1])<=R.pickupHeight+EPS){p.carried++;this.emit('mote_picked',{carried:p.carried});return false;}return true;});
    for(const c of this.charms)if(c.available&&distance(p.pos,c.pos)<=t.pickup_radius+EPS&&Math.abs(p.pos[1]-c.pos[1])<=R.pickupHeight+EPS){c.available=false;c.respawnTicks=R.charmRespawnTicks;p.charmTicks=R.charmTicks;p.dashCd=0;this.emit('charm_picked',{charm_id:c.id,charm_ticks:R.charmTicks});}
  }
  interact(pressed){const p=this.player,t=this.tuning;if(!this.activePlayer()||!pressed('interact')||!p.carried)return;
    const l=this.lanterns.filter((l)=>!l.lit&&distance(p.pos,l.pos)<=t.interact_radius+EPS).sort((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos)||byId(a,b))[0];
    if(l){const amount=Math.min(p.carried,t.lantern_cost-l.deposited);p.carried-=amount;l.deposited+=amount;this.score+=amount*t.score.per_mote;this.emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});if(l.deposited>=t.lantern_cost){l.lit=true;this.score+=t.score.per_lantern;this.emit('lantern_lit',{lantern_id:l.id});}}
  }
  dropMotes(amount,pos,scatter){for(let i=0;i<amount;i++){let point=[...pos];if(scatter){const a=this.random()*Math.PI*2,r=1.5+this.random();point[0]+=Math.cos(a)*r;point[2]+=Math.sin(a)*r;}point[1]=floorBelow(this.level,point,point[1]+0.22)??point[1];this.motes.push(this.makeMote({pos:point,kind:'dropped',ttl_ticks:R.droppedTTL}));}this.motes.sort(byId);}
  pulse(pressed){const p=this.player,t=this.tuning;if(!this.activePlayer()||!pressed('pulse')||p.pulseCd>0||p.carried<t.pulse_cost)return;
    p.carried-=t.pulse_cost;p.pulseCd=Math.round(t.pulse_cooldown_s*60);const center=[p.pos[0],p.pos[1]+0.8,p.pos[2]],ids=[];
    for(const s of this.shades)if(s.born<this.simTick&&distance3(center,s.pos)<=t.pulse_radius+EPS){s.state='stunned';s.left=Math.round(t.pulse_stun_s*60);s.pushLeft=R.pulsePushTicks;s.pushAmount=t.pulse_push_m/R.pulsePushTicks;s.pushDir=direction(p.pos,s.pos);ids.push(s.id);}
    this.score+=ids.length*t.score.per_stun;this.emit('pulse',{stunned_ids:ids});
    for(const d of this.drifters)if(d.born<this.simTick&&distance3(center,d.pos)<=t.pulse_radius+EPS){
      if(d.state==='chase'){d.state='flee';d.left=R.drifterFleeTicks;}
      else if(d.state==='flee'&&d.stolen>0){const amount=d.stolen;this.dropMotes(amount,d.pos,false);d.stolen=0;d.left=R.drifterDropTicks;this.emit('drifter_drop',{drifter_id:d.id,amount});}
    }
  }
  shadeMove(s,delta){const from=[...s.pos],to=[from[0]+delta[0],from[1],from[2]+delta[1]],under=floorBelow(this.level,from)??0,offset=from[1]-under,foot=[from[0],under,from[2]];
    if(blocked(this.level,foot,[to[0],foot[1],to[2]])||surfacesAt(this.level,to[0],to[2]).length===0)return false;
    for(const l of this.lanterns)if(l.lit&&distance(from,l.pos)>=this.tuning.safe_radius-EPS&&distance(to,l.pos)<this.tuning.safe_radius){const dir=direction(l.pos,to);to[0]=l.pos[0]+dir[0]*this.tuning.safe_radius;to[2]=l.pos[2]+dir[1]*this.tuning.safe_radius;}
    const ground=floorBelow(this.level,[to[0],foot[1],to[2]],foot[1]+0.22);if(ground!==null)to[1]=ground+offset;
    s.pos=to;return true;
  }
  moveShades(){const p=this.player,t=this.tuning;for(const s of this.shades){if(s.born>=this.simTick||s.state==='spawning')continue;
    const safe=this.lanterns.find((l)=>l.lit&&distance(l.pos,s.pos)<t.safe_radius-EPS);
    if(safe&&!s.safeLeft)s.safeLeft=R.safeExitTicks;
    if((s.state==='stunned'||s.state==='recoil')&&s.pushLeft>0){this.shadeMove(s,s.pushDir.map((v)=>v*s.pushAmount));s.pushLeft--;if(safe)s.safeLeft=Math.max(1,s.safeLeft-1);if(s.state==='recoil'&&s.left===0)s.state='wander';continue;}
    if(safe){const dir=direction(safe.pos,s.pos),travel=(t.safe_radius-distance(safe.pos,s.pos))/s.safeLeft;s.pos[0]+=dir[0]*travel;s.pos[2]+=dir[1]*travel;s.safeLeft--;continue;}s.safeLeft=0;
    if(s.state==='stunned'||s.state==='recoil'){
      if(s.pushLeft>0){this.shadeMove(s,s.pushDir.map((v)=>v*s.pushAmount));s.pushLeft--;}
      if(s.state==='recoil'&&s.left===0)s.state='wander';continue;
    }
    const d=distance(p.pos,s.pos);
    if(s.state==='chase'&&(!this.activePlayer()||d>R.shadeForget))s.state='wander';
    if(s.state==='wander'&&this.activePlayer()&&d<=R.shadeDetect)s.state='chase';
    const dir=s.state==='chase'?direction(s.pos,p.pos):[Math.cos(s.angle),Math.sin(s.angle)];
    const speed=(this.night===3?4.5:t.shade_speed)*DT,travel=s.state==='chase'?Math.min(d,speed):speed;
    if(!this.shadeMove(s,dir.map((v)=>v*travel)))s.angle+=Math.PI*0.75;
  }}
  moveDrifters(){const p=this.player;for(const d of this.drifters){if(d.born>=this.simTick||d.state==='removed')continue;
    const chase=this.activePlayer()&&p.carried>=R.drifterCarryThreshold&&distance(p.pos,d.pos)<=R.drifterDetect;
    if(d.state==='idle'&&chase)d.state='chase';else if(d.state==='chase'&&!chase)d.state='idle';
    let dir,speed;if(d.state==='chase'){dir=direction(d.pos,p.pos);speed=Math.min(R.drifterSpeed*DT,distance(d.pos,p.pos));}
    else if(d.state==='flee'){dir=direction(p.pos,d.pos);speed=R.drifterSpeed*DT;}
    else{dir=[Math.cos(d.angle),Math.sin(d.angle)];speed=R.drifterIdleSpeed*DT;d.angle+=0.005;}
    d.pos[0]+=dir[0]*speed;d.pos[2]+=dir[1]*speed;
  }}
  contacts(){const p=this.player,t=this.tuning;if(!this.activePlayer())return;
    for(const d of this.drifters)if(d.born<this.simTick&&['idle','chase'].includes(d.state)&&distance(p.pos,d.pos)<=R.drifterHitRadius+EPS){const amount=Math.min(R.drifterSteal,p.carried);p.carried-=amount;d.stolen=amount;d.state='flee';d.left=R.drifterFleeTicks;this.emit('drifter_steal',{drifter_id:d.id,amount,carried:p.carried});}
    if(p.invulnTicks>0||this.safeAt(p.pos))return;
    const s=this.shades.find((s)=>s.born<this.simTick&&!['spawning','stunned','recoil'].includes(s.state)&&!s.safeLeft&&!this.safeAt(s.pos)&&distance(p.pos,s.pos)<=t.shade_hit_radius+EPS&&Math.abs(p.pos[1]-s.pos[1])<=R.pickupHeight+EPS);
    if(s){p.flames=Math.max(0,p.flames-1);const dropped=Math.floor(p.carried*t.hit_drop_ratio);p.carried-=dropped;this.dropMotes(dropped,p.pos,true);p.invulnTicks=Math.round(t.invuln_s*60);
      s.state='recoil';s.left=R.recoilTicks;s.pushLeft=R.recoilTicks;s.pushAmount=R.recoilDistance/R.recoilTicks;s.pushDir=direction(p.pos,s.pos);this.emit('player_hit',{by:'shade',flames:p.flames,dropped});}
  }
  spawn(){
    if(this.randomMotes&&this.simTick%R.moteSpawnTicks===0&&this.motes.length<R.moteCap){const points=this.level.moteSpawns.filter((pos)=>!this.motes.some((m)=>distance(m.pos,pos)<EPS&&Math.abs(m.pos[1]-pos[1])<EPS));if(points.length)this.motes.push(this.makeMote({pos:points[Math.floor(this.random()*points.length)]}));}
    if(this.randomShades&&this.simTick>=R.shadeFirstTick&&(this.simTick-R.shadeFirstTick)%this.level.shadeInterval===0){const count=this.simTick===R.shadeFirstTick?2:1;for(let i=0;i<count&&this.shades.length<this.level.shadeCap;i++){
      const points=this.level.shadeSpawns.filter((pos)=>distance(pos,this.player.pos)>=15-EPS&&!this.safeAt(pos)&&!this.shades.some((s)=>distance(s.pos,pos)<1));if(!points.length)break;const pos=[...points[Math.floor(this.random()*points.length)]];pos[1]+=R.shadeHeight;const s=this.makeShade({pos});this.shades.push(s);this.emit('shade_spawned',{id:s.id});
    }}
    if(this.randomDrifters&&this.simTick%R.drifterSpawnTicks===0&&this.drifters.length<R.drifterCap){const points=this.level.shadeSpawns;const pos=[...points[Math.floor(this.random()*points.length)]];pos[1]+=0.8;const d=this.makeDrifter({pos});d.born=this.simTick;this.drifters.push(d);}
    this.sortEntities();
  }
  step(patch={}){
    this.events=[];if(['won','lost'].includes(this.state))return this.events;
    const previous=this.input;this.input={...previous,...patch};const pressed=(k)=>this.input[k]&&!previous[k];this.tick++;
    if(pressed('pause')){this.state=this.state==='paused'?'playing':'paused';this.emit(this.state==='paused'?'paused':'resumed');}
    if(this.state==='paused')return this.events;
    this.simTick++;this.timers();this.movePlayer(pressed);this.pickup();this.interact(pressed);
    this.pulse(pressed);this.moveShades();this.moveDrifters();this.contacts();this.spawn();
    const terminal=this.terminal();if(terminal){this.state=terminal.result;if(this.state==='won')this.score+=Math.floor(this.timeLeft)*this.tuning.score.per_second_left+this.player.flames*this.tuning.score.per_flame_left;this.emit('game_over',terminal);}
    return this.events;
  }
  snapshot(){const p=this.player;return{type:'snapshot',tick:this.tick,sim_tick:this.simTick,night:this.night,state:this.state,time_left_s:this.timeLeft,score:this.score,wind:{active:this.wind.active,dir_deg:this.wind.dir_deg},
    player:{pos:round(p.pos),vel:round(p.vel),grounded:p.grounded,invuln:p.invulnTicks>0,flames:p.flames,carried:p.carried,dash_cd_s:p.dashCd/60,pulse_cd_s:p.pulseCd/60,charm_s:p.charmTicks/60,respawn_s:p.respawnTicks/60},
    lanterns:this.lanterns.map((l)=>({id:l.id,pos:round(l.pos),lit:l.lit,deposited:l.deposited})),
    shades:this.shades.map((s)=>({id:s.id,pos:round(s.pos),state:s.state,state_ticks_left:s.left})),
    motes_active:this.motes.length,motes:this.motes.map((m)=>({id:m.id,pos:round(m.pos),kind:m.kind,ttl_s:m.ttl===null?null:m.ttl/60})),
    drifters:this.drifters.map((d)=>({id:d.id,pos:round(d.pos),state:d.state,stolen:d.stolen})),charms:this.charms.map((c)=>({id:c.id,pos:round(c.pos),available:c.available,respawn_s:c.respawnTicks/60}))};}
  end(){return{type:'end',ticks:this.tick,state:this.state,score:this.score};}
}
