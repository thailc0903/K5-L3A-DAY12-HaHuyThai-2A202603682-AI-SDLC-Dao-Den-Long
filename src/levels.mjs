const rad = (a) => a * Math.PI / 180;
export function ring(cx, cz, radius, count, y = 0, offset = 0) {
  return Array.from({length:count}, (_,i) => [cx+radius*Math.cos(rad(offset+i*360/count)),y,cz+radius*Math.sin(rad(offset+i*360/count))]);
}
const lamps = (positions) => positions.map((pos,i)=>({id:`L${i+1}`,pos,deposited:0,lit:false}));
export function createLevel(night) {
  if(night===1) return {
    night,name:'Đảo Bến',intro:'Ông Đăng: “Ánh sáng không tự tìm được đường về. Con hãy mang từng đốm nhỏ tới năm chiếc đèn.”',
    spawn:[0,0,0],islands:[{x:0,z:0,radius:40}],
    lanterns:lamps([[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]]),
    moteSpawns:[...ring(0,0,12,8),...ring(0,0,33,16)],shadeSpawns:ring(0,0,37,12,0,15),
    pads:[],charms:[],shadeInterval:480,shadeCap:6,wind:false,
  };
  if(night===2) return {
    night,name:'Đảo Cầu Tre',intro:'Ông Đăng: “Qua cầu nhớ giữ bước chân. Gió Lạc thích những túi đầy ánh sáng, còn Bùa Gió sẽ giúp con đi xa.”',
    spawn:[0,0,0],islands:[{x:0,z:0,radius:28},{x:70,z:0,radius:28}],bridge:{minX:26,maxX:44,minZ:-2,maxZ:2},
    lanterns:lamps([[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]]),
    moteSpawns:[...ring(0,0,10,4),...ring(0,0,22,8),...ring(70,0,10,4),...ring(70,0,22,8)],
    shadeSpawns:[...ring(0,0,26,8,0,22.5),...ring(70,0,26,8,0,22.5)],
    pads:[{id:'J1',pos:[20,0,18],radius:1,vy:14,speed:24,target:[70,0,0]},{id:'J2',pos:[50,0,-18],radius:1,vy:14,speed:24,target:[0,0,0]}],
    charms:[{id:'C1',pos:[35,0,0]}],shadeInterval:420,shadeCap:8,wind:false,
  };
  if(night===3) return {
    night,name:'Đảo Tháp Chuông',intro:'Ông Đăng: “Lên dốc, vượt tầng, lắng nghe tiếng chuông. Khi chiếc đèn cuối cùng sáng, bình minh sẽ trở về.”',
    // Ticket does not specify Night 3 spawn; the origin is inside the solid tower.
    spawn:[0,0,-30],islands:[{x:0,z:0,radius:45}],tiers:true,ramps:[30,150],tower:{radius:2,base:6,height:8},
    lanterns:lamps([[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]]),
    moteSpawns:[...ring(0,0,34,18),...Array.from({length:8},(_,i)=>[18*Math.cos(rad(20+i*20)),3,18*Math.sin(rad(20+i*20))]),...ring(0,0,5,4,6,45)],
    shadeSpawns:ring(0,0,43,16),pads:[{id:'J1',pos:[0,3,13],radius:1,vy:12,speed:8,direction:[0,-1]}],
    charms:[{id:'C1',pos:[30,0,25]},{id:'C2',pos:[-30,0,25]}],shadeInterval:360,shadeCap:10,wind:true,
  };
  throw new Error('Night must be 1, 2 or 3');
}
export function surfacesAt(level,x,z) {
  const result=[];
  if(level.islands.some((i)=>Math.hypot(x-i.x,z-i.z)<=i.radius+1e-9)) result.push(0);
  const b=level.bridge;
  if(b&&x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&!result.length)result.push(0);
  if(level.tiers&&result.length){
    const r=Math.hypot(x,z);
    if(r>=12-1e-9&&r<=24+1e-9&&z>0)result.push(3);
    if(r<=8+1e-9)result.push(6);
    for(const angle of level.ramps){const a=rad(angle),along=x*Math.cos(a)+z*Math.sin(a),across=-x*Math.sin(a)+z*Math.cos(a);if(along>=24-1e-9&&along<=30+1e-9&&Math.abs(across)<=1.5+1e-9)result.push(Math.max(0,Math.min(3,(30-along)/2)));}
  }
  return result.sort((a,b)=>a-b);
}
export function floorBelow(level,pos,ceiling=pos[1]+0.001) {
  return surfacesAt(level,pos[0],pos[2]).filter((y)=>y<=ceiling+1e-9).at(-1)??null;
}
export function blocked(level,from,to) {
  if(level.tower&&Math.hypot(to[0],to[2])<level.tower.radius-1e-9&&to[1]<level.tower.base+level.tower.height&&Math.hypot(from[0],from[2])>=level.tower.radius-1e-9)return true;
  const height=surfacesAt(level,to[0],to[2]).at(-1);
  return height!==undefined&&height>from[1]+0.22;
}
