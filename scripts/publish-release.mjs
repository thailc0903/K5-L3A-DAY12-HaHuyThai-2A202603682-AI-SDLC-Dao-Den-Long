// Operator-only: credentials stay in memory; never written to the package or logs.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
const repo='thailc0903/K5-L3A-DAY12-HaHuyThai-2A202603682-AI-SDLC-Dao-Den-Long',tag='v1.0.0';
try{
  let token=process.env.GH_TOKEN;if(!token){const credential=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}});token=credential.split('\n').find((l)=>l.startsWith('password='))?.slice(9);}if(!token)throw Error('No GitHub credential available.');
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'dao-den-long-release'};
  const request=async(url,options={})=>{const r=await fetch(url,{...options,headers:{...headers,...options.headers}});if(!r.ok)throw Error(`GitHub HTTP ${r.status}: ${(await r.text()).slice(0,500)}`);return r.status===204?null:r.json();};
  const base=`https://api.github.com/repos/${repo}`,visibility=await request(base);if(visibility.private)throw Error('Repository is private; a public repository is required.');const existing=await fetch(base+'/releases/tags/'+tag,{headers});let release;
  if(existing.status===404)release=await request(base+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,name:'Đảo Đèn Lồng v1.0.0',body:await readFile('docs/notes/v1.0.0-release.md','utf8'),draft:true,prerelease:false})});
  else if(existing.ok)release=await existing.json();else throw Error('Cannot inspect existing release: HTTP '+existing.status);
  if(!release.draft)throw Error('Release already published; refusing to overwrite it.');
  for(const path of ['dist/dao-den-long-v1.0.0.zip','dist/SHA256SUMS.txt','docs/demo/demo.mp4','docs/proof/phase-4/bench.json','docs/proof/phase-4/soak.json']){const name=basename(path);if(release.assets?.some((a)=>a.name===name))throw Error('Draft already contains '+name+'; inspect it before retrying.');await request(`https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,{method:'POST',headers:{'Content-Type':name.endsWith('.zip')?'application/zip':name.endsWith('.mp4')?'video/mp4':'application/octet-stream'},body:await readFile(path)});}
  release=await request(base+'/releases/'+release.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:false})});
  await mkdir('dist',{recursive:true});await writeFile(resolve('dist/release.json'),JSON.stringify({url:release.html_url,tag:release.tag_name,published_at:release.published_at,public_repository:!visibility.private,assets:release.assets.map((a)=>({name:a.name,size:a.size,url:a.browser_download_url}))},null,2)+'\n');console.log(release.html_url);
}catch(e){console.error(e.message);process.exitCode=1;}
