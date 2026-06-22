// Weapons: data-driven fire handlers. Projectile params are read THROUGH the
// hero's modifiers at spawn (modValue), so buffs adjust a bullet that doesn't
// exist yet. fireActive dispatches by kind; sysHeroControl (main) calls it.
import { angleDiff } from './constants.js';
import { hero, add, entities } from './state.js';
import { makeBullet, hurtEnemy } from './entities.js';
import { modValue } from './modifiers.js';

export const rangedOf = h => h.weapons.find(w => w.kind === 'ranged');

export function fireActive(){
  const w = hero.weapons[hero.activeWeapon];
  if (w.cooldownLeft > 0) return;
  let fired = false;
  if (w.kind === 'ranged') fired = fireRanged(w);
  else if (w.kind === 'melee') fired = fireMelee(w);
  if (fired) w.cooldownLeft = (w.kind === 'ranged')
    ? Math.max(0.05, modValue(hero, 'fireCooldown', w.cooldown))
    : w.cooldown;
}

export function fireRanged(w){
  if (hero.energy < w.manaCost) return false;
  hero.energy -= w.manaCost;
  const dmg    = modValue(hero, 'bulletDamage', w.damage);
  const radius = modValue(hero, 'bulletRadius', w.bulletRadius);
  const n      = Math.max(1, Math.round(modValue(hero, 'bulletCount', w.bulletCount)));
  const pierce = Math.max(0, Math.round(modValue(hero, 'pierce', 0)));
  const base = Math.atan2(hero.aimY, hero.aimX);
  for (let i = 0; i < n; i++){
    const t = n === 1 ? 0 : (i/(n-1) - 0.5);
    const a = base + t * w.spread;
    const b = makeBullet(hero.x, hero.y, Math.cos(a), Math.sin(a), 'hero', dmg, w.bulletSpeed, radius);
    b.pierce = pierce;
    add(b);
  }
  return true;
}

// Melee arc: damages enemies in the arc AND destroys enemy bullets in it.
export function fireMelee(w){
  const baseAngle = Math.atan2(hero.aimY, hero.aimX);
  for (const e of entities){
    if (e.dead) continue;
    if (e.tag !== 'enemy' && !(e.tag === 'bullet' && e.owner === 'enemy')) continue;
    const dx = e.x - hero.x, dy = e.y - hero.y, d = Math.hypot(dx, dy);
    if (d > w.arcRadius + e.r) continue;
    if (angleDiff(Math.atan2(dy, dx), baseAngle) > w.arcHalf) continue;
    if (e.tag === 'enemy') hurtEnemy(e, w.damage);
    else e.dead = true;                          // enemy bullet blocked
  }
  hero.meleeFx = { angle:baseAngle, half:w.arcHalf, radius:w.arcRadius, t:0.12, tMax:0.12 };
  return true;
}

export function swapWeapon(){
  if (hero.dead) return;
  hero.activeWeapon = (hero.activeWeapon + 1) % hero.weapons.length;
}
