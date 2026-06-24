// Round state machine: waves, mini-wave sequencing (telegraphed spawns), the
// between-wave upgrade pick, and resetWorld. resetWorld lives here (it's round
// setup) so the input layer can call it without importing main.
import { VW, INTERMISSION_TIME, MINIWAVE_DELAY, MINIWAVE_MAX, HP_SCALE, ri } from './constants.js';
import { entities, hero, round, add, setEntities, setHero, inp, JOY } from './state.js';
import { generateMap, cellOf, cellCenter } from './grid.js';
import { makeHero } from './entities.js';
import { makeEnemy } from './enemies.js';
import { placeBarrels } from './hazards.js';
import { addMod } from './modifiers.js';

export function resetWorld(){
  setEntities([]);
  setHero(add(makeHero()));
  round.wave = 0;
  startWave();
}
// Begin a new WAVE: regenerate the map ONCE per wave, place barrels, set up the
// mini-wave sub-state, telegraph the first batch.
export function startWave(){
  round.wave++;
  setEntities(entities.filter(e => e.tag === 'hero'));
  const hc = cellOf(hero.x), hr = cellOf(hero.y);
  round.reachable = generateMap(hc, hr);
  placeBarrels();
  round.miniWavesTotal = Math.min(round.wave + 1, MINIWAVE_MAX);
  round.miniWaveIndex = 0;
  round.miniWaveTimer = 0;
  round.pendingSpawns = [];
  prepareMiniWave();
  round.state = 'COMBAT';
}
function enterIntermission(){
  round.state = 'INTERMISSION';
  round.timer = INTERMISSION_TIME;
  // sweep uncollected coins into the wallet (kills near wave-end shouldn't be
  // lost to the magnet's reach), then clear transient world entities.
  for (const e of entities) if (e.tag === 'pickup' && e.kind === 'coin' && !e.dead) hero.coins += e.value;
  setEntities(entities.filter(e => e.tag !== 'bullet' && e.tag !== 'pickup'));
  inp.moveX = 0; inp.moveY = 0; inp.moveActive = false; inp.fireHeld = false;
  inp.attackId = null; inp.mouseDown = false;
  JOY.active = false; JOY.id = null;
  rollChoices();
}

// ---- spawning ----
const SPAWN_MIX = ['charger','charger','charger','kiter','kiter','heavy'];
function pickSpawnCells(count){
  const reachable = round.reachable;
  const hc = cellOf(hero.x), hr = cellOf(hero.y);
  let far = reachable.filter(([c,r]) => Math.hypot(c-hc, r-hr) >= 6);
  if (far.length < count) far = reachable.filter(([c,r]) => Math.hypot(c-hc, r-hr) >= 3);
  if (far.length === 0) far = reachable.slice();
  const out = [];
  for (let i = 0; i < count; i++){
    const [c, r] = far[ri(far.length)];
    const p = cellCenter(c, r);
    out.push({ x:p.x, y:p.y, kind: SPAWN_MIX[ri(SPAWN_MIX.length)] });
  }
  return out;
}
// Telegraph the next mini-wave: pick spawn points NOW and start the beat.
function prepareMiniWave(){
  const count = 5 + Math.min(3, Math.floor((round.wave - 1) / 2));
  round.pendingHpMult = 1 + (round.wave - 1) * HP_SCALE;
  round.pendingSpawns = pickSpawnCells(count);
  round.miniWaveTimer = MINIWAVE_DELAY;
}
// Beat over: spawn the telegraphed batch AT the marked points (HP scaled).
function commitMiniWave(){
  for (const s of round.pendingSpawns){
    const e = makeEnemy(s.x, s.y, s.kind);
    e.hp = Math.max(1, Math.round(e.hp * round.pendingHpMult)); e.maxHp = e.hp;
    add(e);
  }
  round.pendingSpawns = [];
}

// ---- between-wave choices (each pick ADDS a modifier; heal/vigor stay direct) ----
const CHOICE_POOL = [
  { name:'+ Damage',    desc:'+6 ranged damage',   apply:h => addMod(h, {stat:'bulletDamage', add:6}) },
  { name:'+ Fire Rate', desc:'20% faster ranged',  apply:h => addMod(h, {stat:'fireCooldown', mul:0.8}) },
  { name:'Big Bullets', desc:'+50% bullet size',   apply:h => addMod(h, {stat:'bulletRadius', mul:1.5}) },
  { name:'Pierce',      desc:'bullets pierce +1',  apply:h => addMod(h, {stat:'pierce', add:1}) },
  { name:'Heal',        desc:'restore 40 HP',      apply:h => { h.hp = Math.min(h.maxHp, h.hp + 40); } },
  { name:'+ Vigor',     desc:'+20 max HP & heal',  apply:h => { h.maxHp += 20; h.hp += 20; } },
];
export let choices = [];
export let choiceRects = [];
function rollChoices(){
  const pool = CHOICE_POOL.slice();
  choices = [];
  for (let i = 0; i < 3 && pool.length; i++)
    choices.push(pool.splice(ri(pool.length), 1)[0]);
  choiceRects = choices.map((ch, i) => ({ x:28, y:170 + i*74, w:VW-56, h:60, choice:ch }));
}
export function pickChoice(i){
  if (round.state !== 'INTERMISSION') return;
  const ch = choices[i];
  if (!ch) return;
  ch.apply(hero);
  startWave();
}
export function tapChoice(x, y){
  for (let i = 0; i < choiceRects.length; i++){
    const c = choiceRects[i];
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h){ pickChoice(i); return; }
  }
}

// ---- sequencing systems ----
export function sysWaves(dt){
  if (round.state !== 'COMBAT' || hero.dead) return;
  if (round.pendingSpawns.length){            // telegraph running -> spawn when beat ends
    round.miniWaveTimer -= dt;
    if (round.miniWaveTimer <= 0) commitMiniWave();
    return;
  }
  if (entities.some(e => e.tag === 'enemy')) return;     // current batch still alive
  if (round.miniWaveIndex >= round.miniWavesTotal - 1){  // last batch cleared -> wave done
    enterIntermission(); return;
  }
  round.miniWaveIndex++;
  prepareMiniWave();
}
export function sysIntermission(dt){
  round.timer -= dt;
  if (round.timer <= 0) startWave();          // time out -> forfeit the pick
}
