// Records only this game's rendered canvas and an explicit HUD, never the desktop.
export class CanvasRecorder{
  constructor(canvas,readHUD,onComplete){this.canvas=canvas;this.readHUD=readHUD;this.onComplete=onComplete;}
  start(){
    if(!globalThis.MediaRecorder)throw Error('Trình duyệt chưa hỗ trợ ghi video.');
    this.output=document.createElement('canvas');this.output.width=1280;this.output.height=720;const ctx=this.output.getContext('2d');
    const paint=()=>{ctx.drawImage(this.canvas,0,0,1280,720);ctx.fillStyle='#0e1430e6';ctx.fillRect(0,0,1280,112);ctx.fillStyle='#f5f1e6';ctx.font='20px system-ui';this.readHUD().forEach((s,i)=>ctx.fillText(s,20,28+i*26));};this.draw=paint;this.started=performance.now();
    const stream=this.output.captureStream(30),mime=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'].find((m)=>MediaRecorder.isTypeSupported(m));if(!mime){this.cancel();throw Error('Không có codec ghi hình phù hợp.');}
    this.chunks=[];this.recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});this.recorder.ondataavailable=(e)=>{if(e.data.size)this.chunks.push(e.data);};this.recorder.start(1000);this.limit=setTimeout(()=>this.stop(),240000);this.stream=stream;
  }
  stop(){if(!this.recorder||this.recorder.state==='inactive')return;this.recorder.onstop=async()=>{const blob=new Blob(this.chunks,{type:this.recorder.mimeType}),info={duration_s:(performance.now()-this.started)/1000,codec:this.recorder.mimeType,width:1280,height:720,source:'Manual gameplay canvas with live HUD and previously generated proof metrics; silent video.'};try{if(this.onComplete)await this.onComplete(blob,this.output,info);else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=this.recorder.mimeType.startsWith('video/mp4')?'demo.mp4':'demo.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}finally{this.cancel();}};this.recorder.stop();}
  cancel(){this.draw=undefined;clearTimeout(this.limit);this.stream?.getTracks().forEach((t)=>t.stop());}
}
