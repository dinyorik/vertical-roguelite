# PHASE 8 — WORK ORDER: Currency + shop

> This is the current task. Build ONLY what's specified here.
> Read PROJECT.md and ROADMAP.md first. The codebase is now ES modules under
> `src/`. Do NOT build Phase 9 items (the new weapon types) — the shop framework
> here must be ready to STOCK weapons later, but weapons themselves are Phase 9.

## What exists now (after the module split)
ES modules in `src/`: constants, state, canvas, grid, entities, modifiers,
weapons, abilities, enemies, hazards, combat, input, waves, render, main.
- Enemies drop **energy orbs** on death (`spawnEnergyOrb` in entities.js); orbs
  magnet to the hero and are collected in `sysOrbs` (combat.js).
- The between-wave **INTERMISSION** offers a free upgrade pick (3 of a pool,
  pick 1) — these add modifiers via the generic modifier system (`addMod`).
- The current pool includes damage, fire-rate, multishot, heal, vigor (max-HP),
  big bullets, pierce.
- Modifier system (`modifiers.js`): `addMod`, `modValue(e, stat, base)`,
  `sysMods`. Used at point of use for bullet params, fire cadence, etc.

## Goal
Add an in-game economy and a shop. Coins drop from enemies; the between-wave
screen becomes TWO tracks: a **free mini-pick** (1 of 3 small upgrades) AND a
**paid shop** (3 random items bought with coins). This phase stocks the shop with
**perks** and **potions**; weapons join the same shop in Phase 9.

## Spec

### 1. Currency (coins)
- **Every enemy drops a coin on death** (amount tunable; flat or lightly scaled).
- Coins are a pickup just like energy orbs — magnet to the hero, collected on
  contact. **Generalize the orb/pickup system** to handle a `kind`
  (`'energy'` | `'coin'`) rather than duplicating the magnet/collect logic: on
  collect, energy → `hero.energy`, coin → the wallet. (One pickup system, two
  kinds — same spirit as the rest of the codebase.)
- **Wallet:** a coin counter (on the hero or in state). Show a **coin HUD**
  alongside HP/energy.

### 2. Intermission → two tracks
The between-wave screen now has BOTH, and the player does both before continuing:
- **Free mini-pick** (left/top): 3 drawn from the mini pool, pick exactly 1, free.
- **Shop** (right/bottom): 3 random items with prices; buy any you can afford.
- **Leaving:** add a **"Next wave" button** to proceed (shopping takes time, so a
  short auto-timeout alone doesn't fit — a button is needed; a generous
  auto-advance is optional). Picking the free mini is the player's reward; if they
  leave without picking, they forfeit it (like the current timeout-forfeit).

### 3. Mini-pick pool (narrow it — these MUST stay small)
The free pick pool becomes ONLY the four small upgrades:
- heal (small), +small damage, +small max-HP, +small max-energy.
**Move big bullets, fire-rate, multishot, and pierce OUT of the free pool** —
they become paid **perks** in the shop (§5). The free pick must feel minor; the
real power is bought.

### 4. Shop framework
- At the start of each intermission, roll **3 random items** from the shop pool.
  In this phase the pool is **perks + potions** (§5). **Build the roll so weapons
  slot into the same pool in Phase 9** (skeleton + data — a shop item is data with
  a category, price, and an apply effect).
- **Pricing:** each category has a base price × a **geometric** factor in the wave
  number, e.g. `price = base[category] * ratio^(waveNumber-1)` (ratio ~1.2–1.3,
  tunable). Potions cheaper, perks pricier. (Weapons priciest, in Phase 9.)
- **Buying:** if `wallet >= price`, deduct coins and apply the item; mark it
  sold-out in this shop instance. The 3 items are independent — buy any/all you
  can afford.
- Random roll may repeat an item; **optionally** skip re-offering an immunity the
  player already owns (minor — builder's discretion).

### 5. Shop stock for THIS phase
- **Perks (permanent — apply as modifiers via `addMod`):**
  - big bullets (`bulletRadius` mul), faster fire (`fireCooldown` mul<1),
    multishot (`bulletCount` add), pierce (`pierce` add),
  - **+move speed** — a `moveSpeed` mod, read via `modValue(hero,'moveSpeed',
    hero.speed)` where hero movement speed is applied (sysHeroControl).
  - **poison immunity** — a permanent effect the poison `onTick` (hazards.js)
    checks to skip the hero.
  - **explosion immunity** — a permanent effect the explosion damage (hazards.js)
    checks to skip the hero.
  - (Immunities can be a permanent mod the relevant code checks, or a hero flag
    the perk sets — builder's choice; keep it simple and permanent.)
  - Perks **stack** (buying big bullets twice compounds) — expected.
- **Potions (instant one-time effects):**
  - full-heal (`hero.hp = hero.maxHp`), full-energy (`hero.energy =
    hero.maxEnergy`).

### 6. Module placement
- New module(s), e.g. `economy.js` / `shop.js`: wallet, coin-drop amount, shop
  pool + item definitions (perk/potion, with category/price/apply), the roll, and
  purchase logic.
- Coin drops: extend the pickup system (entities.js spawn + combat.js `sysOrbs` →
  a general pickup system).
- Intermission UI: the two-track screen extends waves.js (round/intermission
  state) + render.js (drawing) + input.js (tapping mini items / shop items / Next).
- Move-speed / immunities: via modifiers.js (mods) + the read/check sites in
  sysHeroControl and hazards.js.

### 7. Architecture constraints
- Keep entity + systems, fixed 1/60 loop, the module structure, the modifier
  system, the brain seam, mini-waves, energy, dash, mobile controls, HUD, restart.
- Perks go through the **existing modifier system** — don't add a parallel buff
  mechanism. Potions are instant. Coins reuse the **generalized pickup system**.
- The shop roll/items are **data** so Phase 9 weapons drop into the same pool.
- This phase touches: a new economy/shop module, the pickup system (coins), the
  intermission UI (two tracks), the modifier read/check sites (move speed,
  immunities), and the HUD (coins). It does NOT add the new weapon TYPES.

## Out of scope for THIS phase (do not build)
- The new weapon types (laser/shotgun/bow/hammer) and the rolling 2-slot weapon
  inventory — Phase 9. (Just leave the shop pool able to accept weapon items.)
- Bosses, RL.

## Commits
Per GIT_WORKFLOW.md: suggested split — (1) coins: generalize the pickup system +
wallet + coin HUD + enemy coin drops, (2) intermission two-track restructure
(narrow the free mini-pick) + shop framework (roll, pricing, purchase) stocked
with the existing-style perks + potions, (3) the new perks (move speed, poison
immunity, explosion immunity). Conventional prefixes. Update PROJECT.md / ROADMAP
status when done (Phase 8 complete, Phase 9 = new weapons next). Push for review.
