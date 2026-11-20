import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {dirname,resolve,join,sep,basename} from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {createServer,root} from './server.mjs';
let browser,server,timer,profile;
try{
  const executable=[process.env.BENCH_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p)=>p&&existsSync(p));if(!executable)throw Error('Chrome/Edge/Chromium is required.');
  const endpoint='/__demo/'+randomUUID(),out=resolve(root,'docs/demo');await mkdir(out,{recursive:true});await mkdir(resolve(root,'docs/proof/phase-4'),{recursive:true});
  const completed=new Promise((resolveDone,reject)=>{
    server=createServer(async(req,res,url)=>{if(!url.pathname.startsWith(endpoint+'/'))return false;if(req.method!=='POST'){res.writeHead(405);res.end();return true;}
      try{const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>100*1024*1024)throw Error('Video exceeds 100MB');chunks.push(c);}const body=Buffer.concat(chunks);
        if(url.pathname.endsWith('/ready'))console.log('Game window ready: '+body.toString());
        else if(url.pathname.endsWith('/metadata'))await writeFile(resolve(root,'docs/proof/phase-4/demo-metadata.json'),body);
        else if(url.pathname.endsWith('/frame'))await writeFile(resolve(root,'docs/proof/phase-4/game-scene.png'),body);
        else if(url.pathname.endsWith('/video')){const mp4=(req.headers['content-type']??'').startsWith('video/mp4'),path=join(out,mp4?'demo.mp4':'demo.webm');await writeFile(path,body);resolveDone({path,bytes:body.length,mp4});}
        else throw Error('Unknown recording route');res.writeHead(200);res.end('ok');
      }catch(e){res.writeHead(400);res.end(e.message);reject(e);}return true;
    });timer=setTimeout(()=>reject(Error('No recording received in ten minutes.')),600000);
  });
  await new Promise((r)=>server.listen(0,'127.0.0.1',r));profile=await mkdtemp(join(os.tmpdir(),'dao-den-long-demo-'));const url=`http://127.0.0.1:${server.address().port}/?demo_report=${encodeURIComponent(endpoint)}`;
  browser=spawn(executable,[`--app=${url}`,'--window-size=1280,720','--force-device-scale-factor=1',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check'],{stdio:'ignore',windowsHide:false});browser.on('error',(e)=>console.error(e.message));
  console.log('Play manually, click Ghi demo game, then Dừng và lưu. Recording is limited to this game canvas.');console.log(url);console.log(JSON.stringify(await completed));
}catch(e){console.error(e.message);process.exitCode=1;}
finally{clearTimeout(timer);browser?.kill();if(server)await new Promise((r)=>server.close(r));if(profile&&resolve(profile).startsWith(resolve(os.tmpdir())+sep)&&basename(profile).startsWith('dao-den-long-demo-')){await new Promise((r)=>setTimeout(r,500));await rm(profile,{recursive:true,force:true}).catch(()=>{});}}
