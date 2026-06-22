// Environment hazards: faction-neutral barrels (red = AoE explosion that chains,
// green = poison gas) + their rendering. Poison REUSES the modifier system
// (addMod / sysMods) — no bespoke poison path. Uses hurtEnemy from entities.js
// (not combat.js) so combat<->hazards never cycle.
import { ri, BARREL_HP, EXPLOSION_RADIUS, EXPLOSION_DMG, BARREL_MIN, BARREL_MAX,
         GAS_RADIUS, GAS_DURATION, POISON_DURATION, POISON_DPS } from './constants.js';
import { entities, hero, round, add } from './state.js';
import { cellOf, cellCenter } from './grid.js';
import { hurtEnemy } from './entities.js';
import { addMod } from './modifiers.js';
import { ctx } from './canvas.js';

export function makeBarrel(x, y, kind){
  return { tag:'barrel', kind, x, y, r:9, hp:BARREL_HP, dead:false,
           color: kind === 'red' ? '#d9534f' : '#5db85c' };
}
export function spawnFx(x, y, maxR){ add({ tag:'fx', x, y, t:0.25, tMax:0.25, maxR }); }

// A few barrels per wave on reachable floor cells, away from the hero.
export function placeBarrels(){
  const reachable = round.reachable;
  const hc = cellOf(hero.x), hr = cellOf(hero.y);
  let far = reachable.filter(([c,r]) => Math.hypot(c-hc, r-hr) >= 5);
  if (far.length === 0) far = reachable.slice();
  const n = BARREL_MIN + ri(BARREL_MAX - BARREL_MIN + 1);
  for (let i = 0; i < n && far.length; i++){
    const [c, r] = far.splice(ri(far.length), 1)[0];
    const p = cellCenter(c, r);
    add(makeBarrel(p.x, p.y, Math.random() < 0.5 ? 'red' : 'green'));
  }
}

export function damageBarrel(bar, dmg){
  if (bar.dead) return;
  bar.hp -= dmg;
  if (bar.hp <= 0) triggerBarrel(bar);
}
function triggerBarrel(bar){
  if (bar.dead) return;
  bar.dead = true;                          // mark first so chains don't re-trigger it
  if (bar.kind === 'red') explodeBarrel(bar);
  else if (bar.kind === 'green') spawnGasZone(bar.x, bar.y);
}
// Red: instant AoE — hero (unless i-framed), enemies (hurtEnemy), barrels (chain).
function explodeBarrel(bar){
  spawnFx(bar.x, bar.y, EXPLOSION_RADIUS);
  for (const e of entities){
    if (e.dead) continue;
    if (Math.hypot(e.x-bar.x, e.y-bar.y) > EXPLOSION_RADIUS) continue;
    if (e.tag === 'enemy') hurtEnemy(e, EXPLOSION_DMG);
    else if (e === hero){ if (!hero.invuln){ hero.hp -= EXPLOSION_DMG; if (hero.hp <= 0){ hero.hp = 0; hero.dead = true; } } }
    else if (e.tag === 'barrel') damageBarrel(e, EXPLOSION_DMG);
  }
}
// Green: poison gas zone; entities inside get a poison MODIFIER (refresh, no stack).
function spawnGasZone(x, y){ add({ tag:'gas', x, y, r:GAS_RADIUS, t:GAS_DURATION, dead:false }); }
function poisonTick(e, dt){
  const dmg = POISON_DPS * dt;
  if (e.tag === 'enemy') hurtEnemy(e, dmg);                 // death + orb
  else if (e === hero && !hero.dead){ hero.hp -= dmg; if (hero.hp <= 0){ hero.hp = 0; hero.dead = true; } }
  // ticks regardless of i-frames — an applied status isn't dodged by dashing
}
export function applyPoison(e){
  const cur = e.mods && e.mods.find(m => m.kind === 'poison');
  if (cur) cur.duration = POISON_DURATION;                  // refresh, do NOT stack
  else addMod(e, { kind:'poison', stat:'hp', duration:POISON_DURATION, onTick:poisonTick });
}

export function sysHazards(dt){
  for (const z of entities){
    if (z.dead) continue;
    if (z.tag === 'gas'){
      z.t -= dt; if (z.t <= 0){ z.dead = true; continue; }
      for (const e of entities){
        if (e.dead) continue;
        if ((e.tag === 'enemy' || e === hero) && Math.hypot(e.x-z.x, e.y-z.y) < z.r + e.r) applyPoison(e);
      }
    } else if (z.tag === 'fx'){ z.t -= dt; if (z.t <= 0) z.dead = true; }
  }
}

// ---------- hazard rendering ----------
export function drawBarrel(e){
  const s = e.r * 1.5;
  ctx.fillStyle = e.color; ctx.fillRect(e.x-s/2, e.y-s/2, s, s);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(e.x-s/2, e.y-s/2, s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(e.x-s/2, e.y-2, s, 4);
}
export function drawFx(e){
  const a = e.t / e.tMax;
  ctx.strokeStyle = 'rgba(255,170,60,'+a+')'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.maxR*(1-a), 0, Math.PI*2); ctx.stroke();
}
export function drawGas(z){
  const a = Math.min(1, z.t/0.8) * 0.30;
  ctx.fillStyle = 'rgba(95,200,95,'+a+')';
  ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(130,235,130,'+(a+0.08)+')'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.stroke();
}
