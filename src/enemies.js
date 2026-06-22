// Enemy archetypes on the brain seam. A brain DECIDES an action {moveX, moveY,
// attack} from an observation (ctx); the system APPLIES it. The same
// (observation -> action) contract is where an RL policy slots in later.
// makeEnemy lives here (with the brains) to keep entities.js cycle-free.
import { HERO_R } from './constants.js';
import { entities, hero, add } from './state.js';
import { moveWithWalls } from './grid.js';
import { makeBullet } from './entities.js';

function chargerBrain(e, ctx){
  return { moveX: ctx.ux, moveY: ctx.uy, attack: false };   // rush; contact dmg is passive
}
function kiterBrain(e, ctx){
  let mx = 0, my = 0;
  if (ctx.dist < e.preferred - 8){ mx = -ctx.ux; my = -ctx.uy; }
  else if (ctx.dist > e.preferred + 8){ mx = ctx.ux; my = ctx.uy; }
  return { moveX: mx, moveY: my, attack: ctx.dist < e.shootRange };
}
function heavyBrain(e, ctx){
  return { moveX: ctx.ux, moveY: ctx.uy, attack: ctx.dist < e.windRange };
}

export function makeEnemy(x, y, kind){
  const base = { tag:'enemy', kind:kind||'charger', x, y, r:HERO_R, dead:false,
                 touchCooldown:0, attackCdLeft:0, windupLeft:0 };
  switch (base.kind){
    case 'kiter':
      return { ...base, brain:kiterBrain, speed:62, hp:26, maxHp:26, touchDmg:0,
               preferred:150, shootRange:240, attackCooldown:1.3,
               shotDmg:7, shotSpeed:210, shotRadius:4, color:'#ffc24a' };
    case 'heavy':
      return { ...base, brain:heavyBrain, speed:34, hp:70, maxHp:70, touchDmg:0,
               windRange:38, attackCooldown:2.2, windup:0.5, hitRange:32,
               heavyDmg:26, color:'#b06bff' };
    case 'charger': default:
      return { ...base, kind:'charger', brain:chargerBrain, speed:95,
               hp:18, maxHp:18, touchDmg:8, color:'#ff5a78' };
  }
}

// Execute an enemy's special attack (env side, per kind). Charger uses contact.
function enemyAttack(e, ctx){
  if (e.kind === 'kiter'){
    add(makeBullet(e.x, e.y, ctx.ux, ctx.uy, 'enemy', e.shotDmg, e.shotSpeed, e.shotRadius));
    e.attackCdLeft = e.attackCooldown;
  } else if (e.kind === 'heavy'){
    e.windupLeft = e.windup;               // begin telegraphed wind-up
    e.attackCdLeft = e.attackCooldown;     // cooldown counts from wind-up start
  }
}

export function sysEnemies(dt){
  for (const e of entities){
    if (e.tag !== 'enemy' || e.dead) continue;
    const dx = hero.x - e.x, dy = hero.y - e.y, dist = Math.hypot(dx, dy) || 1;
    const ctx = { hero, dx, dy, dist, ux:dx/dist, uy:dy/dist };
    if (e.attackCdLeft > 0) e.attackCdLeft -= dt;
    if (e.windupLeft > 0){                  // heavy: committed wind-up -> hit
      e.windupLeft -= dt;
      if (e.windupLeft <= 0){
        const d = Math.hypot(hero.x - e.x, hero.y - e.y);
        if (!hero.dead && !hero.invuln && d < e.hitRange){
          hero.hp -= e.heavyDmg; if (hero.hp <= 0){ hero.hp = 0; hero.dead = true; }
        }
      }
      continue;
    }
    const act = e.brain(e, ctx);
    if (act.moveX || act.moveY){
      const l = Math.hypot(act.moveX, act.moveY) || 1;
      moveWithWalls(e, act.moveX/l, act.moveY/l, dt);
    }
    if (act.attack && e.attackCdLeft <= 0) enemyAttack(e, ctx);
    if (e.touchDmg > 0){
      e.touchCooldown -= dt;
      if (!hero.dead && !hero.invuln && dist < e.r + hero.r && e.touchCooldown <= 0){
        hero.hp -= e.touchDmg; e.touchCooldown = 0.6;
        if (hero.hp <= 0){ hero.hp = 0; hero.dead = true; }
      }
    }
  }
}
