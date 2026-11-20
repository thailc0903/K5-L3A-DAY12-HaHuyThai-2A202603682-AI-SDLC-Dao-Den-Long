import {GameView} from './view.mjs';
import {benchmarkScene,stepBenchmark,orbit,frameStats} from './benchmark.mjs';
import {REVISION} from '../vendor/three.module.js';
const q=new URLSearchParams(location.search),endpoint=q.get('report'),duration=Number(q.get('duration')),started=Number(q.get('started')),status=document.getElementById('status');
let reportedError=false;
const fail=async(error)=>{if(reportedError)return;reportedError=true;status.textContent=error?.message??String(error);if(endpoint)await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:status.textContent})});};
window.addEventListener('error',(e)=>void fail(e.error??e.message));window.addEventListener('unhandledrejection',(e)=>void fail(e.reason));
try{
  const {tuning}=await(await fetch('/game.contract.json')).json(),game=benchmarkScene(tuning,Number(q.get('seed'))),view=new GameView(document.getElementById('game'));view.setBenchmark(true);view.build(game);
  let first=null,last=null,accumulator=0,load=0,done=false;const samples=[],environment={hidden_frames:0,unfocused_frames:0,visibility_changes:[]};document.addEventListener('visibilitychange',()=>environment.visibility_changes.push({ms:performance.now(),state:document.visibilityState}));
  const frame=async(now)=>{
    if(done)return;if(document.hidden)environment.hidden_frames++;if(!document.hasFocus())environment.unfocused_frames++;const initial=first===null;if(initial){first=now;last=now;}
    const previous=last,delta=now-last,seconds=(now-first)/1000;last=now;accumulator+=Math.min(delta,1000)/1000;while(accumulator>=1/60){stepBenchmark(game);accumulator-=1/60;}
    view.render(game,0,now,delta/1000,false,false,{orbit:orbit(seconds)});
    if(initial)load=Date.now()-started;
    if(previous>=first+3000&&now<=first+(3+duration)*1000&&delta>0)samples.push(delta);
    status.textContent=seconds<3?'Khởi động · 3 giây':`Đo cảnh chuẩn · ${Math.min(duration,seconds-3).toFixed(1)}/${duration} s · 200 Bóng Mực · 100 đom đóm`;
    if(seconds>=3+duration){done=true;const gl=view.renderer.getContext(),report={contract_version:'1.3',...frameStats(samples),load_ms:load,peak_mem_mb:null,vsync_off:false,renderer:`Three.js r${REVISION} / ${gl.getParameter(gl.VERSION)}`,os:navigator.userAgent,_environment:environment};
      const blob=await new Promise((r)=>document.getElementById('game').toBlob(r,'image/png'));if(blob)await fetch(endpoint+'/scene',{method:'POST',body:blob});
      await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});status.textContent='Đã lưu kết quả benchmark';return;
    }requestAnimationFrame(frame);
  };requestAnimationFrame(frame);
}catch(e){await fail(e);}
