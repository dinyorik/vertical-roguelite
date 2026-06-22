// Canvas + 2D context + DPR-aware fit(). Owns `ctx`, imported everywhere drawing
// happens.
import { VW, VH } from './constants.js';

export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');

// Portrait, fits the screen; backing buffer at PHYSICAL pixels so high-DPI
// (retina) stays sharp, while all drawing stays in logical VW×VH coords.
export function fit(){
  const scale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(VW * dpr);
  canvas.height = Math.round(VH * dpr);
  canvas.style.width  = (VW * scale) + 'px';
  canvas.style.height = (VH * scale) + 'px';
  // assigning canvas.width/height resets the transform — set dpr scale ONCE here
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
window.addEventListener('resize', fit);
