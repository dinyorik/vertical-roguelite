// Entity factories + the shared damage helpers. hurtEnemy AND hurtHero live HERE
// — low in the graph — so combat.js and hazards.js share the one death/damage path
// without a combat<->hazards import cycle. makeEnemy lives in enemies.js (next to
// its brains) to avoid an entities<->enemies cycle.
import { VW, VH, HERO_R, COIN_VALUE, ENERGY_PER_KILL, DRAIN_TIME, HURT_FLASH } from './constants.js';
import { add, hero } from './state.js';

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
    coins:0,                                  // wallet (Phase 8 shop currency)
    weapons:[ makeRanged(), makeMelee() ],
    activeWeapon:0,
    aimX:0, aimY:-1,
    meleeFx:null,
    lastMoveX:0, lastMoveY:0,
    ability:makeDash(),
    dashTimer:0, dashX:0, dashY:0, dashSpeed:0,
    invuln:false, invulnTimer:0,
    hurtFlash:0,                              // >0 = blinking from a recent hit
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

// Coins are the ONLY ground drop. `spin` is a cosmetic phase advanced in sysPickups.
export function makeCoin(x, y){
  return { tag:'pickup', kind:'coin', x, y, r:6, value:COIN_VALUE, dead:false, spin:Math.random()*Math.PI*2 };
}
export function spawnCoin(x, y){ add(makeCoin(x, y)); }

// Cosmetic energy-drain orb: the ball-in-ring "energy" model flying from the dead
// enemy to the hero. Purely visual — the energy is already credited on the kill.
export function spawnDrain(x, y){ add({ tag:'drain', x, y, r:5, t:DRAIN_TIME, tMax:DRAIN_TIME, dead:false }); }

// Apply damage to an enemy in ONE place so every source (bullets, melee, explosion,
// poison) shares the death path: grant energy INSTANTLY, spawn the drain fx, drop a coin.
export function hurtEnemy(e, dmg){
  if (e.dead) return;
  e.hp -= dmg;
  if (e.hp <= 0){
    e.dead = true;
    hero.energy = Math.min(hero.maxEnergy, hero.energy + ENERGY_PER_KILL);  // energy goes straight to me
    spawnDrain(e.x, e.y);                                                    // visual: drain it from the enemy
    spawnCoin(e.x, e.y);                                                     // only the coin lands on the floor
  }
}

// Apply damage to the HERO in ONE place (parallels hurtEnemy): drop HP, trigger the
// damage-blink, run the death path. Callers still gate i-frames / immunity upstream.
export function hurtHero(dmg){
  if (hero.dead) return;
  hero.hp -= dmg;
  hero.hurtFlash = HURT_FLASH;
  if (hero.hp <= 0){ hero.hp = 0; hero.dead = true; }
}
