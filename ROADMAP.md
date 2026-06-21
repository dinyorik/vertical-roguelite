# ROADMAP — Vertical Roguelite

> This expands and supersedes section 7 of PROJECT.md. PROJECT.md still holds the
> vision, architecture, and out-of-scope rules — read it first.
>
> **How to read this:** systems are built as *skeletons* (general machinery) and
> populated with only **one or two concrete variants now**. "Add more later" is
> data, not new code. Respect what each phase defers.
>
> Cross-references use phase NAMES, not numbers, so reordering doesn't break them.

---

## Architecture we hold (applies to every phase)

1. **Skeleton + data.** Every content type (heroes, weapons, abilities, enemies,
   buffs, hazards) = a general system + data plugged into it. Build the system
   once; variants are data. Only 1–2 variants populated now.
2. **Entity + systems** (established). Everything on screen is a plain-object
   entity; behavior lives in systems that run over the entity list by tag.
3. **Swappable enemy `brain`.** Enemy behavior is a module that DECIDES an action
   from an observation; a system APPLIES it. Scripted now; the same
   (observation → action) contract accepts an RL policy later with no rewrite.
   Built in the **enemy-archetypes phase**; this seam is what keeps RL possible.
4. **One modifier machinery for buffs AND debuffs/status.** Buffs (on hero) and
   status effects (e.g. poison on enemies) are the same kind of thing: modifiers
   read at the point of use. Built generic in the **buff/modifier phase** — NOT
   buff-only; the **hazards phase** reuses it.
5. **Reusable generic primitives.** projectile (hero + enemy), cooldown (weapons
   + abilities), damaging zone (poison), status-over-time (poison DoT), and input
   signals (one game logic fed by keyboard OR on-screen controls — the
   mobile-control layer). Build once, reuse everywhere.
6. **Tile grid is the spatial substrate.** Hazard zones, enemy positioning, map
   connectivity (radius-aware), and future RL observation all read the grid.

---

## Build order

### Phase 1 — Combat core: 2 weapons + swap + energy  ✓ DONE
Data-driven weapons (ranged + melee), swap, energy economy (ranged costs energy,
melee free + blocks bullets, kills drop orbs, ramping passive regen). Merged.

### Phase 2 — Mobile control layer  ✓ DONE
Virtual joystick + FIRE/SKILL/SWAP buttons, multi-touch, translucent overlay;
controls feed the existing actions (one logic, two frontends). Merged.

### Phase 3 — Hero ability: dash  ✓ DONE
General ability slot (data + `useAbility()` dispatch by kind); dash slides via
`moveWithWalls` (respects cover), brief i-frames gate damage, cooldown-gated.
SKILL button + Shift. Merged.

### Phase 4 — Enemy archetypes + brain seam   ✓ DONE
**Goal:** 3 enemy types with distinct **dumb** behaviors, on the swappable brain
that RL later slots into.

- **Skeleton — the brain seam:** an enemy is DATA (stats) + a `brain` that, each
  tick, DECIDES an action (`{moveX, moveY, attack}`) from an observation
  (`ctx`: its state, hero position/distance) and RETURNS it; a system APPLIES it
  (move via `moveWithWalls`, trigger attacks). Decide ≠ act. This contract is
  what an RL policy fills later. Keep it minimal — no full RL framework now.
- **Populated now (all intentionally simple):**
  - **charger** — fast, fragile; rushes the hero, contact damage.
  - **kiter** — keeps distance, shoots (reuses the projectile system). Its
    bullets finally make the melee shield testable and give dash i-frames
    something to dodge.
  - **heavy** — slow, tanky; telegraphed wind-up then a heavy hit (readable,
    dodgeable).
- **Reuses:** projectile system (kiter), `moveWithWalls`, the melee bullet-block
  (already destroys `owner==='enemy'` bullets — verify it triggers now).
- **Deferred:** smart/RL brains (the deferred RL phase); bosses; pathfinding —
  enemies still move straight-line and may stick on walls; accepted, not a bug.

