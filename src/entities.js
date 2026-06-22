// Entity factories + the shared enemy-damage helper. hurtEnemy lives HERE (with
// spawnEnergyOrb) — low in the graph — so both combat.js and hazards.js can use
// it without a combat<->hazards import cycle. makeEnemy lives in enemies.js
// (next to its brains) to avoid an entities<->enemies cycle.
import { VW, VH, HERO_R, ORB_VALUE } from './constants.js';
import { add } from './state.js';

// ---- weapons & ability are DATA ----
export function makeRanged(){
  return {
    kind:'ranged', name:'Blaster',
    damage:12, cooldown:0.18, cooldownLeft:0,
    manaCost:6,
    bulletSpeed:380, bulletCount:1, spread:0.30, bulletRadius:4,
  };
}
export function makeMelee(){
  return {
    kind:'melee', name:'Blade',
    damage:26, cooldown:0.34, cooldownLeft:0,
    manaCost:0,
    arcRadius:46, arcHalf:1.0,
  };
}
export function makeDash(){
  return { kind:'dash', name:'Dash', cooldown:1.1, cooldownLeft:0,
           duration:0.14, speed:560, iframes:0.14 };
}

export function makeHero(){
  return {
    tag:'hero',
    x:VW/2, y:VH*0.75, r:HERO_R,
    vx:0, vy:0, speed:140,
    hp:100, maxHp:100,
    energy:100, maxEnergy:100, starveTimer:0,
    weapons:[ makeRanged(), makeMelee() ],
    activeWeapon:0,
    aimX:0, aimY:-1,
    meleeFx:null,
    lastMoveX:0, lastMoveY:0,
    ability:makeDash(),
    dashTimer:0, dashX:0, dashY:0, dashSpeed:0,
    invuln:false, invulnTimer:0,
    mods:[],
    color:'#5ad1ff', dead:false,
  };
}

export function makeBullet(x, y, dx, dy, owner, dmg, speed, radius){
  return {
    tag:'bullet',
    x, y, r:radius,
    vx:dx, vy:dy, speed,
    life:1.2,
    dmg, owner,
    color: owner === 'hero' ? '#fff2a8' : '#ff9a5a', dead:false,
  };
}

export function spawnEnergyOrb(x, y){
  add({ tag:'orb', x, y, r:5, value:ORB_VALUE, dead:false, color:'#7cffd0' });
}

// Apply damage to an enemy in ONE place so every source (bullets, melee,
// explosion, poison) shares the death path incl. dropping an energy orb.
export function hurtEnemy(e, dmg){
  if (e.dead) return;
  e.hp -= dmg;
  if (e.hp <= 0){ e.dead = true; spawnEnergyOrb(e.x, e.y); }
}
