import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {Game} from '../src/game.mjs';
import {seeded} from '../src/benchmark.mjs';
try{
  const args=process.argv.slice(2),a={};for(let i=0;i<args.length;i+=2){if(!['--seed','--nights','--out'].includes(args[i])||a[args[i]]!==undefined||!args[i+1])throw Error('Use --seed 7 --nights 10 --out soak.json');a[args[i]]=args[i+1];}
  const seed=Number(a['--seed']),nights=Number(a['--nights']);if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(nights)||nights<1||!a['--out'])throw Error('Invalid soak arguments');
  const {tuning}=JSON.parse(await readFile(new URL('../game.contract.json',import.meta.url),'utf8')),start=performance.now();
  let game=new Game(tuning,{night:1,seed}),memStart=(global.gc?.(),process.memoryUsage().rss),crashes=0;const results=[];
  for(let i=0;i<nights;i++){
    if(i)game=new Game(tuning,{night:i%3+1,seed:seed+i});const random=seeded(seed+i);let move=[0,0];
    try{for(let tick=0;tick<tuning[`night${game.night}_duration_s`]*60&&!['won','lost'].includes(game.state);tick++){if(tick%30===0){const angle=random()*2*Math.PI;move=[Math.cos(angle),Math.sin(angle)];}game.step({move,jump:random()<0.05,dash:random()<0.03,pulse:random()<0.02,interact:random()<0.1});}results.push(game.state);}catch{crashes++;results.push('crashed');}
  }
  game=new Game(tuning,{night:(nights-1)%3+1,seed:seed+nights-1});
  const output={nights,crashes,results,mem_start_mb:memStart/1048576,mem_end_mb:(global.gc?.(),process.memoryUsage().rss/1048576),duration_s:(performance.now()-start)/1000};
  await mkdir(dirname(resolve(a['--out'])),{recursive:true});await writeFile(a['--out'],JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
  if(crashes||output.mem_end_mb>1.2*output.mem_start_mb)process.exitCode=1;
}catch(e){console.error(e.message);process.exitCode=2;}
