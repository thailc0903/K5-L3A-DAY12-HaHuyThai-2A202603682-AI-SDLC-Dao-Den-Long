import { Game, distance } from '../src/game.mjs';

// A verification controller, not a game feature. Records ordinary inputs without
// scenario overrides, teleporting, changing health, or modifying the game state.
export function defaultPlaythrough(tuning, seed = 12) {
  const game = new Game(tuning, { seed });
  const frames = []; let previous = '';
  while (game.tick < tuning.night1_duration_s * 60 && game.state === 'playing') {
    const lamp = game.lanterns.filter((l) => !l.lit).sort((a,b) => distance(game.player.pos,a.pos)-distance(game.player.pos,b.pos))[0];
    if (!lamp) break;
    const need = tuning.lantern_cost-lamp.deposited;
    const target = game.player.carried >= need ? lamp : [...game.motes].sort((a,b) => distance(a.pos,lamp.pos)-distance(b.pos,lamp.pos) || distance(a.pos,game.player.pos)-distance(b.pos,game.player.pos))[0];
    if (!target) throw new Error('Default route ran out of motes');
    const dx=target.pos[0]-game.player.pos[0],dz=target.pos[2]-game.player.pos[2],d=Math.hypot(dx,dz),div=Math.max(d,1);
    const input = {
      move: d > 0.5 ? [dx/div,dz/div] : [0,0],
      interact: distance(lamp.pos,game.player.pos)<=tuning.interact_radius && game.player.carried>=need && !game.input.interact,
      pulse: game.player.carried>0 && game.shades.some((s)=>s.state!=='stunned' && distance(s.pos,game.player.pos)<2.5) && game.tick+1>=game.nextPulseTick && !game.input.pulse,
    };
    const encoded=JSON.stringify(input);
    if(encoded!==previous){frames.push({tick:game.tick,...input});previous=encoded;}
    game.step(input);
  }
  if(game.state!=='won') throw new Error(`Default playthrough did not win: ${JSON.stringify(game.end())}`);
  return { inputs: {frames}, end: game.end() };
}
