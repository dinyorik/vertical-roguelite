# ROADMAP — Vertical Roguelite

> This expands and supersedes section 7 of PROJECT.md. It is the detailed build
> order. PROJECT.md still holds the vision, architecture, and out-of-scope rules
> — read it first.
>
> **How to read this:** systems are built as *skeletons* (general machinery) and
> populated with only **one or two concrete variants now**. "Add more later" is
> data, not new code. Respect what each phase defers — building deferred things
> early is the main way this project spreads thin and stalls.

---

## Architecture we hold (applies to every phase)

1. **Skeleton + data.** Every content type (heroes, weapons, abilities, enemies,
   buffs, hazards) = a general system + data plugged into it. Build the system
   once; variants are data. Only 1–2 variants populated now.
2. **Entity + systems** (established). Everything on screen is a plain-object
   entity; behavior lives in systems that run over the entity list by tag.
3. **Swappable enemy `brain`.** Enemy behavior is a module assigned per enemy.
   Scripted now; the SAME slot accepts RL inference later with no rewrite. This
   seam is built in Phase 4 and is what keeps RL possible.
4. **One modifier machinery for buffs AND debuffs/status.** Buffs (on hero) and
   status effects (e.g. poison on enemies) are the same kind of thing: modifiers
   read at the point of use. Build it generic in Phase 5 — do NOT build a
   buff-only system; Phase 6 reuses it.
5. **Reusable generic primitives.** projectile (hero + enemy), cooldown (weapons
   + abilities), damaging zone (poison), status-over-time (poison DoT), AND input
   signals (one game logic fed by either keyboard or on-screen controls — see
   Phase 2). Build these once, reuse everywhere.
6. **Tile grid is the spatial substrate.** Hazard zones, enemy positioning, and
   future RL observation all read the grid.

---

## Build order

### Phase 1 — Combat core: 2 weapons + swap + energy  ✓ DONE
Data-driven weapon system (ranged + melee), weapon swap, energy economy (ranged
costs energy, melee free + blocks bullets, kills drop orbs, ramping passive
regen). Merged.

### Phase 2 — Mobile control layer (virtual joystick + action buttons)
**Goal:** on-screen touch controls for mobile (the game runs on iPhone Safari
and currently has only hidden gestures). Desktop keyboard controls stay.

- **Skeleton:** controls are an INPUT FRONTEND that feeds the SAME existing game
  actions — they do not create a parallel input system. One game logic, two
  frontends (keyboard + touch UI).
- **Layout (PORTRAIT, narrow):** left virtual joystick for movement; right
  cluster of 3 action buttons. Reference is the Soul Knight mobile layout, but
  vertical/compact for a 360×640 screen — thumbs reach without covering the
  center where combat happens.
- **The 3 buttons:**
  - **Attack** (largest): HOLD = continuous fire (auto-aim is already in place;
    no aim stick). Maps to the existing fire path.
  - **Ability:** tap → `useAbility()`. **Laid out now, but a NO-OP placeholder**
    — the dash it triggers lands in Phase 3. Button lights up / works once the
    dash exists. Include a cooldown-state hook even if unused now.
  - **Swap:** tap → existing `swapWeapon()`.
- **Critical — multi-touch:** the player MUST be able to use the joystick (left
  thumb) and an action button (right thumb) AT THE SAME TIME. Track touches by
  id; one touch must not cancel another. A twin-stick game is unplayable if you
  can't move and attack at once. This is the #1 way these controls break.
- **Replaces** the hidden mobile gestures from Phase 1 (drag-move, hold-shoot,
  tap-swap) with explicit controls — the old tap=shoot-or-swap ambiguity goes
  away. Desktop keys (WASD, arrows/space, Q/Tab, 1–3) stay unchanged.
- **Rendering:** semi-transparent overlay on top of gameplay (opacity so the
  field stays visible) — same canvas drawn last, or a DOM overlay; builder picks.
- **Deferred:** an on-screen aim stick (we use auto-aim); layout polish/themes.

### Phase 3 — Hero ability: dash
**Goal:** one active ability — a dash — on a general ability skeleton.

- **Skeleton:** an ability is DATA on the hero (`{name, cooldown, cooldownLeft,
  ...}`) in an ability slot (one for now). A general "use ability" path checks
  cooldown, fires the effect, sets cooldown. Built so a second ability could plug
  in later as data + an effect branch — not hardcoded so deeply it only fits dash.
- **Populated now:** **dash** — a sharp, short, fast burst in the current
  movement direction (or aim direction if standing still). Snappy, short-range,
  NOT a long glide; a brief high-velocity burst, not a teleport. Must respect
  walls (reuse existing wall-collision; no clipping through cover). Optional
  brief tunable i-frames. **Cooldown-gated, not energy-gated** (energy is only
  for ranged fire).