### Phase 5 — Wave structure (mini-waves) + scaling   ✓ DONE
**Goal:** waves spawn in sub-batches, and get harder with depth. (Pulled forward
to right after enemy variety — mixed-type batches are far better than batches of
one enemy.)

- **Mini-waves (Soul-Knight style):** a **wave** (the unit between intermissions)
  becomes a sequence of **mini-waves**. Each spawns a batch (~10); cleared → next
  mini-wave; ALL cleared → intermission (upgrade pick). Refines the COMBAT state
  from PROJECT.md 5.3: COMBAT now contains internal mini-wave sequencing.
- **Scaling with depth:** mini-waves per wave increase as the player progresses,
  and enemy HP scales with wave number. (Both tunable.)
- **Deferred:** bosses every N waves, floors-as-rooms — all post-RL.

### Phase 6 — Buff / modifier system   ✓ DONE
**Goal:** richer between-wave upgrades than flat +stat, on general machinery.

- **Skeleton:** modifiers = effects applied to the hero / to derived values,
  **read at the point of use** (projectile spawn reads bullet-size modifier; fire
  system reads firerate; etc.). **Build generic so the hazards phase's poison
  debuff reuses the exact same machinery.** Not a buff-only system.
- **Populated now:** keep existing stat buffs + add a *shape* buff: **big
  bullets** (increase projectile radius/hitbox). A couple more (pierce, faster
  bullets; multishot already exists).
- **Reuses:** weapon/projectile output (the combat-core phase) is what modifiers
  hook into.
- **Deferred:** enemy-side debuff *content* — machinery built here, first used by
  the hazards phase.
- **Known constraint (from code review):** bullet collision is point-sampled per
  step — fine at current speed, but a raw projectile-SPEED buff past ~1000px/s
  would tunnel through walls. If adding a speed buff here, switch bullets to
  swept / segment collision first, or avoid raw-speed buffs. (The "big bullets"
  radius buff is unaffected.)

### Phase 7 — Environment hazards (barrels)   ✓ DONE
**Goal:** barrels on the map that produce zones / explosions.

- **Skeleton:** a hazard entity (hittable by bullets) that on trigger produces an
  effect. Generic effects: **explosion (AoE)**, **damaging zone**, and
  **status-over-time** (reuses the buff-phase machinery for the poison DoT).
- **Populated now:**
  - **red barrel** — on hit, explodes: AoE damage to everything in radius.
  - **green barrel** — on hit, releases a **poison zone**: a damaging grid area
    for a duration; anything inside takes poison DoT (buff-phase status).
- **Reuses:** modifier/status system (buff phase), tile grid (zone placement),
  projectile collision (barrels hit by bullets).
- **Deferred:** other hazard types (lava, fire, traps) — cut; the "zone" concept
  is generic, so they're cheap later.

---

## Deferred entirely (NOT now — by the human's explicit call)

- **RL agent** — trained offline by the human, separately, once the game is
  "almost complete" with the dumb scripted brains. Seam built in the
  enemy-archetypes phase; the observation/action/reward interface and inference
  get added in that later phase. **Perf note (from code review):** if training
  runs the JS sim headless in Node (the leaning option), per-step allocations —
  the per-enemy `ctx` object and `entities.filter()` each frame — become GC
  pressure over millions of steps; reuse `ctx` and swap-remove instead of filter
  when building the training loop. Premature to optimize before then.
- **Bosses.**
- **Multi-room / dungeon generation / floors going up.**
- **Multiple selectable heroes** — skeleton ready (the dash/ability phase), 1 now.
- **More than 2 weapons, more than 1 ability** — skeletons ready, populate later.
- **Traps, destructible terrain** — explicitly cut.

---

## Keeping this coherent (important as the project grows)

If work splits across separate chats, each chat loses the global picture and
starts making locally-sensible but globally-wrong choices. The mitigation:
**PROJECT.md + this ROADMAP.md are the shared memory across all chats.** Any chat
must read both before acting, and whoever changes scope/status must update them
immediately. If these docs go stale, the split-chat approach falls apart.
