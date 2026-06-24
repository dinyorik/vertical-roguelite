// Entry point: hero per-frame control, the fixed-timestep loop, and wiring.
// Importing input.js/render.js pulls in canvas.js (fit runs) and registers the
// DOM handlers. main is the top of the graph — nothing imports it.
import { STEP, ENERGY_REGEN_BASE, ENERGY_REGEN_RAMP, ENERGY_REGEN_MAX } from './constants.js';
import { hero, round, keys, inp } from './state.js';
import { moveWithWalls } from './grid.js';
import { fireActive, rangedOf } from './weapons.js';
import { firing } from './input.js';
import { nearest, sysBullets, sysPickups, sysCleanup } from './combat.js';
import { sysEnemies } from './enemies.js';
import { sysMods } from './modifiers.js';
import { sysHazards } from './hazards.js';
import { resetWorld, sysWaves, sysIntermission } from './waves.js';
import { draw } from './render.js';

function sysHeroControl(dt){
  if (hero.dead) return;
  // ability cooldown + i-frame timers
  if (hero.ability && hero.ability.cooldownLeft > 0) hero.ability.cooldownLeft -= dt;
  if (hero.invulnTimer > 0){ hero.invulnTimer -= dt; if (hero.invulnTimer <= 0) hero.invuln = false; }

  // movement input (also the dash's direction source at trigger time)
  let mx = 0, my = 0;
  if (keys['a'] || keys['arrowleft'])  mx -= 1;   // WASD or arrows move
  if (keys['d'] || keys['arrowright']) mx += 1;
  if (keys['w'] || keys['arrowup'])    my -= 1;
  if (keys['s'] || keys['arrowdown'])  my += 1;
  if (inp.moveActive){ mx += inp.moveX; my += inp.moveY; }
  const len = Math.hypot(mx, my);
  if (len > 0){ mx /= len; my /= len; }
  hero.lastMoveX = len > 0 ? mx : 0; hero.lastMoveY = len > 0 ? my : 0;

  if (hero.dashTimer > 0){
    hero.dashTimer -= dt;
    moveWithWalls(hero, hero.dashX, hero.dashY, dt, hero.dashSpeed);
  } else if (len > 0){
    moveWithWalls(hero, mx, my, dt);
  }

  // aim: nearest enemy, else movement direction
  const target = nearest(hero, 'enemy');
  if (target){ const dx = target.x-hero.x, dy = target.y-hero.y, l = Math.hypot(dx,dy)||1; hero.aimX = dx/l; hero.aimY = dy/l; }
  else if (len > 0){ hero.aimX = mx; hero.aimY = my; }

  // energy regen (ramps while starved)
  const rw = rangedOf(hero);
  if (rw && hero.energy < rw.manaCost) hero.starveTimer += dt; else hero.starveTimer = 0;
  const regen = Math.min(ENERGY_REGEN_MAX, ENERGY_REGEN_BASE + ENERGY_REGEN_RAMP * hero.starveTimer);
  hero.energy = Math.min(hero.maxEnergy, hero.energy + regen * dt);

  if (hero.meleeFx){ hero.meleeFx.t -= dt; if (hero.meleeFx.t <= 0) hero.meleeFx = null; }

  for (const w of hero.weapons) if (w.cooldownLeft > 0) w.cooldownLeft -= dt;
  if (firing()) fireActive();
}

// ---------- fixed-timestep loop ----------
let acc = 0, last = performance.now();
function loop(now){
  acc += Math.min((now - last) / 1000, 0.1);   // clamp to avoid spiral after tab-out
  last = now;
  while (acc >= STEP){
    if (!hero.dead){
      if (round.state === 'COMBAT'){
        sysHeroControl(STEP);
        sysMods(STEP);
        sysEnemies(STEP);
        sysBullets(STEP);
        sysPickups(STEP);
        sysHazards(STEP);
        sysCleanup();
        sysWaves(STEP);
      } else { // INTERMISSION: combat paused, just tick the timer
        sysIntermission(STEP);
      }
    }
    acc -= STEP;
  }
  draw();
  requestAnimationFrame(loop);
}

resetWorld();
requestAnimationFrame(loop);
