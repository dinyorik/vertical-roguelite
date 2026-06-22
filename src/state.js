// Shared mutable state — ONE home (the "crux" of the split). Values that get
// REASSIGNED (entities, hero) are exposed with setters so every importer keeps a
// live view; everything else is an object mutated in place. Leaf module:
// imports nothing, so nothing can create a cycle through it.

// ---- world ----
export let entities = [];
export const add = e => { entities.push(e); return e; };
export function setEntities(v){ entities = v; }

export let hero = null;
export function setHero(h){ hero = h; }

export const round = {
  state:'COMBAT', timer:0, wave:0,
  miniWavesTotal:1, miniWaveIndex:0, miniWaveTimer:0, reachable:[],
  pendingSpawns:[], pendingHpMult:1,          // telegraphed next batch
};

// ---- input signals (DATA only; the DOM handlers live in input.js) ----
// One game logic, two frontends (keyboard/mouse + on-screen touch controls);
// both write these and the action code reads them — never a parallel system.
export const keys = {};
export const inp = {
  moveX:0, moveY:0, moveActive:false,   // movement direction (joystick / mouse-drag)
  fireHeld:false, attackId:null,        // mobile FIRE button hold + its touch id
  mouseDown:false, mouseOrigin:null, mouseStartT:0, mouseDragged:false,
};
export const JOY = { r:46, kr:22, dead:8, id:null, baseX:0, baseY:0, curX:0, curY:0, active:false };
