export class InputError extends Error {}
const fail = (message) => { throw new InputError(message); };
const object = (v, name) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`${name} must be an object`);
};
const number = (v, name, min = -Infinity, max = Infinity, integer = false) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
    fail(`${name} must be ${integer ? 'an integer' : 'a finite number'} in [${min}, ${max}]`);
  }
};
const bool = (v, name) => { if (typeof v !== 'boolean') fail(`${name} must be boolean`); };
const position = (v, name) => {
  if (!Array.isArray(v) || v.length !== 3) fail(`${name} must be [x,y,z]`);
  v.forEach((n) => number(n, name));
};
const keys = (v, allowed, name) => {
  for (const key of Object.keys(v)) if (!allowed.includes(key)) fail(`${name}: unknown field ${key}`);
};
export function validateInputs(input = { frames: [] }) {
  object(input, 'inputs'); keys(input, ['frames'], 'inputs');
  if (!Array.isArray(input.frames)) fail('inputs.frames must be an array');
  let previous = -1;
  input.frames.forEach((frame, i) => {
    const name = `frames[${i}]`; object(frame, name);
    keys(frame, ['tick', 'move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash'], name);
    number(frame.tick, `${name}.tick`, 0, Number.MAX_SAFE_INTEGER, true);
    if (frame.tick <= previous) fail('frame ticks must increase strictly');
    previous = frame.tick;
    if ('move' in frame) {
      if (!Array.isArray(frame.move) || frame.move.length !== 2) fail(`${name}.move must be [x,z]`);
      frame.move.forEach((n) => number(n, `${name}.move`, -1, 1));
    }
    if ('cam_yaw_deg' in frame) number(frame.cam_yaw_deg, `${name}.cam_yaw_deg`);
    for (const key of ['jump', 'interact', 'pulse', 'dash']) if (key in frame) bool(frame[key], `${name}.${key}`);
  });
  return input;
}
export function validateScenario(scenario = {}, tuning) {
  object(scenario, 'scenario');
  keys(scenario, ['player', 'random_motes', 'random_shades', 'motes', 'shades', 'lanterns', 'time_left_s'], 'scenario');
  if ('player' in scenario) {
    const p = scenario.player; object(p, 'player'); keys(p, ['pos', 'carried', 'flames'], 'player');
    if ('pos' in p) position(p.pos, 'player.pos');
    if ('carried' in p) number(p.carried, 'player.carried', 0, tuning.carry_capacity, true);
    if ('flames' in p) number(p.flames, 'player.flames', 0, Number.MAX_SAFE_INTEGER, true);
  }
  for (const key of ['random_motes', 'random_shades']) if (key in scenario) bool(scenario[key], key);
  if ('time_left_s' in scenario) number(scenario.time_left_s, 'time_left_s', 0);
  if ('motes' in scenario) {
    if (!Array.isArray(scenario.motes)) fail('motes must be an array');
    scenario.motes.forEach((p, i) => position(p, `motes[${i}]`));
  }
  for (const kind of ['shades', 'lanterns']) {
    if (!(kind in scenario)) continue;
    if (!Array.isArray(scenario[kind])) fail(`${kind} must be an array`);
    const ids = new Set();
    scenario[kind].forEach((item, i) => {
      const name = `${kind}[${i}]`; object(item, name);
      keys(item, kind === 'shades' ? ['id', 'pos'] : ['id', 'pos', 'deposited', 'lit'], name);
      if ('id' in item) {
        if (typeof item.id !== 'string' || !item.id.length || ids.has(item.id)) fail(`${name}: invalid or duplicate id`);
        ids.add(item.id);
      }
      if (kind === 'lanterns' && !/^L[1-5]$/.test(item.id)) fail(`${name}.id must be L1..L5`);
      if ('pos' in item) position(item.pos, `${name}.pos`);
      else if (kind === 'shades') fail(`${name}.pos is required`);
      if ('deposited' in item) number(item.deposited, `${name}.deposited`, 0, tuning.lantern_cost, true);
      if ('lit' in item) bool(item.lit, `${name}.lit`);
      if (kind === 'lanterns' && item.lit === false && item.deposited === tuning.lantern_cost) fail(`${name}: full lantern cannot be unlit`);
    });
  }
  return scenario;
}