- **Input:** binds to the **ability button built in Phase 2** (mobile) + a free
  desktop key (e.g. Shift). The Phase 2 button's no-op hook becomes the dash.
- **Reuses:** cooldown concept (Phase 1), wall-collision movement, the ability
  button (Phase 2).
- **Deferred:** more abilities; multiple selectable heroes (skeleton supports
  selection — only 1 hero now).

### Phase 4 — Enemy archetypes + brain seam
**Goal:** 3 enemy types with distinct **dumb** behaviors, and the swappable
brain that RL later slots into.

- **Skeleton:** enemy behavior = a `brain` module assigned per enemy. Scripted
  now; the same slot must accept an RL inference brain later with no game rewrite.
  This is the RL seam — build it clean even though RL is far off.
- **Populated now (all intentionally simple):**
  - **charger** — rushes the hero, contact damage, fragile.
  - **kiter** — keeps distance, shoots (reuses the projectile system), backs off
    when approached. (Its bullets are what finally make the melee shield testable.)
  - **heavy** — slow, tanky, telegraphed heavy hit via a visible wind-up state.
- **Reuses:** projectile system (kiter), tile grid (positioning).
- **Deferred:** smart/RL brains (deferred phase); bosses; pathfinding — enemies
  still move straight-line and may stick on walls; accepted, not a bug.

### Phase 5 — Buff / modifier system
**Goal:** richer between-wave upgrades than flat +stat, on general machinery.

- **Skeleton:** modifiers = effects applied to the hero / to derived values,
  **read at the point of use** (projectile spawn reads bullet-size modifier;
  fire system reads firerate; etc.). **Build generic so Phase 6's poison debuff
  reuses the exact same machinery.** Not a buff-only system.
- **Populated now:** keep existing stat buffs + add at least one *shape* buff:
  **big bullets** (increase projectile radius / hitbox). A couple more in the
  same spirit (multishot already exists; pierce, faster bullets, etc.).
- **Reuses:** weapon/projectile output (Phase 1) is what modifiers hook into.
- **Deferred:** enemy-side debuff *content* — machinery built here, first used in
  Phase 6.

### Phase 6 — Environment hazards (barrels)
**Goal:** barrels on the map that produce zones / explosions.

- **Skeleton:** a hazard entity (hittable by bullets) that on trigger produces an
  effect. Generic effects: **explosion (AoE)**, **damaging zone**, and
  **status-over-time** (reuses Phase 5 machinery for the poison DoT).
- **Populated now:**
  - **red barrel** — on hit, explodes: AoE damage to everything in radius.
  - **green barrel** — on hit, releases a **poison zone**: a damaging area on the
    grid for a duration; anything inside takes poison DoT (Phase 5 status).
- **Reuses:** modifier/status system (Phase 5), tile grid (zone placement),
  projectile collision (barrels hit by bullets).
- **Deferred:** other hazard types (lava, fire, traps) — cut for now; the "zone"
  concept is generic, so they're cheap later.

### Phase 7 — Wave structure (mini-waves) + scaling
**Goal:** waves spawn in sub-batches, and get harder with depth.

- **Mini-waves (Soul-Knight style):** a **wave** (the unit between intermissions)
  becomes a sequence of **mini-waves**. Each mini-wave spawns a batch (e.g. ~10);
  cleared → next mini-wave; ALL mini-waves cleared → intermission (upgrade pick).
  Refines the COMBAT state from PROJECT.md 5.3: COMBAT now contains internal
  mini-wave sequencing.
- **Scaling with depth:** mini-waves per wave increase as the player progresses,
  and enemy HP scales with wave number. (Both tunable.)
- **Deferred:** bosses every N waves, floors-as-rooms — all post-RL.

---

## Deferred entirely (NOT now — by the human's explicit call)

- **RL agent** — trained offline by the human, separately, once the game is
  "almost complete" with the dumb scripted brains. Seam built in Phase 4; the
  observation/action/reward interface and inference get added in that later phase.
- **Bosses.**
- **Multi-room / dungeon generation / floors going up.**
- **Multiple selectable heroes** — skeleton ready (Phase 3), only 1 now.
- **More than 2 weapons, more than 1 ability** — skeletons ready, populate later.
- **Traps, destructible terrain** — explicitly cut.

---

## Keeping this coherent (important as the project grows)

The human may split work across separate chats per system. That can work, but
each chat (architect or builder) loses the global picture and starts making
locally-sensible but globally-wrong choices. The mitigation: **PROJECT.md + this
ROADMAP.md are the shared memory across all chats.** Any chat must read both
before acting, and whoever changes scope/status must update them immediately. If
these docs go stale, the split-chat approach falls apart — they are the only
thing holding one coherent project together when no single chat sees all of it.
