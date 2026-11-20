export class FrameMeter {
  constructor(){this.reset();}
  reset(){this.last=null;this.warmup=0;this.elapsed=0;this.frames=0;this.done=false;}
  sample(now,active){if(!active){this.last=null;return;}if(this.last===null){this.last=now;return;}const delta=now-this.last;this.last=now;if(delta<=0)return;if(this.warmup<3000){this.warmup+=delta;return;}if(!this.done){this.elapsed+=delta;this.frames++;if(this.elapsed>=30000)this.done=true;}}
  get fps(){return this.elapsed?this.frames*1000/this.elapsed:0;}
  report(info){return{...info,warmup_ms:this.warmup,measured_ms:this.elapsed,frames:this.frames,average_fps:this.fps,complete:this.done,passes:this.done&&this.fps>=30&&info.width===1280&&info.height===720};}
}
