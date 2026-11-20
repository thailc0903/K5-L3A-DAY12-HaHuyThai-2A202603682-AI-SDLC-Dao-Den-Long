import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from '../src/game.mjs';
import { InputError, validateInputs } from '../src/validation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function args(argv) {
  const result = {}, allowed = ['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every'];
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (!argv[i]?.startsWith('--') || !allowed.includes(key) || result[key] !== undefined || argv[i + 1] === undefined) throw new InputError(`Invalid argument: ${argv[i]}`);
    result[key] = argv[i + 1];
  }
  for (const key of ['seed', 'night', 'ticks', 'out']) if (result[key] === undefined) throw new InputError(`Missing --${key}`);
  for (const key of ['seed', 'night', 'ticks', 'snapshot-every']) if (result[key] !== undefined) {
    if (!/^-?\d+$/.test(result[key]) || !Number.isSafeInteger(Number(result[key]))) throw new InputError(`--${key} must be an integer`);
    result[key] = Number(result[key]);
  }
  if (result.night !== 1 || result.ticks < 0 || (result['snapshot-every'] ?? 10) <= 0) throw new InputError('Use --night 1, --ticks >= 0, --snapshot-every > 0');
  return result;
}
async function json(path, name) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw new InputError(`${name}: ${error.message}`); }
}
try {
  const a = args(process.argv.slice(2));
  const contract = await json(resolve(root, 'game.contract.json'), 'contract');
  const scenario = a.scenario ? await json(a.scenario, 'scenario') : {};
  const inputs = validateInputs(a.inputs ? await json(a.inputs, 'inputs') : { frames: [] });
  const game = new Game(contract.tuning, { seed: a.seed, scenario });
  const lines = [JSON.stringify(game.snapshot())]; let frame = 0;
  for (let i = 0; i < a.ticks && game.state === 'playing'; i++) {
    const patch = inputs.frames[frame]?.tick === i ? inputs.frames[frame++] : {};
    const { tick, ...input } = patch;
    for (const event of game.step(input)) lines.push(JSON.stringify(event));
    if (game.tick % (a['snapshot-every'] ?? 10) === 0) lines.push(JSON.stringify(game.snapshot()));
  }
  lines.push(JSON.stringify(game.end()));
  await mkdir(dirname(resolve(a.out)), { recursive: true });
  await writeFile(a.out, `${lines.join('\n')}\n`, 'utf8');
} catch (error) {
  console.error(error.message);
  process.exitCode = error instanceof InputError ? 2 : 1;
}
