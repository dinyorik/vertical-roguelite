// All drawing. Reads world + round state and paints; never mutates game state.
import { VW, VH, TILE, COLS, ROWS, WALL, HERO_R } from './constants.js';
import { entities, hero, round, JOY, inp } from './state.js';
import { ctx } from './canvas.js';
import { grid } from './grid.js';
import { drawBarrel, drawFx, drawGas } from './hazards.js';
import { BTN, TOUCH } from './input.js';
import { choiceRects, shopRects, nextRect } from './waves.js';

function rrect(x, y, w, h, rad){
  ctx.beginPath();
  ctx.moveTo(x+rad, y);
  ctx.arcTo(x+w, y, x+w, y+h, rad);
  ctx.arcTo(x+w, y+h, x, y+h, rad);
  ctx.arcTo(x, y+h, x, y, rad);
  ctx.arcTo(x, y, x+w, y, rad);
  ctx.closePath();
}
function drawMap(){
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++){
    if (grid[r][c] === WALL){
      ctx.fillStyle = '#23232f'; ctx.fillRect(c*TILE, r*TILE, TILE, TILE);
      ctx.fillStyle = '#2e2e3e'; ctx.fillRect(c*TILE, r*TILE, TILE, 3);   // top edge -> cover
    }
  }
}
// Spinning gold coin — the width oscillates with `spin` to read as a coin flip.
function drawCoin(e){
  const w = Math.max(1.5, e.r * Math.abs(Math.cos(e.spin)));
  ctx.fillStyle = '#ffcf3a';
  ctx.beginPath(); ctx.ellipse(e.x, e.y, w, e.r, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, w, e.r, 0, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,180,0.7)';   // face highlight
  ctx.beginPath(); ctx.ellipse(e.x, e.y, w*0.5, e.r*0.55, 0, 0, Math.PI*2); ctx.fill();
}
// Cosmetic energy-drain orb: the ball-in-ring "energy" model, fading as it reaches the hero.
function drawDrain(e){
  const a = Math.max(0, Math.min(1, e.t / e.tMax));
  ctx.globalAlpha = a;
  ctx.fillStyle = '#7cffd0';
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(124,255,208,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r+3, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 1;
}

export function draw(){
  ctx.clearRect(0, 0, VW, VH);
  drawMap();

  // melee swing arc (fades), under the actors
  if (hero.meleeFx && !hero.dead){
    const f = hero.meleeFx, a = Math.max(0, f.t/f.tMax);
    ctx.fillStyle = 'rgba(180,220,255,'+(0.30*a)+')';
    ctx.beginPath(); ctx.moveTo(hero.x, hero.y);
    ctx.arc(hero.x, hero.y, f.radius, f.angle-f.half, f.angle+f.half);
    ctx.closePath(); ctx.fill();
  }

  for (const z of entities){ if (z.tag === 'gas' && !z.dead) drawGas(z); }   // clouds under actors
  for (const e of entities){
    if (e.tag === 'barrel'){ drawBarrel(e); continue; }
    if (e.tag === 'gas') continue;
    if (e.tag === 'fx'){ drawFx(e); continue; }
    if (e.tag === 'drain'){ drawDrain(e); continue; }
    if (e.tag === 'pickup'){ drawCoin(e); continue; }
    // hero blinks white briefly after taking damage
    ctx.fillStyle = (e === hero && hero.hurtFlash > 0 && Math.floor(performance.now()/70) % 2 === 0) ? '#ffffff' : e.color;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
    if (e.tag === 'enemy'){
      const w = 22, h = 3, x = e.x-w/2, y = e.y-e.r-7;
      ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ff5a78'; ctx.fillRect(x, y, w*(e.hp/e.maxHp), h);
      if (e.windupLeft > 0){   // heavy wind-up telegraph
        const f = 1 - e.windupLeft/e.windup;
        ctx.strokeStyle = 'rgba(255,70,70,'+(0.4+0.5*f)+')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3 + 10*f, 0, Math.PI*2); ctx.stroke();
      }
    }
    if (e === hero && hero.invuln){
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r+3, 0, Math.PI*2); ctx.stroke();
    }
  }

  // ---- top HUD band: opaque strip so HP/energy read as their own zone instead of
  //      clashing with enemies spawning up top. Labels + coins sit just below it. ----
  ctx.fillStyle = '#101016'; ctx.fillRect(0, 0, VW, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, 30, VW, 1);   // divider
  ctx.fillStyle = '#000'; ctx.fillRect(12, 8, VW-24, 9);
  ctx.fillStyle = '#5ad1ff'; ctx.fillRect(12, 8, (VW-24)*(hero.hp/hero.maxHp), 9);
  ctx.fillStyle = '#000'; ctx.fillRect(12, 20, VW-24, 5);
  ctx.fillStyle = '#7cffd0'; ctx.fillRect(12, 20, (VW-24)*(hero.energy/hero.maxEnergy), 5);

  ctx.fillStyle = '#9aa'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
  ctx.fillText('WAVE '+round.wave+' · '+(round.miniWaveIndex+1)+'/'+round.miniWavesTotal, 12, 44);
  // coin wallet: gold dot + count
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.arc(16, 55, 4, 0, Math.PI*2); ctx.fill();
  ctx.textAlign = 'left'; ctx.font = '11px monospace';
  ctx.fillText(String(hero.coins), 25, 59);
  const aw = hero.weapons[hero.activeWeapon];
  ctx.textAlign = 'right';
  ctx.fillStyle = aw.kind === 'melee' ? '#bcd8ff' : '#fff2a8';
  ctx.fillText(aw.name.toUpperCase()+' ['+aw.kind+']', VW-12, 44);
  const dab = hero.ability;
  ctx.fillStyle = (dab && dab.cooldownLeft <= 0) ? '#7cffd0' : '#5b5b6e';
  ctx.fillText(dab ? ('DASH '+(dab.cooldownLeft <= 0 ? 'READY' : dab.cooldownLeft.toFixed(1)+'s')) : '', VW-12, 58);

  // telegraph: blink markers where the next batch will appear
  if (round.state === 'COMBAT' && !hero.dead && round.pendingSpawns.length){
    const pulse = 0.35 + 0.45*Math.abs(Math.sin(round.miniWaveTimer*9));
    ctx.lineWidth = 2;
    for (const s of round.pendingSpawns){
      ctx.strokeStyle = 'rgba(255,110,110,'+pulse+')';
      ctx.beginPath(); ctx.arc(s.x, s.y, HERO_R+5, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,110,110,'+(pulse*0.45)+')';
      ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#ffd86b'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('INCOMING', VW/2, 78);
  }

  if (round.state === 'INTERMISSION' && !hero.dead) drawIntermission();

  if (hero.dead){
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#fff'; ctx.font = '24px monospace'; ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', VW/2, VH/2-10);
    ctx.font = '14px monospace';
    ctx.fillText('reached wave '+round.wave, VW/2, VH/2+14);
    ctx.fillText('tap / click / R to restart', VW/2, VH/2+36);
  }

  drawControls();
}

function drawIntermission(){
  ctx.fillStyle = 'rgba(8,8,12,0.72)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
  ctx.fillText('WAVE '+round.wave+' CLEARED', VW/2, 50);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ffd34d'; ctx.fillText('coins  '+hero.coins, VW/2, 72);
  ctx.fillStyle = '#8a8aa0'; ctx.fillText('next in '+Math.ceil(round.timer)+'s', VW/2, 90);

  // ---- free mini-pick (1 of 3); chosen one stays lit, the rest dim ----
  ctx.textAlign = 'left'; ctx.font = '11px monospace'; ctx.fillStyle = '#9fd6ff';
  ctx.fillText(round.freePicked ? 'FREE PICK - chosen' : 'FREE PICK - choose 1', 20, 110);
  choiceRects.forEach((cr, i) => {
    const picked = cr.choice.picked;
    ctx.globalAlpha = (round.freePicked && !picked) ? 0.4 : 1;
    ctx.fillStyle = '#1c1c28'; rrect(cr.x, cr.y, cr.w, cr.h, 8); ctx.fill();
    ctx.strokeStyle = picked ? '#7cffd0' : '#3a3a4f'; ctx.lineWidth = picked ? 2 : 1.5;
    rrect(cr.x, cr.y, cr.w, cr.h, 8); ctx.stroke();
    ctx.fillStyle = '#cfe8ff'; ctx.font = '13px monospace';
    ctx.fillText((picked ? '* ' : (i+1)+'. ') + cr.choice.name, cr.x+12, cr.y+20);
    ctx.fillStyle = '#aab'; ctx.font = '10px monospace';
    ctx.fillText(cr.choice.desc, cr.x+12, cr.y+37);
    ctx.globalAlpha = 1;
  });

  // ---- paid shop (buy any you can afford; sold-out + unaffordable are marked) ----
  ctx.fillStyle = '#ffd34d'; ctx.font = '11px monospace';
  ctx.fillText('SHOP - buy with coins', 20, 308);
  shopRects.forEach((sr) => {
    const it = sr.item, afford = !it.sold && hero.coins >= it.price;
    ctx.globalAlpha = it.sold ? 0.4 : 1;
    ctx.fillStyle = '#231c12'; rrect(sr.x, sr.y, sr.w, sr.h, 8); ctx.fill();
    ctx.strokeStyle = afford ? '#ffd34d' : '#4a4636'; ctx.lineWidth = afford ? 2 : 1.5;
    rrect(sr.x, sr.y, sr.w, sr.h, 8); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9a8'; ctx.font = '13px monospace';
    ctx.fillText(it.name, sr.x+12, sr.y+20);
    ctx.fillStyle = '#b9a87f'; ctx.font = '10px monospace';
    ctx.fillText(it.desc, sr.x+12, sr.y+38);
    ctx.textAlign = 'right'; ctx.font = '12px monospace';
    ctx.fillStyle = it.sold ? '#7a7a7a' : (afford ? '#ffd34d' : '#c46b6b');
    ctx.fillText(it.sold ? 'SOLD' : (it.price + 'c'), sr.x+sr.w-12, sr.y+30);
    ctx.globalAlpha = 1;
  });

  // ---- NEXT WAVE button ----
  const nr = nextRect;
  ctx.fillStyle = '#1d2a1d'; rrect(nr.x, nr.y, nr.w, nr.h, 8); ctx.fill();
  ctx.strokeStyle = '#5fc85f'; ctx.lineWidth = 2; rrect(nr.x, nr.y, nr.w, nr.h, 8); ctx.stroke();
  ctx.fillStyle = '#bdf0bd'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
  ctx.fillText('NEXT WAVE >', nr.x+nr.w/2, nr.y+nr.h/2+5);
  ctx.textAlign = 'left';
}

// On-screen mobile controls overlay (touch devices, during combat).
function drawControls(){
  if (!TOUCH || hero.dead || round.state !== 'COMBAT') return;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (JOY.active){
    ctx.globalAlpha = 0.22; ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(JOY.baseX, JOY.baseY, JOY.r, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 0.40; ctx.fillStyle = '#cfe8ff';
    ctx.beginPath(); ctx.arc(JOY.curX, JOY.curY, JOY.kr, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.globalAlpha = 0.12; ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(70, VH-72, JOY.r, 0, Math.PI*2); ctx.stroke();
  }
  const button = (b, lit, pressed) => {
    ctx.globalAlpha = pressed ? 0.55 : (lit ? 0.34 : 0.16);
    ctx.fillStyle = '#9fd6ff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = lit ? 0.95 : 0.45; ctx.fillStyle = '#0c0c12'; ctx.font = 'bold 10px monospace';
    ctx.fillText(b.label, b.x, b.y);
  };
  button(BTN.attack, true, inp.fireHeld);
  const ab = hero.ability, abReady = !!ab && ab.cooldownLeft <= 0;
  button(BTN.ability, abReady, false);
  if (ab && ab.cooldownLeft > 0){
    const frac = ab.cooldownLeft / ab.cooldown;
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#0c0c12';
    ctx.beginPath(); ctx.moveTo(BTN.ability.x, BTN.ability.y);
    ctx.arc(BTN.ability.x, BTN.ability.y, BTN.ability.r, -Math.PI/2, -Math.PI/2 + Math.PI*2*frac);
    ctx.closePath(); ctx.fill();
  }
  button(BTN.swap, true, false);
  ctx.restore();
}
