import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {writeFile,readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {dirname,resolve,join,sep,basename} from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {createServer,root} from './server.mjs';
const started=performance.timeOrigin;let browser,server,timer,profile,measurementEnvironment;
try{
  const args=process.argv.slice(2),a={};for(let i=0;i<args.length;i+=2){if(!['--seed','--duration','--out'].includes(args[i])||a[args[i]]!==undefined||!args[i+1])throw Error('Use --seed 42 --duration 30 --out bench.json');a[args[i]]=args[i+1];}
  const seed=Number(a['--seed']),duration=Number(a['--duration']);if(!Number.isSafeInteger(seed)||!Number.isFinite(duration)||duration<=0||!a['--out'])throw Error('Invalid benchmark arguments');
  const executable=[process.env.BENCH_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p)=>p&&existsSync(p));if(!executable)throw Error('Install Chrome/Edge/Chromium or set BENCH_BROWSER to its executable.');
  const out=resolve(a['--out']);await mkdir(dirname(out),{recursive:true});const endpoint='/__bench/'+randomUUID();
  const completed=new Promise((resolveDone,reject)=>{
    server=createServer(async(req,res,url)=>{
      if(process.env.BENCH_DEBUG)res.once('finish',()=>console.log(req.method+' '+url.pathname+' '+res.statusCode));
      if(![endpoint,endpoint+'/scene'].includes(url.pathname))return false;if(req.method!=='POST'){res.writeHead(405);res.end();return true;}
      try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)throw Error('Report too large');chunks.push(chunk);}const body=Buffer.concat(chunks);
        if(url.pathname.endsWith('/scene'))await writeFile(join(dirname(out),'bench-scene.png'),body);
        else{const report=JSON.parse(body);if(report.error)throw Error(report.error);measurementEnvironment=report._environment;delete report._environment;for(const key of ['avg_fps','p1_low_fps','frame_ms_p95','frames','load_ms'])if(!Number.isFinite(report[key])||report[key]<0)throw Error('Invalid report '+key);if(report.frames<1||report.contract_version!=='1.3')throw Error('Invalid benchmark result');await writeFile(out,JSON.stringify(report,null,2)+'\n');resolveDone(report);}
        res.writeHead(200);res.end('ok');
      }catch(e){res.writeHead(400);res.end(e.message);reject(e);}return true;
    });timer=setTimeout(()=>reject(Error('Benchmark timed out; keep the benchmark window visible and WebGL2 enabled.')),Math.max(60000,(duration+30)*1000));
  });
  await new Promise((r)=>server.listen(0,'127.0.0.1',r));profile=await mkdtemp(join(os.tmpdir(),'dao-den-long-bench-'));const url=`http://127.0.0.1:${server.address().port}/benchmark.html?`+new URLSearchParams({seed:String(seed),duration:String(duration),started:String(started),report:endpoint});
  browser=spawn(executable,[`--app=${url}`,'--window-size=1280,720','--force-device-scale-factor=1',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check'],{stdio:'ignore',windowsHide:false});browser.on('error',(e)=>console.error(e.message));
  console.log('Opened standard benchmark window. Do not minimize it.');if(process.env.BENCH_DEBUG)console.log(url);const report=await completed;
  const source={};for(const path of ['game.contract.json','benchmark.html','src/benchmark.mjs','src/bench-browser.mjs','src/view.mjs','src/game.mjs','src/levels.mjs','src/rules.mjs','src/validation.mjs','vendor/three.module.js','scripts/bench.mjs','scripts/server.mjs'])source[path]=createHash('sha256').update((await readFile(resolve(root,path),'utf8')).replace(/\r\n/g,'\n')).digest('hex');
  await writeFile(join(dirname(out),'bench-context.json'),JSON.stringify({seed,duration_s:duration,warmup_s:3,width:1280,height:720,node:process.version,created_at:new Date().toISOString(),environment:measurementEnvironment,source_sha256:source,sample_rule:'Whole frames within the 30s measurement window; warmup and crossing-boundary frames excluded. No outlier filtering.'},null,2)+'\n');console.log(JSON.stringify(report));
}catch(e){console.error(e.message);process.exitCode=1;}
finally{clearTimeout(timer);browser?.kill();if(server)await new Promise((r)=>server.close(r));if(profile&&resolve(profile).startsWith(resolve(os.tmpdir())+sep)&&basename(profile).startsWith('dao-den-long-bench-')){await new Promise((r)=>setTimeout(r,500));await rm(profile,{recursive:true,force:true}).catch(()=>{});}}
