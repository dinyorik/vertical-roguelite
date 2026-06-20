# ROADMAP — Vertical Roguelite

> This expands and supersedes section 7 of PROJECT.md. It is the detailed
> build order after a full feature dump from the human. PROJECT.md still holds
> the vision, architecture, and out-of-scope rules — read it first.
>
> **How to read this:** systems are built as *skeletons* (general machinery)
> and populated with only **one or two concrete variants now**. "Add more later"
> is data, not new code. Build the skeleton so later variants plug in without
> rewrites. Respect what each phase defers — building deferred things early is
> the main way this project spreads thin and stalls.

---

## Architecture we hold (applies to every phase)

1. **Skeleton + data.** Every content type (heroes, weapons, abilities,
   enemies, buffs, hazards) = a general system + data plugged into it. Build
   the system once; variants are data. Only 1–2 variants populated now.
2. **Entity + systems** (established). Everything on screen is a plain-object
   entity; behavior lives in systems that run over the entity list by tag.
3. **Swappable enemy `brain`.** Enemy behavior is a module assigned per enemy.
   Scripted now; the SAME slot accepts RL inference later with no rewrite.
   This seam is built in Phase 3 and is what keeps RL possible.
4. **One modifier machinery for buffs AND debuffs/status.** Buffs (on hero) and
   status effects (e.g. poison on enemies) are the same kind of thing:
   modifiers read at the point of use (bullet spawn reads current bullet-size
   modifier; fire system reads firerate; an enemy reads its active DoT). Build
   it generic in Phase 4 — do NOT build a buff-only system, Phase 5 reuses it.
5. **Reusable generic primitives.** Build these once, reuse everywhere:
   projectile (hero + enemy bullets), cooldown (weapons + abilities), damaging
   zone (poison now), status-effect-over-time (poison DoT now). Resist making
   one-off versions per feature.
6. **Tile grid is the spatial substrate.** Hazard zones, enemy positioning, and
   future RL observation all read the grid. (This is why it's a grid, not
   rectangles — decided in Phase 5.1 of PROJECT.md.)

---

## Build order

### Phase 1 — Combat core: 2 weapons + swap + energy  ✅ DONE (2026-06-20)
**Goal:** replace the hardcoded shooting with a data-driven weapon system, add
melee, and add the energy economy that powers ranged fire.

- **Skeleton:** `weapon = data {kind, damage, cooldown, manaCost, ...params}` +
  a per-kind handler. Two kinds: `ranged` (spawns projectiles, costs energy) and
  `melee` (an arc swing, free). Hero carries BOTH, one active at a time, taps to
  swap. (Confirmed by human.)
- **Populated now:** 1 ranged + 1 melee.
  - **Melee is special and free:** its swing arc damages enemies in the arc AND
    destroys enemy bullets in the arc — it is both attack and shield. Build the
    bullet-destruction, not just damage; that's the point.
- **Energy economy (Soul-Knight style — confirmed design):** ranged fire
  consumes energy; melee is free. This makes melee the meaningful fallback when
  out of energy (its bullet-block makes it a survival tool), and makes the swap
  matter. Energy:
  - drops from killed enemies (collectible orbs), AND
  - regenerates passively, with the regen rate **ramping the longer the player
    is starved** — so the player is never soft-locked out of ranged fire; melee
    covers the gap meanwhile. All numbers tunable; intent is "never fully stuck,
    but spamming ranged drains you."
  - Show an energy bar alongside the HP bar.
- **Reuses:** existing projectile system; cooldown concept (shared with Phase 2).
- **Deferred:** more weapon kinds/variants; weapon drops/pickups (both from the
  start for now).

### Phase 2 — Hero ability: dash  ← NEXT
**Goal:** one active ability — a dash — on a cooldown.

- **Skeleton:** an ability slot on the hero = `data {cooldown, effect}` + a
  cooldown timer + a trigger input. General enough that more abilities and more
  heroes plug in later.
- **Populated now:** **dash** (confirmed) — a sharp, short burst of movement in
  the current direction. Snappy and short-range, NOT a long glide. Optional brief
  i-frames during the dash (tunable). **Cooldown-gated, not energy-gated** —
  energy is for ranged fire; dash runs on its own cooldown.
- **Reuses:** cooldown concept from Phase 1.
- **Deferred:** multiple abilities; multiple selectable heroes (skeleton
  supports selection — only 1 hero now).

### Phase 3 — Enemy archetypes + brain seam
**Goal:** 3 enemy types with distinct **dumb** behaviors, and the swappable
brain that RL later slots into.

