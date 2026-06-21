# PHASE 7 — WORK ORDER: Environment hazards (barrels)

> This is the current task. Build ONLY what's specified here.
> Read PROJECT.md and ROADMAP.md first for context, architecture, and what is
> out of scope. Phases 1–6 are done and merged. Do NOT build later items
> (module split, currency, bosses, RL).

## What exists now (after Phases 1–6)
Full combat loop: data-driven weapons (ranged + melee + swap), energy, dash,
3 enemy archetypes on the brain seam, mini-waves + depth scaling, and a **generic
modifier system** (`entity.mods`, `addMod(e, m)`, `modValue(e, stat, base)`,
`sysMods(dt)` ticking durations + `onTick` over ALL entities). Relevant:
- Maps regenerate per wave on the tile grid; obstacles are placed on reachable
  floor cells (radius-aware connectivity).
- `hurtEnemy(e, dmg)` applies damage and handles death + energy-orb drop.
- Hero damage is applied inline (contact) and gated on `!hero.invuln`.
- Bullets carry an `owner`; the bullet-vs-entity collision already runs each step.

## Goal
Add barrels to the map: **red** barrels that explode (AoE), and **green** barrels
that release a **poison gas** cloud. The poison **must reuse the existing modifier
system** — this is the payoff of Phase 6. Both hazards are **faction-neutral**:
they damage the hero AND enemies (and other barrels), which is what makes them
tactical (lure enemies next to a barrel, shoot it).

## Spec

### 1. Barrels as entities
- A barrel is a passive entity (tag e.g. `'barrel'`) with a `kind` (`'red'` /
  `'green'`) and small HP (or hit-triggered). NO brain — barrels don't decide
  anything; they just sit and react when hit.
- **Placement:** spawn a few barrels (e.g. 2–4) per map during map generation, on
  reachable floor cells, kept away from the hero spawn (reuse the existing
  reachable-cell placement used for obstacles/enemies).
- **Barrels do NOT block movement** — they're props on the floor, not walls.
  (Keeps them out of the radius-aware connectivity logic.) They ARE hittable.
- **Getting hit:** extend bullet-vs-entity collision so bullets (ANY owner — hero
  or enemy) damage barrels, and explosions damage barrels too. When a barrel's HP
  reaches 0 → trigger its effect (below) and remove it.

### 2. Red barrel → explosion
- On trigger: an **instant AoE** — damage every entity within an explosion radius:
  the hero (gated on `!hero.invuln`), enemies (via `hurtEnemy` so death + orb drop
  work), and **other barrels** (so explosions chain-react).
- A brief visual (expanding ring / flash). Damage + radius are tunable.

### 3. Green barrel → poison gas (REUSES the modifier system)
- On trigger: spawn a **poison gas zone** — a positioned area (circle/tile patch)
  with a lifetime of a few seconds. Render it translucent green.
- **Entities inside the zone get poisoned via the modifier system:** apply a
  poison modifier `{ stat:'hp', onTick:<deal DoT>, duration:<seconds> }` using the
  existing `addMod` / `sysMods`. Do NOT write a separate poison mechanism — this
  is exactly the generic machinery Phase 6 built for this.
  - **No stacking:** while an entity stays in the cloud, REFRESH the existing
    poison mod's duration instead of adding a new mod every frame (otherwise it
    stacks to instant death). One poison mod per entity; standing in the cloud
    keeps it topped up; leaving lets it expire after `duration`.
- **Poison DoT must route through the proper death path** (the flagged item): the
  `onTick` for an enemy must use `hurtEnemy` (or otherwise set `dead` + drop an
  orb) so a poisoned enemy actually dies and drops energy, rather than sitting at
  0 HP. For the hero, reduce HP and trigger death like other hero damage. (Poison
  is an internal status — it ticks regardless of `invuln`; dashing doesn't stop an
  already-applied poison.)
- Faction-neutral: the hero standing in the cloud is poisoned too.

### 4. Effect structure (light skeleton)
- Keep the per-kind effect dispatch simple (red → explode, green → gas), but
  structure it so more barrel/hazard kinds COULD be added later as data. We only
  have two now — don't over-build, just don't hardcode in a way that blocks a
  third kind.

### 5. Architecture constraints
- Keep entity + systems, fixed 1/60 loop, portrait viewport, grid/walls, weapons,
  energy, dash, mobile controls, mini-waves, the modifier system, the brain seam,
  HUD, restart.
- **Poison MUST use the existing modifier system** (`addMod` + `sysMods`) — not a
  bespoke poison path. This is the whole point of having built it generic.
- Reuse: `hurtEnemy` for enemy damage (death + orb), the reachable-cell placement
  for barrels, the tile grid for zone/barrel positions, the bullet collision loop
  for hitting barrels.
- New hazard logic as its own clearly-delimited section.
- This phase touches: barrel entities + placement, bullet-vs-barrel collision, the
  explosion effect, the poison-gas zone + poison mod, and rendering. It does NOT
  change enemies, weapons, waves, or add currency / module split.

## Out of scope for THIS phase (do not build)
- Other hazard types (lava, fire, floor traps) — cut; the zone/effect structure
  is generic enough to add them later if wanted.
- Barrels blocking movement.
- In-game currency, the module split, bosses, RL — all separate later work.

## Commits
Per GIT_WORKFLOW.md: one logical change per commit — suggested split:
(1) barrels as entities + placement + bullet-can-hit + red explosion (AoE, chain,
faction-neutral, via `hurtEnemy`), (2) green barrel + poison-gas zone + poison mod
through the modifier system (no-stack + death-path handling). Conventional
prefixes. Update PROJECT.md / ROADMAP status when done (Phase 7 complete). Push
for review.
