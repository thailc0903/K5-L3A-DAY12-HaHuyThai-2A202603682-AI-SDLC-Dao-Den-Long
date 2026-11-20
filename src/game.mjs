import { validateScenario } from './validation.mjs';

export const DT = 1 / 60;
export const ISLAND_RADIUS = 30;
const EPS = 1e-9;
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const rounded = (pos) => pos.map((x) => { const n = Math.round(x * 1000) / 1000; return Object.is(n, -0) ? 0 : n; });
const defaultInput = () => ({ move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false });
function randomGenerator(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export class Game {
  constructor(tuning, { seed = 1, scenario = {} } = {}) {
    validateScenario(scenario, tuning);
    this.tuning = { ...tuning, score: { ...tuning.score } };
    this.tick = 0; this.score = 0; this.state = 'playing'; this.events = [];
    this.input = defaultInput(); this.vy = 0; this.nextPulseTick = 0; this.nextHitTick = 0;
    this.initialTime = scenario.time_left_s ?? tuning.night1_duration_s;
    this.timeLeft = this.initialTime;
    this.player = { pos: [0, 0, 0], carried: 0, flames: tuning.flames, ...scenario.player };
    this.player.pos = [...this.player.pos];
    this.lanterns = Array.from({ length: 5 }, (_, j) => ({
      id: `L${j + 1}`, pos: [20 * Math.sin(2 * Math.PI * j / 5), 0, 20 * Math.cos(2 * Math.PI * j / 5)], deposited: 0, lit: false,
    }));
    for (const patch of scenario.lanterns ?? []) {
      const lantern = this.lanterns.find((l) => l.id === patch.id);
      Object.assign(lantern, patch);
      lantern.pos = [...lantern.pos];
      if (patch.lit === true) lantern.deposited = tuning.lantern_cost;
      lantern.lit = lantern.deposited >= tuning.lantern_cost;
    }
    const motePositions = this.lanterns.flatMap((_, j) => Array.from({ length: 6 }, (_, k) => {
      const a = 2 * Math.PI * j / 5, b = 2 * Math.PI * k / 6;
      return [20 * Math.sin(a) + 4 * Math.sin(b), 0, 20 * Math.cos(a) + 4 * Math.cos(b)];
    }));
    this.motes = (scenario.motes ?? (scenario.random_motes === false ? [] : motePositions)).map((pos, i) => ({ id: `M${i + 1}`, pos: [...pos] })).sort(byId);
    const rng = randomGenerator(seed), alpha = rng() * 2 * Math.PI;
    const defaults = Array.from({ length: 3 }, (_, i) => ({ pos: [26 * Math.sin(alpha + i * 2 * Math.PI / 3), 0, 26 * Math.cos(alpha + i * 2 * Math.PI / 3)] }));
    const shadeSpecs = scenario.shades ?? (scenario.random_shades === false ? [] : defaults);
    const used = new Set(shadeSpecs.filter((s) => s.id !== undefined).map((s) => s.id));
    let id = 1;
    this.shades = shadeSpecs.map((s) => {
      let shadeId = s.id;
      if (!shadeId) { while (used.has(`S${id}`)) id++; shadeId = `S${id++}`; used.add(shadeId); }
      return { id: shadeId, pos: [...s.pos], state: 'chase', stunUntil: 0 };
    }).sort(byId);
    const terminal = this.terminal();
    if (terminal) this.state = terminal.result;
  }
  emit(name, data) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  terminal() {
    if (this.lanterns.every((l) => l.lit)) return { result: 'won', reason: 'all_lit' };
    if (this.player.flames <= 0) return { result: 'lost', reason: 'no_flames' };
    if (this.timeLeft <= 0) return { result: 'lost', reason: 'dawn' };
    return null;
  }
  safeAt(pos) { return this.lanterns.some((l) => l.lit && distance(l.pos, pos) <= this.tuning.safe_radius + EPS); }
  step(patch = {}) {
    this.events = [];
    if (this.state !== 'playing') return this.events;
    const previous = this.input;
    this.input = { ...previous, ...patch };
    const pressed = (key) => this.input[key] && !previous[key];
    this.tick++;
    const t = this.tuning, p = this.player;
    const [x, z] = this.input.move, size = Math.max(1, Math.hypot(x, z));
    const yaw = this.input.cam_yaw_deg * Math.PI / 180;
    const next = [...p.pos];
    next[0] += (x * Math.cos(yaw) + z * Math.sin(yaw)) / size * t.player_speed * DT;
    next[2] += (-x * Math.sin(yaw) + z * Math.cos(yaw)) / size * t.player_speed * DT;
    // Keep scenario positions outside the normal island usable; block only outward movement.
    const limit = Math.max(ISLAND_RADIUS, Math.hypot(p.pos[0], p.pos[2]));
    const radius = Math.hypot(next[0], next[2]);
    if (radius > limit) { next[0] *= limit / radius; next[2] *= limit / radius; }
    if (pressed('jump') && p.pos[1] <= EPS) this.vy = 6;
    this.vy -= 18 * DT; next[1] += this.vy * DT;
    if (next[1] <= 0) { next[1] = 0; this.vy = 0; }
    p.pos = next;
    this.motes = this.motes.filter((m) => {
      if (p.carried < t.carry_capacity && distance(m.pos, p.pos) <= t.pickup_radius + EPS) {
        p.carried++; this.score += t.score.per_mote;
        this.emit('mote_picked', { carried: p.carried }); return false;
      }
      return true;
    });
    if (pressed('pulse') && p.carried >= t.pulse_cost && this.tick >= this.nextPulseTick) {
      p.carried -= t.pulse_cost;
      this.nextPulseTick = this.tick + Math.round(t.pulse_cooldown_s * 60);
      const stunned = [];
      for (const s of this.shades) if (distance(p.pos, s.pos) <= t.pulse_radius + EPS) {
        let dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2], len = Math.hypot(dx, dz);
        if (len < EPS) { dx = 1; dz = 0; len = 1; }
        s.pos[0] += dx / len * t.pulse_push_m; s.pos[2] += dz / len * t.pulse_push_m;
        s.stunUntil = this.tick + Math.round(t.pulse_stun_s * 60); s.state = 'stunned'; stunned.push(s.id);
      }
      this.score += stunned.length * t.score.per_stun;
      this.emit('pulse', { stunned_ids: stunned });
    }
    if (pressed('interact') && p.carried > 0) {
      const candidates = this.lanterns.filter((l) => !l.lit && distance(p.pos, l.pos) <= t.interact_radius + EPS);
      candidates.sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos) || byId(a, b));
      const l = candidates[0];
      if (l) {
        const amount = Math.min(p.carried, t.lantern_cost - l.deposited);
        p.carried -= amount; l.deposited += amount;
        this.emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
        if (l.deposited >= t.lantern_cost) { l.lit = true; this.score += t.score.per_lantern; this.emit('lantern_lit', { lantern_id: l.id }); }
      }
    }
    for (const s of this.shades) {
      if (this.tick < s.stunUntil) { s.state = 'stunned'; continue; }
      s.state = 'chase';
      const d = distance(p.pos, s.pos), travel = Math.min(d, t.shade_speed * DT);
      const target = [...s.pos];
      if (d > EPS) { target[0] += (p.pos[0] - s.pos[0]) / d * travel; target[2] += (p.pos[2] - s.pos[2]) / d * travel; }
      for (const l of this.lanterns) if (l.lit) {
        const before = distance(s.pos, l.pos), after = distance(target, l.pos);
        if (before < t.safe_radius - EPS || after < t.safe_radius) {
          // Project to the edge; a coincident center always escapes in +X.
          let dx = target[0] - l.pos[0], dz = target[2] - l.pos[2], n = Math.hypot(dx, dz);
          if (n < EPS) { dx = 1; dz = 0; n = 1; }
          target[0] = l.pos[0] + dx / n * t.safe_radius;
          target[2] = l.pos[2] + dz / n * t.safe_radius;
        }
      }
      s.pos = target;
    }
    if (!this.safeAt(p.pos) && this.tick >= this.nextHitTick) {
      const hitter = this.shades.find((s) => s.state !== 'stunned' && !this.safeAt(s.pos) && distance(p.pos, s.pos) <= t.shade_hit_radius + EPS);
      if (hitter) {
        p.flames = Math.max(0, p.flames - 1);
        const dropped = Math.floor(p.carried * t.hit_drop_ratio); p.carried -= dropped;
        this.nextHitTick = this.tick + Math.round(t.invuln_s * 60);
        this.emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      }
    }
    this.timeLeft = Math.max(0, this.initialTime - this.tick / 60);
    const terminal = this.terminal();
    if (terminal) {
      this.state = terminal.result;
      if (this.state === 'won') this.score += Math.floor(this.timeLeft) * t.score.per_second_left + p.flames * t.score.per_flame_left;
      this.emit('game_over', terminal);
    }
    return this.events;
  }
  snapshot() {
    return { type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state, time_left_s: this.timeLeft, score: this.score,
      player: { pos: rounded(this.player.pos), flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: rounded(l.pos), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: rounded(s.pos), state: s.state })),
      motes_active: this.motes.length, motes: this.motes.map((m) => ({ id: m.id, pos: rounded(m.pos) })) };
  }
  end() { return { type: 'end', ticks: this.tick, state: this.state, score: this.score }; }
}
