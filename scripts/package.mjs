import {readdir,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './server.mjs';
import {makeZip} from './zip.mjs';
const paths=[];
async function walk(dir){for(const e of await readdir(resolve(root,dir),{withFileTypes:true})){if(e.name==='.pending'||e.isSymbolicLink()||['package-check.json','package-summary.json','clean-index-summary.json','clean-index-comparison.json'].includes(e.name)&&dir==='docs/proof/phase-4')continue;const path=dir+'/'+e.name;if(e.isDirectory())await walk(path);else paths.push(path);}}
for(const dir of ['src','scripts','tests','vendor','docs','.github','.githooks'])await walk(dir);
for(const name of ['index.html','benchmark.html','game.contract.json','package.json','play.ps1','LICENSE','.gitignore','.gitattributes',...(await readdir(root)).filter((n)=>n.endsWith('.md'))])if((await stat(resolve(root,name))).isFile())paths.push(name);
paths.sort();const entries=await Promise.all(paths.map(async(p)=>['dao-den-long/'+p,await readFile(resolve(root,p))]));entries.push(['dao-den-long/START-HERE.txt',Buffer.from('Dao Den Long v1.0.0\nRequires Node.js 20+ and a WebGL2 browser.\n1. Extract this archive.\n2. Open a terminal in dao-den-long.\n3. Run: node scripts/serve.mjs\nOpen http://127.0.0.1:4173\nFull guide: docs/game/README.md\nOriginal lab README is preserved at the student\'s request.\n')]);
const out=join(root,'dist');await mkdir(out,{recursive:true});const zip=makeZip(entries),name='dao-den-long-v1.0.0.zip';await writeFile(join(out,name),zip);const sha=createHash('sha256').update(zip).digest('hex');await writeFile(join(out,'SHA256SUMS.txt'),`${sha}  ${name}\n`);console.log(JSON.stringify({archive:'dist/'+name,files:entries.length,bytes:zip.length,sha256:sha}));
