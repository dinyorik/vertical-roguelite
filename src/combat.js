// Bullets, orbs, cleanup, nearest-target. Hero bullets hit enemies (pierce);
// enemy bullets hit the hero (i-frame gated); ANY bullet pops barrels.
import { ORB_MAGNET, ORB_PULL } from './constants.js';
import { entities, hero, setEntities } from './state.js';
import { isWallPx } from './grid.js';
import { hurtEnemy } from './entities.js';
import { damageBarrel } from './hazards.js';

export function sysBullets(dt){
  for (const b of entities){
    if (b.tag !== 'bullet' || b.dead) continue;
    b.x += b.vx * b.speed * dt;
    b.y += b.vy * b.speed * dt;
    b.life -= dt;
    if (b.life <= 0){ b.dead = true; continue; }
    if (isWallPx(b.x, b.y)){ b.dead = true; continue; }   // walls are cover
    // bullets of ANY owner can hit barrels (props on the floor, not walls)
    let hitBarrel = false;
    for (const k of entities){
      if (k.tag !== 'barrel' || k.dead) continue;
      if (Math.hypot(b.x-k.x, b.y-k.y) < b.r + k.r){ damageBarrel(k, b.dmg); b.dead = true; hitBarrel = true; break; }
    }
    if (hitBarrel) continue;
    if (b.owner === 'hero'){
      for (const e of entities){
        if (e.tag !== 'enemy' || e.dead) continue;
        if (b.hit && b.hit.includes(e)) continue;          // already pierced this enemy
        if (Math.hypot(b.x-e.x, b.y-e.y) < b.r + e.r){
          hurtEnemy(e, b.dmg);
          (b.hit || (b.hit = [])).push(e);
          if (b.pierce > 0){ b.pierce--; }                 // pass through
          else { b.dead = true; break; }                   // out of pierces -> die
        }
      }
    } else if (b.owner === 'enemy'){
      if (!hero.dead && !hero.invuln && Math.hypot(b.x-hero.x, b.y-hero.y) < b.r + hero.r){
        hero.hp -= b.dmg; b.dead = true;
        if (hero.hp <= 0){ hero.hp = 0; hero.dead = true; }
      }
    }
  }
}

// Pickups (energy orbs + coins) share the magnet/collect path; the KIND decides
// where the value goes on contact: energy -> hero.energy, coin -> hero.coins.
export function sysPickups(dt){
  for (const o of entities){
    if (o.tag !== 'pickup' || o.dead) continue;
    const dx = hero.x - o.x, dy = hero.y - o.y, d = Math.hypot(dx, dy) || 1;
    if (d < ORB_MAGNET){ o.x += (dx/d) * ORB_PULL * dt; o.y += (dy/d) * ORB_PULL * dt; }
    if (d < hero.r + o.r + 2){
      if (o.kind === 'coin') hero.coins += o.value;
      else hero.energy = Math.min(hero.maxEnergy, hero.energy + o.value);
      o.dead = true;
    }
  }
}

export function sysCleanup(){
  setEntities(entities.filter(e => !e.dead));
}

// nearest entity of a tag (used for hero auto-aim)
export function nearest(from, tag){
  let best = null, bd = Infinity;
  for (const e of entities){
    if (e.tag !== tag || e.dead) continue;
    const d = Math.hypot(e.x - from.x, e.y - from.y);
    if (d < bd){ bd = d; best = e; }
  }
  return best;
}
