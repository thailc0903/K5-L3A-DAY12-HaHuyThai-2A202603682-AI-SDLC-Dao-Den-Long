import http from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readLeaderboard,saveEntry} from './leaderboard-store.mjs';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const boardPath=()=>resolve(process.env.LEADERBOARD_PATH||resolve(root,'.local/leaderboard.json'));
export function createServer(extra){let queue=Promise.resolve();return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
    const url=new URL(req.url,'http://localhost');if(extra&&await extra(req,res,url))return;
    if(url.pathname==='/api/leaderboard'){
      if(req.method==='GET'){send(200,await readLeaderboard(boardPath()));return;}
      if(req.method!=='POST'){send(405,{error:'Method not allowed'});return;}
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){send(403,{error:'Origin rejected'});return;}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>8192){send(413,{error:'Request too large'});return;}}
      const value=JSON.parse(body),job=queue.then(()=>saveEntry(boardPath(),value));queue=job.catch(()=>{});send(200,await job);return;
    }
    if(!['GET','HEAD'].includes(req.method)){send(405,{error:'Method not allowed'});return;}
    const base=await realpath(root),relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    if(relative.split('/').some((s)=>s.startsWith('.')))throw Error('Not served');
    const path=await realpath(resolve(base,`.${relative}`));if(!path.startsWith(base+sep)||!(await stat(path)).isFile())throw Error('Not served');
    const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.mp4':'video/mp4'};
    const content=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:content);
  }catch(e){if(req.url==='/api/leaderboard')send(400,{error:e.message});else{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}}
});}
