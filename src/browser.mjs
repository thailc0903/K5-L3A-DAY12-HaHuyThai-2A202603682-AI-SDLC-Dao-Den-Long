import * as THREE from '../vendor/three.module.js';
import { Game, DT, distance } from './game.mjs';

const $ = (id) => document.getElementById(id);
try {
  const response = await fetch('/game.contract.json');
  if (!response.ok) throw new Error('Không đọc được game.contract.json');
  const { tuning } = await response.json();
  const canvas = $('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101324');
  scene.fog = new THREE.FogExp2('#17182f', 0.018);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 160);
  const ambient = new THREE.HemisphereLight('#a1b2e8', '#29332e', 1.3); scene.add(ambient);
  const moonlight = new THREE.DirectionalLight('#a6b9ec', 1.9); moonlight.position.set(-15, 35, 10); scene.add(moonlight);
  const world = new THREE.Group(); scene.add(world);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const grass = material('#3c665c'), stone = material('#34344b'), wood = material('#724331');
  const amber = material('#ffb856', { emissive: '#ff9b26', emissiveIntensity: 1.3 });
  const darkLamp = material('#67513a', { emissive: '#d78332', emissiveIntensity: 0.05 });
  const mesh = (geometry, mat, parent, pos = [0, 0, 0]) => {
    const obj = new THREE.Mesh(geometry, mat); obj.position.set(...pos); parent.add(obj); return obj;
  };
  mesh(new THREE.CylinderGeometry(30, 24, 7, 64), stone, world, [0, -3.6, 0]);
  mesh(new THREE.CylinderGeometry(30, 30, 0.25, 64), grass, world, [0, -0.125, 0]);
  // A cloud sea and simple stones are visual only, without extra game entities.
  const cloudMat = material('#626c8d', { transparent: true, opacity: 0.35 });
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI * 2 / 24;
    const cloud = mesh(new THREE.SphereGeometry(1, 12, 8), cloudMat, world, [Math.sin(a) * 36, -5 + Math.sin(i * 2) * 1.5, Math.cos(a) * 36]);
    cloud.scale.set(7, 1.5, 5);
  }
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    mesh(new THREE.DodecahedronGeometry(0.6 + i % 3 * 0.2), stone, world, [Math.sin(a) * 28, 0.2, Math.cos(a) * 28]);
  }
  const stars = [];
  for (let i = 0; i < 160; i++) {
    const a = i * 2.399963, y = 15 + ((i * 37) % 55), r = Math.sqrt(90 * 90 - y * y);
    stars.push(Math.sin(a) * r, y, Math.cos(a) * r);
  }
  const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#d2c9ef', size: 0.17, fog: false })));
  const player = new THREE.Group(); world.add(player);
  const tunic = material('#adcdb4'), skin = material('#ddb38c'), hat = material('#d9bb78');
  mesh(new THREE.ConeGeometry(0.42, 0.85, 10), tunic, player, [0, 0.65, 0]);
  mesh(new THREE.SphereGeometry(0.27, 12, 8), skin, player, [0, 1.3, 0]);
  mesh(new THREE.ConeGeometry(0.65, 0.35, 24), hat, player, [0, 1.6, 0]);
  mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 6), wood, player, [0.57, 1.25, 0]);
  mesh(new THREE.SphereGeometry(0.15, 8, 6), amber, player, [0.57, 0.95, 0]);
  const feet = [-0.15, 0.15].map((x) => mesh(new THREE.BoxGeometry(0.16, 0.3, 0.23), wood, player, [x, 0.15, 0]));
  const playerLight = new THREE.PointLight('#ffbb56', 10, 9, 2); playerLight.position.set(0, 1.1, 0); player.add(playerLight);
  const pulseRing = mesh(new THREE.RingGeometry(0.96, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffda78', transparent: true, opacity: 0, side: THREE.DoubleSide }), world);
  pulseRing.rotation.x = -Math.PI / 2;
  const lanternViews = new Map(), shadeViews = new Map(), moteViews = new Map();
  const moteGeometry = new THREE.SphereGeometry(0.16, 8, 6);
  const shadeMaterial = material('#34203f', { emissive: '#5c2679', emissiveIntensity: 0.5 });
  const stunnedMaterial = material('#7b5ea3', { emissive: '#c6a6f2', emissiveIntensity: 0.6 });
  const shadeBody = new THREE.SphereGeometry(0.6, 12, 8), eyeMat = new THREE.MeshBasicMaterial({ color: '#cda4ec' });
  let game, started = false, yaw = 0, accumulator = 0, last = performance.now(), pulseAge = 2;
  const held = new Set(); let dragX = null;
  function clearViews(map) { for (const v of map.values()) world.remove(v); map.clear(); }
  function reset() {
    game = new Game(tuning, { seed: 12 }); yaw = 0; accumulator = 0; pulseAge = 2; held.clear();
    clearViews(lanternViews); clearViews(shadeViews); clearViews(moteViews);
    for (const l of game.lanterns) {
      const group = new THREE.Group(); group.position.set(...l.pos); world.add(group); lanternViews.set(l.id, group);
      mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8), wood, group, [0, 1.2, 0]);
      mesh(new THREE.BoxGeometry(1.35, 0.15, 0.2), wood, group, [0, 2.4, 0]);
      const lamp = mesh(new THREE.SphereGeometry(0.6, 12, 8), darkLamp, group, [0, 2.05, 0]); lamp.scale.y = 1.15;
      mesh(new THREE.ConeGeometry(0.85, 0.35, 8), wood, group, [0, 2.8, 0]);
      const light = new THREE.PointLight('#ffc365', 0, 14, 2); light.position.y = 2.2; group.add(light);
      const safeRing = mesh(new THREE.RingGeometry(tuning.safe_radius - 0.06, tuning.safe_radius, 64), new THREE.MeshBasicMaterial({ color: '#d4b66b', transparent: true, opacity: 0.35, side: THREE.DoubleSide }), group, [0, 0.025, 0]);
      safeRing.rotation.x = -Math.PI / 2; safeRing.visible = false;
      group.userData = { lamp, light, safeRing };
    }
    for (const m of game.motes) moteViews.set(m.id, mesh(moteGeometry, amber, world, [m.pos[0], 0.65, m.pos[2]]));
    for (const s of game.shades) {
      const group = new THREE.Group(); world.add(group); shadeViews.set(s.id, group);
      const body = mesh(shadeBody, shadeMaterial, group, [0, 0.8, 0]); body.scale.y = 1.25;
      for (const x of [-0.2, 0.2]) mesh(new THREE.SphereGeometry(0.085, 6, 4), eyeMat, group, [x, 1.0, 0.51]);
      group.userData.body = body;
    }
    player.position.set(...game.player.pos);
    camera.position.set(0, 7, 11); camera.lookAt(0, 1, -2);
  }
  function endScreen() {
    started = false; held.clear(); $('overlay').hidden = false;
    $('overlay-title').textContent = game.state === 'won' ? 'Đảo đã sáng trở lại!' : 'Mây cần thêm một cơ hội';
    $('overlay-message').textContent = game.state === 'won' ? 'Cả năm chiếc đèn đã sáng. Bạn đã mang hơi ấm về Đảo Bến.' : game.player.flames === 0 ? 'Mây đã mất hết ngọn lửa. Hãy dùng tỏa sáng và trú gần đèn đã thắp.' : 'Bình minh đã đến trước khi cả năm đèn được thắp.';
    $('overlay-detail').textContent = `Điểm: ${game.score} · Đèn sáng: ${game.lanterns.filter((l) => l.lit).length}/5`;
    $('play').textContent = 'Chơi lại Đêm 1';
  }
  $('play').addEventListener('click', () => { reset(); started = true; $('overlay').hidden = true; last = performance.now(); canvas.focus(); });
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && started) e.preventDefault();
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  document.addEventListener('visibilitychange', () => { held.clear(); last = performance.now(); accumulator = 0; });
  canvas.addEventListener('pointerdown', (e) => { dragX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (dragX !== null) { yaw -= (e.clientX - dragX) * 0.35; dragX = e.clientX; } });
  canvas.addEventListener('pointerup', () => { dragX = null; });
  canvas.addEventListener('pointercancel', () => { dragX = null; });
  function input() {
    const key = (...codes) => codes.some((c) => held.has(c));
    return { move: [Number(key('KeyD', 'ArrowRight')) - Number(key('KeyA', 'ArrowLeft')), Number(key('KeyS', 'ArrowDown')) - Number(key('KeyW', 'ArrowUp'))], cam_yaw_deg: yaw,
      jump: key('Space'), interact: key('KeyE'), pulse: key('KeyQ') };
  }
  const cameraTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, 0.1); last = now;
    if (started && !document.hidden) {
      accumulator += elapsed;
      while (accumulator >= DT && started) {
        for (const event of game.step(input())) if (event.name === 'pulse') { pulseAge = 0; pulseRing.position.set(game.player.pos[0], 0.06, game.player.pos[2]); }
        accumulator -= DT;
        if (game.state !== 'playing') endScreen();
      }
    }
    pulseAge += elapsed; pulseRing.visible = pulseAge < 0.6;
    pulseRing.scale.setScalar(Math.max(0.01, tuning.pulse_radius * pulseAge / 0.6)); pulseRing.material.opacity = Math.max(0, 1 - pulseAge / 0.6);
    player.position.set(...game.player.pos);
    const moving = Math.hypot(...game.input.move) > 0 && started;
    if (moving) { const a = game.input.cam_yaw_deg * Math.PI / 180; const [x,z] = game.input.move; player.rotation.y = Math.atan2(x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)); }
    feet.forEach((foot, i) => { foot.rotation.x = moving ? Math.sin(game.tick * 0.25 + i * Math.PI) * 0.5 : 0; });
    player.visible = !(game.tick < game.nextHitTick && Math.floor(game.tick / 5) % 2 === 0);
    const activeMotes = new Set(game.motes.map((m) => m.id));
    for (const [id, view] of moteViews) { view.visible = activeMotes.has(id); view.position.y = 0.65 + Math.sin(now / 350 + Number(id.slice(1))) * 0.14; }
    let lit = 0;
    for (const l of game.lanterns) {
      const v = lanternViews.get(l.id).userData;
      v.lamp.material = l.lit ? amber : darkLamp; v.light.intensity = l.lit ? 45 : 0; v.safeRing.visible = l.lit; if (l.lit) lit++;
    }
    ambient.intensity = 1.3 + lit * 0.17; scene.fog.density = 0.018 - lit * 0.002;
    for (const s of game.shades) { const v = shadeViews.get(s.id); v.position.set(...s.pos); v.rotation.y = Math.atan2(game.player.pos[0] - s.pos[0], game.player.pos[2] - s.pos[2]); v.userData.body.material = s.state === 'stunned' ? stunnedMaterial : shadeMaterial; }
    const a = yaw * Math.PI / 180;
    cameraTarget.set(game.player.pos[0] + Math.sin(a) * 10, game.player.pos[1] + 7, game.player.pos[2] + Math.cos(a) * 10);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-elapsed * 12));
    lookTarget.set(game.player.pos[0] - Math.sin(a) * 2, game.player.pos[1] + 0.8, game.player.pos[2] - Math.cos(a) * 2); camera.lookAt(lookTarget);
    $('health').textContent = `${game.player.flames} / ${tuning.flames}`;
    $('carry').textContent = `${game.player.carried} / ${tuning.carry_capacity}`; $('lit').textContent = `${lit} / 5`;
    const seconds = Math.ceil(game.timeLeft); $('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('score').textContent = game.score;
    const cooldown = Math.max(0, (game.nextPulseTick - game.tick) / 60);
    $('pulse-status').textContent = cooldown > 0 ? `Tỏa sáng hồi sau ${cooldown.toFixed(1)} giây` : game.player.carried ? 'Q · Tỏa sáng sẵn sàng (tốn 1 đom đóm)' : 'Tỏa sáng: cần 1 đom đóm';
    const near = game.lanterns.find((l) => !l.lit && distance(l.pos, game.player.pos) <= tuning.interact_radius + 0.001);
    $('hint').textContent = near ? `Đèn ${near.id} · ${near.deposited}/${tuning.lantern_cost} · ${game.player.carried ? 'Nhấn E để nạp đom đóm' : 'Hãy nhặt thêm đom đóm'}` : game.safeAt(game.player.pos) ? 'Bạn đang ở vùng sáng an toàn.' : game.player.carried === tuning.carry_capacity ? 'Túi đã đầy · Mang đom đóm về một chiếc đèn chưa sáng.' : 'Nhặt đom đóm vàng rồi mang về thắp đèn.';
    renderer.render(scene, camera);
  }
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); reset(); resize(); requestAnimationFrame(frame);
} catch (error) {
  $('overlay').hidden = true; $('error').hidden = false;
  $('error').textContent = `Không mở được game 3D: ${error.message}. Hãy dùng trình duyệt có WebGL2 và chạy bằng node scripts/serve.mjs.`;
  console.error(error);
}
