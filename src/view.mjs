import * as THREE from '../vendor/three.module.js';
import { PALETTE as P } from './rules.mjs';
import { distance } from './game.mjs';
import { floorBelow } from './levels.mjs';

export class GameView {
  constructor(canvas,{renderer}={}){
    this.renderer=renderer??new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio??1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(P.sky);this.scene.fog=new THREE.FogExp2(P.fog,0.009);
    this.camera=new THREE.PerspectiveCamera(60,16/9,0.1,300);
    this.ambient=new THREE.AmbientLight(P.tunic,0.15);this.scene.add(this.ambient);
    const moon=new THREE.DirectionalLight('#B1C4EA',0.7);moon.position.set(-20,40,12);this.scene.add(moon);
    this.world=new THREE.Group();this.scene.add(this.world);this.maps={lamps:new Map(),shades:new Map(),drifters:new Map(),charms:new Map()};
    this.shared=new Set();const geometry=(g)=>{this.shared.add(g);return g;};
    const lambert=(color)=>new THREE.MeshLambertMaterial({color,flatShading:true});
    this.mat={grass:lambert(P.grass),sand:lambert(P.sand),wood:lambert(P.wood),stone:lambert(P.lanternOff),tunic:lambert(P.tunic),skin:lambert('#DBB189'),
      gold:new THREE.MeshBasicMaterial({color:P.gold}),scarf:lambert(P.scarf),lantern:new THREE.MeshBasicMaterial({color:P.lantern}),core:new THREE.MeshBasicMaterial({color:P.lanternCore}),off:lambert(P.lanternOff),
      shade:new THREE.MeshBasicMaterial({color:P.shade}),stunned:new THREE.MeshBasicMaterial({color:P.stunned}),edge:new THREE.LineBasicMaterial({color:P.shadeEdge}),
      mote:new THREE.MeshBasicMaterial({color:P.mote}),glow:new THREE.MeshBasicMaterial({color:P.moteGlow,transparent:true,opacity:0.16,depthWrite:false}),
      drifter:new THREE.MeshBasicMaterial({color:P.drifter,side:THREE.DoubleSide}),cloud:new THREE.MeshBasicMaterial({color:P.clouds,transparent:true,opacity:0.8})};
    this.geo={mote:geometry(new THREE.OctahedronGeometry(0.16)),glow:geometry(new THREE.SphereGeometry(0.34,8,6)),shade:geometry(new THREE.IcosahedronGeometry(0.65,1)),eye:geometry(new THREE.SphereGeometry(0.075,6,4))};
    this.motes=new THREE.InstancedMesh(this.geo.mote,this.mat.mote,256);this.moteGlows=new THREE.InstancedMesh(this.geo.glow,this.mat.glow,256);this.motes.frustumCulled=false;this.moteGlows.frustumCulled=false;this.scene.add(this.motes,this.moteGlows);
    this.dummy=new THREE.Object3D();this.player=this.createPlayer();this.scene.add(this.player);
    this.shadow=this.add(new THREE.CircleGeometry(0.55,16),new THREE.MeshBasicMaterial({color:'#080C19',transparent:true,opacity:0.4,depthWrite:false}),this.scene);this.shadow.rotation.x=-Math.PI/2;
    this.pulse=this.add(new THREE.SphereGeometry(1,24,12),new THREE.MeshBasicMaterial({color:P.lantern,wireframe:true,transparent:true,opacity:0,depthWrite:false}),this.scene);this.pulseAge=9;
    this.creative=new THREE.Group();this.scene.add(this.creative);this.constellation=[];
    const starPoints=[];for(let i=0;i<170;i++){const a=i*2.399963,h=10+(i*31%110),r=Math.sqrt(230*230-h*h);starPoints.push(Math.cos(a)*r,h,Math.sin(a)*r);}
    const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPoints,3));this.scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:P.text,size:0.22,fog:false})));
    for(let i=0;i<7;i++){
      const a=new THREE.Vector3(-24+i*8,12+Math.sin(i*0.9)*2,-75),b=new THREE.Vector3(-16+i*8,12+Math.sin((i+1)*0.9)*2,-75);
      const star=this.add(new THREE.OctahedronGeometry(0.45),new THREE.MeshBasicMaterial({color:P.gold,fog:false}),this.creative,a.toArray());
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:P.gold,transparent:true,opacity:0.7,fog:false}));this.creative.add(line);this.constellation.push({star,line});
    }
    this.burstPositions=new Float32Array(48*3);const burstGeo=new THREE.BufferGeometry();burstGeo.setAttribute('position',new THREE.BufferAttribute(this.burstPositions,3));
    this.burst=new THREE.Points(burstGeo,new THREE.PointsMaterial({color:P.moteGlow,size:0.14,transparent:true,opacity:0}));this.burst.frustumCulled=false;this.creative.add(this.burst);this.burstAge=9;
    this.leaves=[];for(let i=0;i<18;i++){const leaf=this.add(new THREE.OctahedronGeometry(0.12),new THREE.MeshBasicMaterial({color:P.sand}),this.scene);leaf.scale.set(1,0.15,2.5);leaf.visible=false;this.leaves.push(leaf);}
    this.cameraGoal=new THREE.Vector3();this.look=new THREE.Vector3();this.screenPoint=new THREE.Vector3();this.cameraForward=new THREE.Vector3();this.offset=new THREE.Vector3();
    this.benchmark=false;this.resize();
  }
  add(g,m,parent,pos=[0,0,0]){const mesh=new THREE.Mesh(g,m);mesh.position.set(...pos);parent.add(mesh);return mesh;}
  createPlayer(){const g=new THREE.Group();this.add(new THREE.ConeGeometry(0.42,0.9,10),this.mat.tunic,g,[0,0.7,0]);this.add(new THREE.SphereGeometry(0.27,12,8),this.mat.skin,g,[0,1.35,0]);
    this.add(new THREE.ConeGeometry(0.65,0.32,24),this.mat.sand,g,[0,1.65,0]);this.add(new THREE.BoxGeometry(0.6,0.12,0.18),this.mat.scarf,g,[0,1.13,0.05]);
    this.add(new THREE.CylinderGeometry(0.035,0.035,0.48,6),this.mat.wood,g,[0.55,1.3,0]);this.add(new THREE.SphereGeometry(0.14,8,6),this.mat.lantern,g,[0.55,1,0]);
    this.feet=[-0.15,0.15].map((x)=>this.add(new THREE.BoxGeometry(0.16,0.3,0.24),this.mat.wood,g,[x,0.15,0]));
    const light=new THREE.PointLight(P.lantern,7,10,2);light.position.set(0,1,0);g.add(light);return g;
  }
  clearWorld(){const sharedMaterials=new Set(Object.values(this.mat));this.world.traverse((o)=>{if(o.geometry&&!this.shared.has(o.geometry))o.geometry.dispose();for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))if(!sharedMaterials.has(m))m.dispose();});this.world.clear();for(const map of Object.values(this.maps))map.clear();}
  build(game){this.clearWorld();const l=game.level;
    for(const island of l.islands){this.add(new THREE.CylinderGeometry(island.radius,island.radius-4,6,64),this.mat.stone,this.world,[island.x,-3.08,island.z]);this.add(new THREE.CylinderGeometry(island.radius,island.radius,0.16,64),this.mat.grass,this.world,[island.x,-0.08,island.z]);
      const rim=this.add(new THREE.RingGeometry(island.radius-0.8,island.radius,64),new THREE.MeshLambertMaterial({color:P.sand,side:THREE.DoubleSide}),this.world,[island.x,0.015,island.z]);rim.rotation.x=-Math.PI/2;
      for(let i=0;i<12;i++){const a=i*Math.PI/6,cloud=this.add(new THREE.SphereGeometry(1,12,8),this.mat.cloud,this.world,[island.x+Math.cos(a)*(island.radius+8),-6+(i%3)*0.5,island.z+Math.sin(a)*(island.radius+8)]);cloud.scale.set(8,1.8,5);}
    }
    if(l.bridge){for(let i=0;i<36;i++)this.add(new THREE.BoxGeometry(0.47,0.18,4),this.mat.wood,this.world,[26.25+i*0.5,-0.09,0]);for(const z of [-1.7,1.7])this.add(new THREE.BoxGeometry(18,0.2,0.12),this.mat.sand,this.world,[35,-0.22,z]);}
    if(l.tiers){
      const shape=new THREE.Shape(),steps=48;for(let i=0;i<=steps;i++){const a=i*Math.PI/steps,x=24*Math.cos(a),y=-24*Math.sin(a);if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}for(let i=steps;i>=0;i--){const a=i*Math.PI/steps;shape.lineTo(12*Math.cos(a),-12*Math.sin(a));}shape.closePath();
      const ring=new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false,steps:1});ring.rotateX(-Math.PI/2);this.add(ring,[this.mat.grass,this.mat.stone],this.world);
      this.add(new THREE.CylinderGeometry(8,8,6,48),this.mat.grass,this.world,[0,3,0]);
      for(const deg of l.ramps){const a=deg*Math.PI/180,u=[Math.cos(a),Math.sin(a)],v=[-u[1],u[0]],points=[];for(const [r,y,w] of [[30,0,-1.5],[30,0,1.5],[24,3,-1.5],[24,3,1.5]])points.push(r*u[0]+w*v[0],y,r*u[1]+w*v[1]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex([0,2,1,1,2,3]);geo.computeVertexNormals();this.add(geo,new THREE.MeshLambertMaterial({color:P.sand,side:THREE.DoubleSide}),this.world);}
      this.add(new THREE.CylinderGeometry(2,2,8,16),this.mat.stone,this.world,[0,10,0]);this.add(new THREE.ConeGeometry(2.7,2,12),this.mat.wood,this.world,[0,15,0]);this.add(new THREE.SphereGeometry(0.9,12,8),this.mat.gold,this.world,[0,13,0]);
    }
    for(const pad of l.pads){const ring=this.add(new THREE.RingGeometry(0.72,1,32),this.mat.gold,this.world,[pad.pos[0],pad.pos[1]+0.03,pad.pos[2]]);ring.rotation.x=-Math.PI/2;const marker=this.add(new THREE.ConeGeometry(0.25,0.5,4),this.mat.scarf,this.world,[pad.pos[0],pad.pos[1]+0.35,pad.pos[2]]);marker.rotation.x=Math.PI;}
    for(const lamp of game.lanterns){const g=new THREE.Group();g.position.set(...lamp.pos);this.world.add(g);this.maps.lamps.set(lamp.id,g);
      this.add(new THREE.CylinderGeometry(0.11,0.16,2.4,8),this.mat.wood,g,[0,1.2,0]);this.add(new THREE.BoxGeometry(1.45,0.16,0.2),this.mat.wood,g,[0,2.45,0]);this.add(new THREE.ConeGeometry(0.85,0.35,8),this.mat.wood,g,[0,2.8,0]);
      const body=this.add(new THREE.SphereGeometry(0.58,12,8),this.mat.off,g,[0,2.1,0]);body.scale.y=1.2;const core=this.add(new THREE.SphereGeometry(0.29,8,6),this.mat.core,g,[0,2.1,0.4]);core.visible=false;
      const light=new THREE.PointLight(P.lantern,0,17,2);light.position.y=2.1;g.add(light);
      const safe=this.add(new THREE.RingGeometry(5.94,6,48),new THREE.MeshBasicMaterial({color:P.gold,transparent:true,opacity:0.25,side:THREE.DoubleSide}),g,[0,0.035,0]);safe.rotation.x=-Math.PI/2;safe.visible=false;g.userData={body,core,light,safe};
    }
    for(const c of game.charms){const g=new THREE.Group();this.world.add(g);this.maps.charms.set(c.id,g);this.add(new THREE.BoxGeometry(0.42,0.65,0.08),this.mat.scarf,g);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.45,0.68,0.1)),new THREE.LineBasicMaterial({color:P.gold}));g.add(edge);this.add(new THREE.BoxGeometry(0.08,0.25,0.12),this.mat.gold,g);}
    this.pulseAge=9;this.burstAge=9;this.camera.position.set(game.player.pos[0],game.player.pos[1]+7,game.player.pos[2]+12);
  }
  shadeView(s){const g=new THREE.Group();this.world.add(g);const body=this.add(this.geo.shade,this.mat.shade,g);body.scale.set(1,1.3,1);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(this.geo.shade),this.mat.edge);edge.scale.copy(body.scale);g.add(edge);for(const x of [-0.2,0.2])this.add(this.geo.eye,this.mat.gold,g,[x,0.16,0.56]);g.userData.body=body;this.maps.shades.set(s.id,g);return g;}
  drifterView(d){const g=new THREE.Group();this.world.add(g);for(let i=0;i<3;i++){const ribbon=this.add(new THREE.PlaneGeometry(1.8,0.16,8,1),this.mat.drifter,g,[0,i*0.18,0]);ribbon.rotation.y=i*0.3;}this.maps.drifters.set(d.id,g);return g;}
  onEvent(event,game){if(event.name==='pulse'){this.pulseAge=0;this.pulse.position.set(game.player.pos[0],game.player.pos[1]+0.8,game.player.pos[2]);}
    if(event.name==='lantern_lit'){const l=game.lanterns.find((l)=>l.id===event.data.lantern_id);this.burstOrigin=[l.pos[0],l.pos[1]+2,l.pos[2]];this.burstAge=0;}}
  render(game,yaw,now,elapsed,creative){
    const p=game.player,lit=game.lanterns.filter((l)=>l.lit).length;this.ambient.intensity=0.15+0.55*lit/game.lanterns.length;
    this.player.position.set(...p.pos);this.player.rotation.y=Math.atan2(game.facing[0],game.facing[1]);this.player.visible=p.respawnTicks===0&&!(p.invulnTicks>0&&Math.floor(game.simTick/5)%2===0);
    const moving=Math.hypot(p.vel[0],p.vel[2])>0.2;this.feet.forEach((f,i)=>f.rotation.x=moving?Math.sin(game.simTick*0.28+i*Math.PI)*0.5:0);
    const floor=floorBelow(game.level,p.pos);this.shadow.visible=floor!==null&&p.respawnTicks===0;if(floor!==null)this.shadow.position.set(p.pos[0],floor+0.025,p.pos[2]);
    const count=Math.min(256,game.motes.length);this.motes.count=count;this.moteGlows.count=count;
    for(let i=0;i<count;i++){const m=game.motes[i];this.dummy.position.set(m.pos[0],m.pos[1]+0.6+Math.sin(now/350+i)*0.12,m.pos[2]);this.dummy.rotation.set(0,now/700+i,0);this.dummy.updateMatrix();this.motes.setMatrixAt(i,this.dummy.matrix);this.moteGlows.setMatrixAt(i,this.dummy.matrix);}this.motes.instanceMatrix.needsUpdate=true;this.moteGlows.instanceMatrix.needsUpdate=true;
    for(const l of game.lanterns){const d=this.maps.lamps.get(l.id).userData;d.body.material=l.lit?this.mat.lantern:this.mat.off;d.core.visible=l.lit;d.light.intensity=l.lit?32:0;d.safe.visible=l.lit;}
    for(const s of game.shades){const g=this.maps.shades.get(s.id)??this.shadeView(s);g.position.set(s.pos[0],s.pos[1]+Math.sin(now/300)*0.04,s.pos[2]);g.rotation.y=Math.atan2(p.pos[0]-s.pos[0],p.pos[2]-s.pos[2]);g.scale.setScalar(s.state==='spawning'?Math.max(0.1,1-s.left/60):1);g.userData.body.material=s.state==='stunned'?this.mat.stunned:this.mat.shade;}
    const active=new Set(game.drifters.map((d)=>d.id));for(const [id,g]of this.maps.drifters)g.visible=active.has(id);
    for(const d of game.drifters){const g=this.maps.drifters.get(d.id)??this.drifterView(d);g.position.set(d.pos[0],d.pos[1]+Math.sin(now/180)*0.15,d.pos[2]);g.rotation.y=Math.atan2(p.pos[0]-d.pos[0],p.pos[2]-d.pos[2]);for(let i=0;i<g.children.length;i++)g.children[i].rotation.z=Math.sin(now/160+i)*0.3;}
    for(const c of game.charms){const g=this.maps.charms.get(c.id);g.visible=c.available;g.position.set(c.pos[0],c.pos[1]+0.8+Math.sin(now/400)*0.15,c.pos[2]);g.rotation.y=now/900;}
    this.pulseAge+=elapsed;this.pulse.visible=this.pulseAge<0.5;this.pulse.scale.setScalar(Math.max(0.01,game.tuning.pulse_radius*this.pulseAge/0.5));this.pulse.material.opacity=Math.max(0,0.45*(1-this.pulseAge/0.5));
    this.creative.visible=creative;this.constellation.forEach((c,i)=>{c.star.visible=i<lit;c.line.visible=i<lit-1;});this.burstAge+=elapsed;this.burst.visible=this.burstAge<1.5;
    if(this.burst.visible){for(let i=0;i<48;i++){const a=i*2.399963,r=this.burstAge*(1+i%5*0.2);this.burstPositions[i*3]=this.burstOrigin[0]+Math.cos(a)*r;this.burstPositions[i*3+1]=this.burstOrigin[1]+this.burstAge*2-this.burstAge*this.burstAge+i%3*0.1;this.burstPositions[i*3+2]=this.burstOrigin[2]+Math.sin(a)*r;}this.burst.geometry.attributes.position.needsUpdate=true;this.burst.material.opacity=1-this.burstAge/1.5;}
    const wind=game.wind.active||game.wind.warning,w=game.wind.dir_deg*Math.PI/180;this.leaves.forEach((leaf,i)=>{leaf.visible=wind;if(wind){const along=((now/1000*(game.wind.active?9:3)+i*1.7)%22)-11,side=Math.sin(i*2.4)*7;leaf.position.set(p.pos[0]+Math.cos(w)*along-Math.sin(w)*side,p.pos[1]+1+(i%5)*0.6,p.pos[2]+Math.sin(w)*along+Math.cos(w)*side);leaf.rotation.set(i,now/500+i,i);}});
    const a=yaw*Math.PI/180;this.cameraGoal.set(p.pos[0]+Math.sin(a)*12,p.pos[1]+7,p.pos[2]+Math.cos(a)*12);this.camera.position.lerp(this.cameraGoal,1-Math.exp(-Math.min(elapsed,0.1)*12));this.look.set(p.pos[0]-Math.sin(a)*3,p.pos[1]+1.4,p.pos[2]-Math.cos(a)*3);this.camera.lookAt(this.look);
    this.renderer.render(this.scene,this.camera);
  }
  beacon(game){const l=game.lanterns.filter((l)=>!l.lit).sort((a,b)=>distance(a.pos,game.player.pos)-distance(b.pos,game.player.pos))[0];if(!l)return null;
    this.screenPoint.set(l.pos[0],l.pos[1]+2,l.pos[2]);this.offset.copy(this.screenPoint).sub(this.camera.position);this.camera.getWorldDirection(this.cameraForward);const behind=this.offset.dot(this.cameraForward)<0;this.screenPoint.project(this.camera);
    if(!behind&&Math.abs(this.screenPoint.x)<0.92&&Math.abs(this.screenPoint.y)<0.86&&this.screenPoint.z<1)return null;
    let x=this.screenPoint.x,y=-this.screenPoint.y;if(behind){x=-x;y=-y;}if(Math.hypot(x,y)<0.01)y=1;const scale=Math.max(Math.abs(x),Math.abs(y),0.001);return{id:l.id,metres:Math.round(distance(l.pos,game.player.pos)),x:x/scale,y:y/scale,angle:Math.atan2(y,x)*180/Math.PI+90};
  }
  setBenchmark(enabled){this.benchmark=enabled;this.resize();}
  resize(){const width=this.benchmark?1280:(globalThis.innerWidth??1280),height=this.benchmark?720:(globalThis.innerHeight??720);this.renderer.setPixelRatio(this.benchmark?1:Math.min(globalThis.devicePixelRatio??1,1.5));this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
  metrics(){const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());return{width:size.x,height:size.y,draw_calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
}
