import {Game,DT,distance} from './game.mjs';
import {GameView} from './view.mjs';
import {Campaign} from './campaign.mjs';
import {loadSettings,saveSettings} from './settings.mjs';
import {GameAudio} from './audio.mjs';
import {FrameMeter} from './performance.mjs';
const $=(id)=>document.getElementById(id);
try{
  const response=await fetch('/game.contract.json');if(!response.ok)throw new Error('Không đọc được game.contract.json');
  const {tuning}=await response.json();const view=new GameView($('game')),campaign=new Campaign(),meter=new FrameMeter();
  let storage;try{storage=globalThis.localStorage;}catch{}
  let settings=loadSettings(storage);const query=new URLSearchParams(location.search);if(query.get('creative')==='0')settings.creative=false;
  const audio=new GameAudio(settings.volume),held=new Set();let game=new Game(tuning,{seed:12}),mode='menu',settingsFrom='menu',yaw=0,dragX=null,pauseQueue=0,accumulator=0,last=performance.now(),lastSecond=300,windWarning=false,frameNumber=0;
  let measuring=query.get('benchmark')==='1';if(measuring)view.setBenchmark(true);view.build(game);
  const slots=Array.from({length:10},()=>{const slot=document.createElement('i');$('slots').appendChild(slot);return slot;});
  const bind=(id,fn)=>{$(id).onclick=fn;};
  function resetGame(){game=new Game(tuning,{night:campaign.night,seed:12});view.build(game);yaw=0;accumulator=0;last=performance.now();pauseQueue=0;held.clear();lastSecond=Math.ceil(game.timeLeft);windWarning=false;}
  function setMode(next){mode=next;held.clear();$('overlay').hidden=mode==='playing';const inGame=['playing','paused'].includes(mode)||(mode==='settings'&&settingsFrom==='paused');$('hud').hidden=!inGame;$('bottom').hidden=!inGame;if(mode==='playing'){$('game').focus();return;}renderPanel();}
  async function start(){await audio.unlock();campaign.start();setMode('playing');last=performance.now();accumulator=0;audio.setPlaying(true,campaign.night);if(measuring)meter.reset();}
  async function retry(){campaign.retry();resetGame();await start();}
  function main(){audio.setPlaying(false);campaign.reset();resetGame();setMode('menu');}
  function intro(){resetGame();campaign.intro();setMode('intro');}
  function requestPause(){if(['playing','paused'].includes(mode))pauseQueue=game.input.pause?2:1;}
  function openSettings(){settingsFrom=mode;audio.setPlaying(false);setMode('settings');}
  function back(){setMode(settingsFrom);}
  function renderPanel(){
    const panel=$('panel');
    if(mode==='menu'){
      panel.innerHTML='<span class="eyebrow">MỘT HÀNH TRÌNH QUA BA ĐÊM</span><h1>Đảo Đèn Lồng<span>Mang ánh sáng trở về.</span></h1><p>Sương đen phủ kín biển mây. Cùng Mây đi qua Đảo Bến, vượt cầu tre và lên Tháp Chuông để đón một bình minh mới.</p><div class="actions vertical"><button id="new-game">Bắt đầu hành trình</button><button id="settings" class="secondary">Cài đặt</button><button id="help" class="secondary">Cách chơi</button></div><p class="small">Tai nghe được khuyến khích · Tự động lưu cài đặt</p>';
      bind('new-game',()=>{campaign.reset();intro();});bind('settings',openSettings);bind('help',()=>setMode('help'));
    }else if(mode==='intro'){
      panel.innerHTML=`<span class="eyebrow">ĐÊM ${game.night} / 3</span><h2>${game.level.name}</h2><p class="quote">${game.level.intro}</p><p>Thắp ${game.lanterns.length} đèn · ${Math.floor(game.initialTime/60)} phút ${Math.round(game.initialTime%60)} giây · 3 Ngọn Lửa</p><p class="small">Mỗi đèn cần 10 đom đóm. Giữ lại 3 đom đóm khi cần Tỏa Sáng.</p><div class="actions"><button id="begin">Bước vào Đêm ${game.night}</button><button id="menu" class="secondary">Về menu</button></div>`;
      bind('begin',start);bind('menu',main);
    }else if(mode==='paused'){
      panel.innerHTML=`<span class="eyebrow">ĐÊM ${game.night} · ${game.level.name.toUpperCase()}</span><h2>Một chút nghỉ chân</h2><p>Thời gian, kẻ địch và mọi hồi chiêu đang dừng.</p><div class="actions vertical"><button id="resume">Tiếp tục</button><button id="retry" class="secondary">Chơi lại Đêm</button><button id="settings" class="secondary">Cài đặt</button><button id="menu" class="secondary">Về menu</button></div>`;
      bind('resume',requestPause);bind('retry',retry);bind('settings',openSettings);bind('menu',main);
    }else if(mode==='settings'){
      panel.innerHTML=`<span class="eyebrow">CÀI ĐẶT</span><h2>Theo nhịp của bạn</h2><label>Âm lượng <output id="volume-value">${Math.round(settings.volume*100)}%</output><input id="volume" type="range" min="0" max="1" step="0.01" value="${settings.volume}"></label><label>Độ nhạy chuột <output id="sensitivity-value">${settings.sensitivity.toFixed(2)}</output><input id="sensitivity" type="range" min="0.1" max="1" step="0.01" value="${settings.sensitivity}"></label><label class="check"><input id="creative" type="checkbox" ${settings.creative?'checked':''}> Dải sao, hạt sáng và âm sắc theo từng đèn</label><p class="small">Các hiệu ứng sáng tạo chỉ hiển thị ở bản thường. Cài đặt tự lưu trên trình duyệt này.</p><div class="actions"><button id="back">Quay lại</button></div>`;
      const save=()=>{settings=saveSettings(storage,{volume:Number($('volume').value),sensitivity:Number($('sensitivity').value),creative:$('creative').checked});audio.setVolume(settings.volume);$('volume-value').textContent=`${Math.round(settings.volume*100)}%`;$('sensitivity-value').textContent=settings.sensitivity.toFixed(2);};
      $('volume').oninput=save;$('sensitivity').oninput=save;$('creative').onchange=save;bind('back',back);
    }else if(mode==='help'){
      panel.innerHTML='<span class="eyebrow">CÁCH CHƠI</span><h2>Gom từng đốm sáng</h2><p>WASD / mũi tên để đi, Space để nhảy, Shift để lướt. Kéo chuột xoay camera.</p><p>Nhặt đom đóm vàng tự động, mang tối đa 10. Gần đèn, nhấn E để nạp. Q tiêu 3 đom đóm để xua Bóng Mực; đèn đã sáng tạo vùng an toàn.</p><p>Từ Đêm 2: Gió Lạc cướp đom đóm; tỏa sáng để đòi lại khi nó đang chạy trốn. Bùa đỏ tăng tốc và bỏ hồi chiêu lướt. Cẩn thận mép đảo, cầu và gió ở Đêm 3.</p><p>Esc/P tạm dừng. Thắp hết đèn trước khi hết giờ; giữ ít nhất một Ngọn Lửa.</p><div class="actions"><button id="menu">Đã hiểu</button></div>';
      bind('menu',()=>setMode('menu'));
    }else if(mode==='result'||mode==='dawn'){
      const won=game.state==='won';panel.innerHTML=`<span class="eyebrow">${mode==='dawn'?'HÀNH TRÌNH HOÀN THÀNH':`KẾT QUẢ ĐÊM ${game.night}`}</span><h2>${mode==='dawn'?'Bình Minh':won?'Một hòn đảo đã sáng':'Mây vẫn còn một cơ hội'}</h2><p>${mode==='dawn'?'Ông Đăng: “Từng đốm sáng nhỏ đã nối thành một bầu trời. Con đã đưa bình minh về nhà.”':won?'Những chiếc đèn đã sáng. Một đêm mới đang đợi ở phía trước.':game.player.flames===0?'Mây đã mất hết Ngọn Lửa. Lần tới hãy dùng Lướt, Tỏa Sáng và vùng sáng để tự vệ.':'Bình minh đã đến trước khi các đèn được thắp hết. Bạn có thể chơi lại Đêm này.'}</p><div class="results"><div><span>Điểm Đêm này</span><b>${game.score}</b></div><div><span>Tổng các Đêm đã thắng</span><b>${campaign.total}</b></div></div><div class="actions">${won&&game.night<3?'<button id="next">Đêm kế tiếp</button>':!won?'<button id="retry">Chơi lại Đêm này</button>':''}<button id="menu" class="secondary">Về menu</button></div>`;
      if(won&&game.night<3)bind('next',()=>{campaign.next();intro();});if(!won)bind('retry',retry);bind('menu',main);
    }
    queueMicrotask(()=>panel.querySelector('button')?.focus());
  }
  function handleEvent(event){view.onEvent(event,game);if(event.name==='game_over'){audio.event(game.state==='won'?'game_won':'game_lost');return;}audio.event(event.name,{creative:settings.creative,index:game.lanterns.filter((l)=>l.lit).length-1});}
  function input(){const key=(...codes)=>codes.some((c)=>held.has(c));let pause=false;if(pauseQueue>0){pause=pauseQueue===1;pauseQueue--;}
    return{move:[Number(key('KeyD','ArrowRight'))-Number(key('KeyA','ArrowLeft')),Number(key('KeyS','ArrowDown'))-Number(key('KeyW','ArrowUp'))],cam_yaw_deg:yaw,jump:key('Space'),dash:key('ShiftLeft','ShiftRight'),interact:key('KeyE'),pulse:key('KeyQ'),pause};}
  window.addEventListener('keydown',(e)=>{
    if(['Escape','KeyP'].includes(e.code)&&!e.repeat){if(['playing','paused'].includes(mode)){e.preventDefault();requestPause();return;}if(mode==='settings'&&e.code==='Escape'){back();return;}}
    if(mode==='playing'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();held.add(e.code);
  });
  window.addEventListener('keyup',(e)=>held.delete(e.code));window.addEventListener('blur',()=>{held.clear();if(mode==='playing')requestPause();});
  document.addEventListener('visibilitychange',()=>{held.clear();last=performance.now();accumulator=0;if(document.hidden)audio.setPlaying(false);});
  $('game').addEventListener('pointerdown',(e)=>{if(mode==='playing'){dragX=e.clientX;$('game').setPointerCapture(e.pointerId);}});
  $('game').addEventListener('pointermove',(e)=>{if(dragX!==null&&mode==='playing'){yaw-=(e.clientX-dragX)*settings.sensitivity;dragX=e.clientX;}});
  for(const event of ['pointerup','pointercancel'])$('game').addEventListener(event,()=>dragX=null);
  bind('pause',requestPause);window.addEventListener('resize',()=>view.resize());
  bind('benchmark',()=>{measuring=true;meter.reset();view.setBenchmark(true);$('export-fps').hidden=true;$('fps-label').textContent='1280×720 · bắt đầu chơi để đo 30 giây';});
  bind('export-fps',()=>{const report=meter.report({...view.metrics(),night:game.night,creative:settings.creative,user_agent:navigator.userAgent});const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='phase-2-fps.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  function updateHUD(){const p=game.player;$('night-name').textContent=`Đêm ${game.night} · ${game.level.name}`;$('health').textContent=Array.from({length:tuning.flames},(_,i)=>i<p.flames?'●':'○').join(' ');
    const seconds=Math.ceil(game.timeLeft);$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('timer').classList.toggle('danger',game.timeLeft<=30);
    $('lit').textContent=`${game.lanterns.filter((l)=>l.lit).length} / ${game.lanterns.length}`;$('score').textContent=game.score;$('total').textContent=campaign.total;
    slots.forEach((slot,i)=>slot.classList.toggle('full',i<p.carried));$('carry').textContent=`${p.carried} / 10 đom đóm`;$('charm').textContent=p.charmTicks?`Bùa Gió · ${(p.charmTicks/60).toFixed(1)} s`:'';
    $('dash-status').textContent=p.charmTicks?'Bùa Gió · không hồi chiêu':p.dashCd?`${(p.dashCd/60).toFixed(1)} s`:'Sẵn sàng';$('dash-cooldown').classList.toggle('waiting',p.dashCd>0&&!p.charmTicks);
    $('pulse-status').textContent=p.pulseCd?`${(p.pulseCd/60).toFixed(1)} s`:p.carried<3?'Cần 3 đom đóm':'Sẵn sàng';$('pulse-cooldown').classList.toggle('waiting',p.pulseCd>0||p.carried<3);
    const near=game.lanterns.filter((l)=>!l.lit&&distance(l.pos,p.pos)<=tuning.interact_radius).sort((a,b)=>distance(a.pos,p.pos)-distance(b.pos,p.pos))[0];
    $('hint').textContent=p.respawnTicks?`Mây đang trở về · ${(p.respawnTicks/60).toFixed(1)} s`:near?`E — Nạp ánh sáng (${near.deposited}/10)`:game.safeAt(p.pos)?'Bạn đang ở vùng sáng an toàn.':p.carried===10?'Túi đã đầy · Hãy mang ánh sáng về đèn.':'Gom đom đóm để thắp đèn';
    $('wind').hidden=!['playing','paused'].includes(mode)||!(game.wind.warning||game.wind.active);$('wind').textContent=game.wind.active?'Gió mạnh! · Cẩn thận mép đảo':'Lá đang bay… Gió mạnh tới sau 2 giây!';
    const target=mode==='playing'?view.beacon(game):null;$('beacon').hidden=!target;if(target){const width=innerWidth,height=innerHeight;$('beacon').style.left=`${width/2+target.x*(width/2-70)-24}px`;$('beacon').style.top=`${height/2+target.y*(height/2-150)-24}px`;$('beacon').querySelector('.beacon-arrow').style.transform=`rotate(${target.angle}deg)`;$('beacon-label').textContent=`${target.id} · ${target.metres} m`;}
  }
  function frame(now){
    requestAnimationFrame(frame);const elapsed=Math.min((now-last)/1000,0.1);last=now;
    const ticking=['playing','paused'].includes(mode)||(mode==='settings'&&settingsFrom==='paused');
    if(ticking&&!document.hidden){accumulator+=elapsed;while(accumulator>=DT&&ticking){const priorGround=game.player.grounded,priorJump=game.input.jump,priorLaunch=game.launch,control=input();const events=game.step(control);for(const e of events)handleEvent(e);
      if((control.jump&&!priorJump&&priorGround&&game.player.vel[1]>0)||(!priorLaunch&&game.launch))audio.event('jump');
      if(game.wind.warning&&!windWarning)audio.event('wind');windWarning=game.wind.warning;
      const second=Math.ceil(game.timeLeft);if(second!==lastSecond&&second<=10&&second>0)audio.event('countdown');lastSecond=second;accumulator-=DT;
      if(game.state==='paused'&&mode==='playing'){audio.setPlaying(false);setMode('paused');dragX=null;}
      if(game.state==='playing'&&mode==='paused'){setMode('playing');audio.setPlaying(true,game.night);}
      if(['won','lost'].includes(game.state)){campaign.finish(game);audio.setPlaying(false);setMode(campaign.screen);accumulator=0;break;}
    }}
    view.render(game,yaw,now,elapsed,settings.creative);if(++frameNumber%3===0)updateHUD();
    if(measuring){meter.sample(now,mode==='playing'&&!document.hidden);if(frameNumber%15===0){$('fps-label').textContent=meter.warmup<3000?'1280×720 · làm nóng 3 giây':`${meter.fps.toFixed(1)} FPS · ${(meter.elapsed/1000).toFixed(0)}/30 s${meter.done?' · '+(meter.fps>=30?'Đạt':'Chưa đạt'):''}`;$('export-fps').hidden=!meter.done;}}
  }
  setMode('menu');updateHUD();requestAnimationFrame(frame);
}catch(error){$('overlay').hidden=true;$('error').hidden=false;$('error').textContent=`Không mở được game: ${error.message}. Hãy dùng trình duyệt hỗ trợ WebGL2 và chạy node scripts/serve.mjs.`;console.error(error);}
