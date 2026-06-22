// Hero ability slot + dash. useAbility() dispatches by kind, runs the effect, and
// starts the cooldown; the per-frame dash MOVEMENT happens in main's
// sysHeroControl (reusing moveWithWalls). A second ability later = another branch.
import { hero } from './state.js';

export function useAbility(){
  const ab = hero.ability;
  if (!ab || hero.dead || ab.cooldownLeft > 0) return;
  let used = false;
  if (ab.kind === 'dash') used = startDash(ab);
  if (used) ab.cooldownLeft = ab.cooldown;
}
// Lock a direction now (movement input if moving, else aim) and slide fast for
// `duration`; brief i-frames. The slide + wall collision run in sysHeroControl.
export function startDash(ab){
  let dx = hero.lastMoveX, dy = hero.lastMoveY;
  if (dx === 0 && dy === 0){ dx = hero.aimX; dy = hero.aimY; }
  const l = Math.hypot(dx, dy) || 1;
  hero.dashX = dx/l; hero.dashY = dy/l;
  hero.dashTimer = ab.duration;
  hero.dashSpeed = ab.speed;
  hero.invulnTimer = ab.iframes; hero.invuln = ab.iframes > 0;
  return true;
}
