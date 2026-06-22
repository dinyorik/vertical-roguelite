// Input FRONTEND: DOM handlers (keyboard / mouse / touch joystick + buttons).
// They only WRITE the shared input signals in state.js and CALL action functions
// (swap/ability/pick/restart). The action modules read input DATA from state —
// never from here — so there's no cycle. BTN/TOUCH live here (render imports them).
import { VW, VH } from './constants.js';
import { keys, inp, JOY, hero, round } from './state.js';
import { canvas } from './canvas.js';
import { swapWeapon } from './weapons.js';
import { useAbility } from './abilities.js';
import { resetWorld, tapChoice, pickChoice } from './waves.js';

export const TOUCH = (typeof window !== 'undefined') &&
  (('ontouchstart' in window) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));

export const BTN = {
  attack:  { x:VW-52,  y:VH-58,  r:34, label:'FIRE'  },
  ability: { x:VW-116, y:VH-92,  r:24, label:'SKILL' },
  swap:    { x:VW-66,  y:VH-150, r:22, label:'SWAP'  },
};
const hitBtn = (p, b) => Math.hypot(p.x-b.x, p.y-b.y) <= b.r;
function toLocal(t){
  const r = canvas.getBoundingClientRect();
  return { x:(t.clientX-r.left)/(r.width/VW), y:(t.clientY-r.top)/(r.height/VH) };
}

// ---- touch (multi-touch by identifier: joystick + a button at once) ----
canvas.addEventListener('touchstart', e=>{ e.preventDefault();
  for (const t of e.changedTouches){
    const p = toLocal(t);
    if (hero.dead){ resetWorld(); return; }
    if (round.state === 'INTERMISSION'){ tapChoice(p.x, p.y); continue; }
    if (hitBtn(p, BTN.attack)){ inp.attackId = t.identifier; inp.fireHeld = true; continue; }
    if (hitBtn(p, BTN.ability)){ useAbility(); continue; }
    if (hitBtn(p, BTN.swap)){ swapWeapon(); continue; }
    if (p.x < VW*0.5 && !JOY.active){
      JOY.id = t.identifier; JOY.baseX = JOY.curX = p.x; JOY.baseY = JOY.curY = p.y; JOY.active = true;
      inp.moveActive = true; inp.moveX = 0; inp.moveY = 0;
    }
  }
},{passive:false});
canvas.addEventListener('touchmove', e=>{ e.preventDefault();
  for (const t of e.changedTouches){
    if (t.identifier !== JOY.id || !JOY.active) continue;
    const p = toLocal(t);
    let dx = p.x-JOY.baseX, dy = p.y-JOY.baseY;
    const len = Math.hypot(dx,dy);
    if (len > JOY.r){ dx = dx/len*JOY.r; dy = dy/len*JOY.r; }
    JOY.curX = JOY.baseX+dx; JOY.curY = JOY.baseY+dy;
    if (len < JOY.dead){ inp.moveX = 0; inp.moveY = 0; }
    else { const u = Math.hypot(dx,dy)||1; inp.moveX = dx/u; inp.moveY = dy/u; }
  }
},{passive:false});
function endTouch(e){ e.preventDefault();
  for (const t of e.changedTouches){
    if (t.identifier === JOY.id){ JOY.active = false; JOY.id = null; inp.moveActive = false; inp.moveX = 0; inp.moveY = 0; }
    if (t.identifier === inp.attackId){ inp.attackId = null; inp.fireHeld = false; }
  }
}
canvas.addEventListener('touchend', endTouch, {passive:false});
canvas.addEventListener('touchcancel', endTouch, {passive:false});

// ---- mouse (desktop: menus always; combat drag=move, hold=fire, click=swap) ----
canvas.addEventListener('mousedown', e=>{
  const p = toLocal(e);
  if (hero.dead){ resetWorld(); return; }
  if (round.state === 'INTERMISSION'){ tapChoice(p.x, p.y); return; }
  inp.mouseDown = true; inp.mouseOrigin = p; inp.mouseStartT = performance.now(); inp.mouseDragged = false;
  inp.moveActive = true; inp.moveX = 0; inp.moveY = 0;
});
canvas.addEventListener('mousemove', e=>{
  if (!inp.mouseDown || round.state !== 'COMBAT') return;
  const p = toLocal(e);
  let dx = p.x-inp.mouseOrigin.x, dy = p.y-inp.mouseOrigin.y;
  const len = Math.hypot(dx,dy)||1;
  if (len>8) inp.mouseDragged = true;
  if (len>4){ inp.moveX = dx/len; inp.moveY = dy/len; }
  else { inp.moveX = 0; inp.moveY = 0; }
});
window.addEventListener('mouseup', ()=>{
  if (round.state==='COMBAT' && !hero.dead && !inp.mouseDragged && (performance.now()-inp.mouseStartT) < 220)
    swapWeapon();
  inp.mouseDown = false; inp.mouseOrigin = null; inp.moveActive = false; inp.moveX = 0; inp.moveY = 0;
});

// ---- keyboard ----
addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (hero.dead && k === 'r'){ resetWorld(); return; }
  if (round.state === 'INTERMISSION'){
    if (k === '1') pickChoice(0);
    else if (k === '2') pickChoice(1);
    else if (k === '3') pickChoice(2);
    return;
  }
  if (round.state === 'COMBAT'){
    if (k === 'q' || k === 'tab'){ e.preventDefault(); swapWeapon(); }
    else if (k === 'shift'){ e.preventDefault(); useAbility(); }   // dash
  }
});
addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);

// Losing focus mid-press never fires keyup/touchend/mouseup -> clear held input.
function clearInput(){
  for (const k in keys) delete keys[k];
  inp.moveX = 0; inp.moveY = 0; inp.moveActive = false; inp.fireHeld = false; inp.attackId = null;
  inp.mouseDown = false; inp.mouseOrigin = null;
  JOY.active = false; JOY.id = null;
}
addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });

// The fire signal (read by sysHeroControl): keyboard space, mobile FIRE button,
// or a held desktop mouse (after a short delay so a quick click reads as swap).
export function firing(){
  const kb = keys[' '];
  const mouseHold = inp.mouseDown && (inp.mouseDragged || (performance.now() - inp.mouseStartT) > 150);
  return kb || inp.fireHeld || mouseHold;
}
