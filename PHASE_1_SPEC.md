# PHASE 1 — WORK ORDER: Combat core (2 weapons + swap + energy)

> This is the current task. Build ONLY what's specified here.
> Read PROJECT.md and ROADMAP.md first for full context, architecture, and —
> importantly — what is out of scope. Do NOT implement anything from later
> roadmap phases (dash/abilities, enemy archetypes, buffs, hazards, mini-waves,
> RL). Building ahead is the main failure mode for this project.

## What exists now
`game.html` has: entity + systems, fixed 1/60 loop, portrait canvas, tile grid
with cover walls, COMBAT→INTERMISSION wave loop, between-wave upgrade pick, one
dumb enemy, and hardcoded hero shooting (currently free / infinite).

## Goal of this phase
Turn the hardcoded shooting into a data-driven weapon system, add a melee
weapon, and add the energy economy that powers ranged fire. After this phase the
player's kit is: two swappable weapons, ranged costs energy, melee is free and
blocks bullets, energy drops from kills + regenerates.

## Spec

### 1. Weapon system (skeleton — data-driven)
- A weapon is DATA, not a class: `{ kind, damage, cooldown, manaCost, ...params }`.
- Two `kind` handlers: `ranged` and `melee`. One general system dispatches on kind.
- The hero holds BOTH weapons, one active at a time. Tap (and a key, e.g. Q or
  Tab) to SWAP the active weapon.
- Refactor existing shooting to be the `ranged` weapon driven by data — leave no
  hardcoded fire params on the hero.

### 2. The two weapons
- **Ranged** (refactor of current): fires projectiles, auto-aims at nearest enemy
  (keep current aim), `cooldown` between shots, spends `manaCost` per shot.
- **Melee:** an arc swing in the facing/aim direction on a cooldown. The swing:
  - deals `damage` to enemies whose position is within the arc, AND
  - **destroys enemy bullets within the arc** (removes them) — melee is a shield.
  - `manaCost = 0` — melee is free.
  Build the bullet-destruction explicitly; it is the defining mechanic, not optional.

### 3. Energy economy (Soul-Knight style)
- Hero has `energy` and `maxEnergy`. Draw an energy bar near the HP bar.
- Ranged fire spends `manaCost`; with insufficient energy, ranged cannot fire.
- Melee always works (free) — the fallback when out of energy.
- Energy is restored two ways:
  1. **Drops from killed enemies** — on death, spawn a small energy orb the hero
     collects by touching it.
  2. **Passive regen that RAMPS** — energy regenerates over time, and the regen
     rate increases the longer the hero has been starved, so the player is never
     permanently locked out of ranged fire (melee covers the gap meanwhile).
- All numbers (cost, drop amount, regen base + ramp) are tunable placeholders —
  pick sane starting values; the human tunes by feel.

### 4. Architecture constraints
- Keep the established entity + systems structure, fixed 1/60 loop, portrait
  viewport, grid/walls, wave loop, upgrade pick, HP bar, restart.
- Weapons/projectiles MUST be data-driven so later buffs (e.g. "big bullets") can
  modify projectile params at spawn. Don't hardcode projectile size/count/speed
  where a buff will later need to change it — read from data.
- This phase touches: the hero, the fire/shoot system, the bullet system, and the
  enemy-death path (to drop energy). It does NOT add new enemy types.

## Out of scope for THIS phase (do not build)
- The dash ability / any hero ability — Phase 2.
- Enemy archetypes (charger / kiter / heavy) — the single dumb enemy stays as-is.
  (Melee's bullet-block can't be fully tested until ranged enemies exist in
  Phase 3 — that's fine, build it correctly now anyway.)
- Buff/modifier changes, hazards/barrels, mini-waves, RL — all later phases.

## Commits
Per GIT_WORKFLOW.md: one logical change per commit, Conventional Commits prefixes
(`feat:` / `fix:` / `refactor:`), and update the status line in PROJECT.md /
ROADMAP.md if you complete the phase. Push so the human can share commit links
for review.
