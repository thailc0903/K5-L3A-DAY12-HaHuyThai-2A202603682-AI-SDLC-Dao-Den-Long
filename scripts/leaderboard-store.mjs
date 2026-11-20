import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {rankEntries,validateEntry} from '../src/leaderboard.mjs';
export async function readLeaderboard(path){try{return{entries:rankEntries(JSON.parse(await readFile(path,'utf8')).entries)};}catch(e){if(e.code==='ENOENT')return{entries:[]};throw e;}}
export async function saveEntry(path,value){const entry=validateEntry({...value,achieved_at:new Date().toISOString()}),data=await readLeaderboard(path);data.entries=rankEntries([...data.entries,entry]);await mkdir(dirname(path),{recursive:true});const temp=path+'.tmp';await writeFile(temp,JSON.stringify(data,null,2)+'\n');await rename(temp,path);return data;}
