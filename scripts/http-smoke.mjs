import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
try {
  const base=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server startup timed out')),10000);
    child.stdout.on('data',(data)=>{const match=data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
    child.on('error',(e)=>{clearTimeout(timer);reject(e);});
    child.on('exit',(code)=>{clearTimeout(timer);reject(new Error(`Server exited: ${code}`));});
  });
  const checks=[];
  const resources=[['/','text/html'],['/src/style.css','text/css'],['/vendor/three.module.js','text/javascript'],['/game.contract.json','application/json']];
  for(const file of ['browser','game','validation','levels','rules','campaign','settings','audio','performance','view'])resources.push([`/src/${file}.mjs`,'text/javascript']);
  for(const [path,type] of resources) {
    const r=await fetch(base+path); assert.equal(r.status,200,path); assert.ok(r.headers.get('content-type').startsWith(type),path);
    const text=await r.text(); assert.ok(text.length>0,path); checks.push({path,status:r.status,bytes:Buffer.byteLength(text)});
  }
  assert.equal((await fetch(base+'/.git/config')).status,404);
  assert.equal((await fetch(base+'/missing-file')).status,404);
  console.log(JSON.stringify({status:'PASS',checks,limit:'HTTP/assets only; not a browser rendering test.'},null,2));
} finally { child.kill(); }
