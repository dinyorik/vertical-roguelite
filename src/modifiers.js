// Generic modifier system: buffs now, status/debuffs (poison) later — same
// machinery. Any entity may carry entity.mods = [ {stat, mul?, add?, duration?,
// onTick?} ]. Values are read THROUGH modValue at the point of use, never by
// pre-mutating base stats, so a buff can affect things that don't exist yet.
import { entities } from './state.js';

export function addMod(e, m){ (e.mods || (e.mods = [])).push(m); }

// Fold matching mods over a base value: all `add`s, then all `mul`s.
export function modValue(e, stat, base){
  let v = base;
  if (e.mods){
    for (const m of e.mods) if (m.stat === stat && m.add != null) v += m.add;
    for (const m of e.mods) if (m.stat === stat && m.mul != null) v *= m.mul;
  }
  return v;
}

// Tick lifetimes + per-frame effects, drop expired. duration omitted = permanent
// (run-long buff); present = temporary (status/debuff).
export function sysMods(dt){
  for (const e of entities){
    if (!e.mods || !e.mods.length) continue;
    for (const m of e.mods){
      if (m.onTick) m.onTick(e, dt);
      if (m.duration != null) m.duration -= dt;
    }
    e.mods = e.mods.filter(m => m.duration == null || m.duration > 0);
  }
}
