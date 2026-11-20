import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file=new URL('../docs/demo/demo.mp4',import.meta.url),b=await readFile(file);
function boxes(start,end){const result=[];for(let i=start;i+8<=end;){let size=b.readUInt32BE(i),header=8;const type=b.toString('ascii',i+4,i+8);if(size===1){size=Number(b.readBigUInt64BE(i+8));header=16;}if(!size)size=end-i;if(size<header||i+size>end)throw Error('Invalid MP4 box');result.push({type,p:i+header,end:i+size});i+=size;}return result;}
const top=boxes(0,b.length),moov=top.find((x)=>x.type==='moov');if(!top.some((x)=>x.type==='ftyp')||!moov||!top.some((x)=>x.type==='mdat'))throw Error('Not a complete MP4');
const children=(box)=>boxes(box.p,box.end),tracks=new Map(),defaults=new Map();
for(const trak of children(moov).filter((x)=>x.type==='trak')){const list=children(trak),tkhd=list.find((x)=>x.type==='tkhd'),mdia=list.find((x)=>x.type==='mdia'),mdhd=children(mdia).find((x)=>x.type==='mdhd'),id=b.readUInt32BE(tkhd.p+(b[tkhd.p]===1?20:12)),scale=b.readUInt32BE(mdhd.p+(b[mdhd.p]===1?20:12));tracks.set(id,{scale,end:0});}
const mvex=children(moov).find((x)=>x.type==='mvex');if(mvex)for(const x of children(mvex).filter((x)=>x.type==='trex'))defaults.set(b.readUInt32BE(x.p+4),b.readUInt32BE(x.p+12));
for(const moof of top.filter((x)=>x.type==='moof'))for(const traf of children(moof).filter((x)=>x.type==='traf')){
  const list=children(traf),h=list.find((x)=>x.type==='tfhd'),id=b.readUInt32BE(h.p+4),flags=b.readUIntBE(h.p+1,3);let p=h.p+8;if(flags&1)p+=8;if(flags&2)p+=4;let duration=(flags&8)?b.readUInt32BE(p):(defaults.get(id)??0);
  const tfdt=list.find((x)=>x.type==='tfdt');let end=tfdt?(b[tfdt.p]===1?Number(b.readBigUInt64BE(tfdt.p+4)):b.readUInt32BE(tfdt.p+4)):tracks.get(id).end;
  for(const run of list.filter((x)=>x.type==='trun')){const f=b.readUIntBE(run.p+1,3),n=b.readUInt32BE(run.p+4);let p=run.p+8;if(f&1)p+=4;if(f&4)p+=4;for(let i=0;i<n;i++){end+=(f&0x100)?b.readUInt32BE(p):duration;if(f&0x100)p+=4;if(f&0x200)p+=4;if(f&0x400)p+=4;if(f&0x800)p+=4;}if(p>run.end)throw Error('Invalid MP4 samples');}tracks.get(id).end=Math.max(tracks.get(id).end,end);
}
const mvhd=children(moov).find((x)=>x.type==='mvhd'),version=b[mvhd.p],scale=b.readUInt32BE(mvhd.p+(version===1?20:12)),ticks=version===1?Number(b.readBigUInt64BE(mvhd.p+24)):b.readUInt32BE(mvhd.p+16),duration=Math.max(ticks/scale,...[...tracks.values()].map((x)=>x.end/x.scale));
if(!Number.isFinite(duration)||duration<=0||duration>=300)throw Error('Video duration must be >0 and <300s');
const output={container:'MP4',duration_s:duration,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),under_five_minutes:true,scope:'Container/sample timestamp validation; see game-scene.png for the captured frame and demo-metadata.json for recorder details.'};
const out=process.argv[2]==='--out'?process.argv[3]:new URL('../docs/proof/phase-4/video-check.json',import.meta.url);await writeFile(out,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
