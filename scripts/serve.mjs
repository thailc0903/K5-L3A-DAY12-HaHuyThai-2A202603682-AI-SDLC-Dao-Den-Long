import {readLeaderboard} from './leaderboard-store.mjs';
import {createServer,boardPath} from './server.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const args=process.argv.slice(2);
try{
  if(args.length){if(args.length!==2||args[0]!=='--export-leaderboard')throw Error('Use --export-leaderboard out.json');const data=await readLeaderboard(boardPath());await mkdir(dirname(resolve(args[1])),{recursive:true});await writeFile(args[1],JSON.stringify(data,null,2)+'\n');console.log(`Exported ${data.entries.length} entries.`);}
  else{const server=createServer();server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Đảo Đèn Lồng: http://127.0.0.1:${server.address().port}`));server.on('error',(e)=>{console.error(e.message);process.exitCode=1;});}
}catch(e){console.error(e.message);process.exitCode=2;}
