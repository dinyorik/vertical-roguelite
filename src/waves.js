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
import { rollShop, shopItems, buyShop } from './shop.js';

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
  setEntities(entities.filter(e => e.tag !== 'bullet' && e.tag !== 'pickup' && e.tag !== 'drain'));
  inp.moveX = 0; inp.moveY = 0; inp.moveActive = false; inp.fireHeld = false;
  inp.attackId = null; inp.mouseDown = false;
  JOY.active = false; JOY.id = null;
  round.freePicked = false;        // fresh free pick each intermission
  rollChoices();                   // free mini-pick (3 of 4 small upgrades)
  rollShop(round.wave);            // paid shop (3 random, priced for this wave)
  layoutIntermission();            // build tap rects for both tracks + NEXT
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

// ---- between-wave: free mini-pick (small) + paid shop (shop.js) ----
// The free pick is the SMALL reward (pick 1 of 3); real power is bought. Picking
// the free upgrade NO LONGER starts the wave — the player shops, then taps NEXT
// WAVE (or the generous timer forfeits the unpicked free mini, like before).
// Big bullets / fire-rate / multishot / pierce moved OUT to the shop (perks).
const MINI_POOL = [
  { name:'Heal',         desc:'restore 30 HP',        apply:h => { h.hp = Math.min(h.maxHp, h.hp + 30); } },
  { name:'+ Damage',     desc:'+4 ranged damage',     apply:h => addMod(h, {stat:'bulletDamage', add:4}) },
  { name:'+ Max HP',     desc:'+12 max HP & heal',    apply:h => { h.maxHp += 12; h.hp += 12; } },
  { name:'+ Max Energy', desc:'+15 max energy & top', apply:h => { h.maxEnergy += 15; h.energy += 15; } },
];
export let choices = [];
export let choiceRects = [];
export let shopRects = [];
export const nextRect = { x:(VW-180)/2, y:540, w:180, h:46 };

function rollChoices(){
  const pool = MINI_POOL.slice();
  choices = [];
  // shallow-copy each pick so the per-roll `picked` flag never leaks back to MINI_POOL
  for (let i = 0; i < 3 && pool.length; i++)
    choices.push({ ...pool.splice(ri(pool.length), 1)[0] });
}
// Build tap rects for both tracks; shopRects embed the live shopItems objects so
// the renderer and purchase logic share one source of truth (sold flag, price).
function layoutIntermission(){
  choiceRects = choices.map((ch, i) => ({ x:20, y:120 + i*54, w:VW-40, h:46, choice:ch }));
  shopRects   = shopItems.map((it, i) => ({ x:20, y:320 + i*60, w:VW-40, h:54, item:it }));
}

export function pickChoice(i){
  if (round.state !== 'INTERMISSION' || round.freePicked) return;
  const ch = choices[i];
  if (!ch) return;
  ch.apply(hero);
  ch.picked = true;
  round.freePicked = true;           // one free pick; does NOT advance the wave
}
export function nextWave(){
  if (round.state === 'INTERMISSION') startWave();
}
export function tapChoice(x, y){
  const hit = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  if (hit(nextRect)){ nextWave(); return; }
  for (let i = 0; i < choiceRects.length; i++) if (hit(choiceRects[i])){ pickChoice(i); return; }
  for (let i = 0; i < shopRects.length; i++)   if (hit(shopRects[i])){ buyShop(i); return; }
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