- **Skeleton:** enemy behavior = a `brain` module assigned per enemy. Scripted
  now; the same slot must accept an RL inference brain later with no rewrite of
  the game. This is the RL seam — build it clean even though RL is far off.
- **Populated now (all intentionally simple):**
  - **charger** — rushes the hero, contact damage, fragile.
  - **kiter** — keeps distance, shoots (reuses the projectile system), backs off
    when approached.
  - **heavy** — slow, tanky, telegraphed heavy hit via a visible wind-up state
    the player can read and dodge.
- **Reuses:** projectile system (kiter), tile grid (positioning).
- **Deferred:** smart/RL brains (deferred phase); bosses; pathfinding — enemies
  still move straight-line and may stick on walls; that's accepted, not a bug.
- **Note:** the melee shield from Phase 1 only becomes fully testable here, once
  kiter bullets exist to block.

### Phase 4 — Buff / modifier system
**Goal:** richer between-wave upgrades than flat +stat, on general machinery.

- **Skeleton:** modifiers = effects applied to the hero / to derived values,
  **read at the point of use** (projectile spawn reads current bullet-size
  modifier; fire system reads firerate; etc.). **Build it generic so Phase 5's
  poison debuff reuses the exact same machinery.** Not a buff-only system.
- **Populated now:** keep existing stat buffs + add at least one *shape* buff:
  **big bullets** (increase projectile radius / hitbox). Add a couple more in
  the same spirit (multishot already exists; pierce, faster bullets, etc.).
- **Reuses:** weapon/projectile output (Phase 1) is what modifiers hook into.
- **Deferred:** enemy-side debuff *content* — the machinery is built here, first
  used in Phase 5.

### Phase 5 — Environment hazards (barrels)
**Goal:** barrels on the map that produce zones / explosions.

- **Skeleton:** a hazard entity (hittable by bullets) that on trigger produces
  an effect. Generic effects: **explosion (AoE)**, **damaging zone**, and
  **status-over-time** (reuses Phase 4 machinery for the poison DoT).
- **Populated now:**
  - **red barrel** — on hit, explodes: AoE damage to everything in radius
    (hero, enemies, other barrels).
  - **green barrel** — on hit, releases a **poison zone**: a damaging area on
    the grid for a duration; anything inside takes poison DoT (Phase 4 status).
- **Reuses:** modifier/status system (Phase 4), tile grid (zone placement),
  projectile collision (barrels are hit by bullets).
- **Deferred:** other hazard types (lava, fire, floor traps) — cut for now; the
  "zone" concept is generic, so they're cheap to add later if wanted.

### Phase 6 — Wave structure (mini-waves) + scaling
**Goal:** waves spawn in sub-batches, and get harder with depth.

- **Mini-waves (Soul-Knight style):** a **wave** (the unit between intermissions)
  is no longer a single spawn — it is a sequence of **mini-waves**. Each
  mini-wave spawns a batch (e.g. ~10); when it's cleared, the next mini-wave
  spawns; when ALL mini-waves of the wave are cleared, the intermission (upgrade
  pick) fires. This refines the COMBAT state from PROJECT.md 5.3: COMBAT now
  contains internal mini-wave sequencing.
- **Scaling with depth:** the number of mini-waves per wave increases as the
  player progresses, and enemy HP scales with wave number. (Both keyed to wave
  number; numbers tunable.)
- **Deferred:** bosses every N waves, floors-as-rooms — all post-RL.

---

## Deferred entirely (NOT now — by the human's explicit call)

- **RL agent** — trained offline by the human, separately, once the game is
  "almost complete" with the dumb scripted brains. The seam is built in Phase 3;
  the observation/action/reward interface and inference get added in that later
  phase. Nothing RL is built before then.
- **Bosses.**
- **Multi-room / dungeon generation / floors going up.**
- **Multiple selectable heroes** — skeleton ready (Phase 2), only 1 now.
- **More than 2 weapons, more than 1 ability** — skeletons ready, populate later.
- **Traps, destructible terrain** — explicitly cut.

---

## Keeping this coherent (important as the project grows)

The human is considering splitting work across separate chats per system. That
can work, but it has one failure mode: each chat (architect or builder) loses
the global picture and starts making locally-sensible but globally-wrong
choices. The mitigation is this: **PROJECT.md + this ROADMAP.md are the shared
memory across all chats.** Any chat must read both before acting, and whoever
changes scope/status must update them immediately. If these docs go stale, the
split-chat approach falls apart — the docs are the only thing holding one
coherent project together when no single chat sees all of it. Keep them current.
