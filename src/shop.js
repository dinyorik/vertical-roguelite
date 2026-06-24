// Shop: the paid track of the intermission. A shop item is DATA — a record with
// a category, a price (geometric in the wave), and an apply(hero) effect — so
// Phase 9 weapons drop into the SAME pool without touching this machinery.
// Perks go through the existing modifier system (addMod); potions are instant.
// Sits below waves/render/input in the graph (it imports only state/modifiers/
// constants), so nothing here can create a cycle.
import { ri, SHOP_BASE, SHOP_RATIO } from './constants.js';
import { hero } from './state.js';
import { addMod, modValue } from './modifiers.js';

// Pool of buyable items. `ownedStat` (optional) lets the roll skip re-offering a
// one-of perk the hero already has (immunities, added in the next commit).
const SHOP_POOL = [
  // perks — permanent modifiers (stack on repeat buy)
  { name:'Big Bullets',  desc:'+50% bullet size',  category:'perk', apply:h => addMod(h, {stat:'bulletRadius', mul:1.5}) },
  { name:'Faster Fire',  desc:'15% faster ranged', category:'perk', apply:h => addMod(h, {stat:'fireCooldown', mul:0.85}) },
  { name:'Multishot',    desc:'+1 bullet',          category:'perk', apply:h => addMod(h, {stat:'bulletCount', add:1}) },
  { name:'Pierce',       desc:'bullets pierce +1',  category:'perk', apply:h => addMod(h, {stat:'pierce', add:1}) },
  // potions — instant one-time effects
  { name:'Full Heal',    desc:'restore all HP',     category:'potion', apply:h => { h.hp = h.maxHp; } },
  { name:'Full Energy',  desc:'restore all energy', category:'potion', apply:h => { h.energy = h.maxEnergy; } },
];

const priceOf = (category, wave) =>
  Math.ceil(SHOP_BASE[category] * Math.pow(SHOP_RATIO, Math.max(0, wave - 1)));

export let shopItems = [];   // the 3 rolled offers for the current intermission

// Roll 3 offers (repeats allowed) priced for this wave. Each offer is a fresh
// object carrying its own price + sold flag so the UI/purchase state is per-roll.
export function rollShop(wave){
  const pool = SHOP_POOL.filter(it => !(it.ownedStat && modValue(hero, it.ownedStat, 0) > 0));
  shopItems = [];
  for (let i = 0; i < 3; i++){
    const t = pool[ri(pool.length)];
    shopItems.push({ name:t.name, desc:t.desc, category:t.category,
                     price: priceOf(t.category, wave), apply:t.apply, sold:false });
  }
}

// Buy offer i if affordable and not already sold: deduct, apply, mark sold.
export function buyShop(i){
  const it = shopItems[i];
  if (!it || it.sold || hero.coins < it.price) return false;
  hero.coins -= it.price;
  it.apply(hero);
  it.sold = true;
  return true;
}
