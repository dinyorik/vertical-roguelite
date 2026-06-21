# PHASE 4 — WORK ORDER: Enemy archetypes + brain seam

> This is the current task. Build ONLY what's specified here.
> Read PROJECT.md and ROADMAP.md first for context, architecture, and what is
> out of scope. Phases 1–3 are done and merged. Do NOT implement anything from
> later phases (mini-waves, buffs, hazards, bosses, RL).

## What exists now (after Phases 1–3)
`game.html` has: entity + systems, fixed 1/60 loop, portrait grid map with cover
walls (radius-aware connectivity), COMBAT→INTERMISSION wave loop, between-wave
upgrade pick, ONE dumb enemy (walks straight at the hero, contact damage), a
data-driven weapon system (ranged + melee + swap), the energy economy, mobile
controls, and the dash ability. Relevant hooks:
- `makeBullet(x, y, dx, dy, owner)` — bullets travel and die on walls; HERO
  bullets (`owner==='hero'`) damage enemies; the `owner` field distinguishes
  them. **Enemy bullets (`owner==='enemy'`) are already DESTROYED by the melee
  swing** (built in Phase 1), but nothing spawns them yet and they don't yet hurt
  the hero.
- `moveWithWalls(e, mx, my, dt, speed?)` — movement that respects walls.
- the hero damage path is gated on `!hero.invuln` (dash i-frames).
- the wave spawner currently spawns copies of the single enemy type.

## Goal
Three enemy types with distinct, intentionally DUMB behaviors, built on a
swappable **brain** module — the seam an RL policy slots into later with no game
rewrite. Scripted brains now; the same interface accepts RL inference later.

## Spec

### 1. The brain seam (the key architectural piece — get this right)
- An enemy is DATA (stats) + a **brain**. The brain is a function assigned per
  enemy that, each tick, **decides** what the enemy wants to do and **returns an
  action** — it does NOT mutate the world directly.
- Shape it as `brain(enemy, ctx) -> action`:
  - `ctx` = the enemy's view of the world (its own state, hero position +
    distance, whatever the behavior needs). This is the "observation".
  - `action` = a small struct, e.g. `{ moveX, moveY, attack }` — a movement
    intent vector plus an attack intent.
- A single enemy system then **applies** the action: moves the enemy (via
  `moveWithWalls`), triggers attacks, etc. **Keep "decide" (brain) separate from
  "act" (system).**
- **Why this matters:** later an RL policy is just another brain — the same
  `(observation) -> action` contract. If behavior is written inline as
  `if (dist < x) enemy.x += ...`, there is NO seam and RL cannot slot in. So even
  though the scripted brains are simple now, they MUST read from `ctx` and RETURN
  an action that the system applies.
- **Keep it minimal.** Do NOT build a full RL observation/action framework now —
  just the clean decide/act split with a small action struct. The formal
  observation/action/reward spec arrives with the (much later) RL phase.

### 2. The three archetypes (each = a brain + base stats; all intentionally simple)
- **Charger** — fast, fragile (low HP). Brain: move straight at the hero at full
  speed; attack = contact damage (already exists). Optionally a short lunge when
  close. Pressures the player to keep moving.
- **Kiter** — medium HP. Brain: maintain a preferred distance — move AWAY if the
  hero is closer than that, hold/approach if farther; attack = fire a projectile
  at the hero on a cooldown. **Reuses the projectile system** — spawn
  `makeBullet(..., 'enemy')` aimed at the hero. This puts enemy bullets on screen
  for the first time (see §3).
- **Heavy** — high HP, slow. Brain: approach the hero slowly; when in range,
  enter a **telegraphed wind-up** (a visible tell, ~0.5s, tunable) THEN deliver a
  heavy hit (high damage, short-range / small AoE). The wind-up is a brain state
  with a timer; the player reads it and dodges. Slow and readable, not spammy.
- **Spawn:** the existing wave spawner now picks among the three (a random mix is
  fine for now; mini-waves and spawn tuning are the NEXT phase). Give each a
  distinct color/shape so they're tellable apart at a glance.
- All stats (HP, speed, damage, distances, cooldowns, wind-up time) are tunable
  placeholders — pick sane values; the human tunes by feel.

### 3. Enemy projectiles (for the kiter)
- Enemy bullets use the existing bullet system with `owner='enemy'`.
- **Wire enemy bullets to damage the HERO on contact, gated on `!hero.invuln`**
  (so dash i-frames dodge them). Currently only hero bullets deal damage; add the
  enemy-bullet → hero path.
- **Verify** the melee swing already destroys enemy bullets (it does, from Phase
  1 — it checks `owner==='enemy'`). No new melee code; just confirm it triggers
  now that enemy bullets exist. This is the first time the melee shield is
  actually testable.

### 4. Architecture constraints
- Keep entity + systems, fixed 1/60 loop, portrait viewport, grid/walls, weapons,
  energy, dash, mobile controls, wave loop, HUD, restart.
- Enemy behavior MUST go through the brain seam (decide → action → system
  applies). Reuse `moveWithWalls` for enemy movement and the projectile system
  for kiter shots — do NOT write new movement or a new bullet type.
- Pathfinding stays straight-line (no pathfinding) — enemies may stick on walls;
  accepted, not a bug. A kiter backing into a wall is fine.
- This phase touches: enemy creation (stats + brain), the brain/enemy system,
  enemy-bullet → hero damage, and spawn (pick an archetype). It does NOT add
  mini-waves, buffs, hazards, bosses, or pathfinding.

## Out of scope for THIS phase (do not build)
- Mini-waves / wave sub-batching — that's the NEXT phase (Phase 5).
- Smart / RL brains, bosses, pathfinding, buff/modifier changes, hazards.

## Commits
Per GIT_WORKFLOW.md: one logical change per commit — suggested split: (1) brain
seam + charger, (2) kiter + enemy-bullet→hero wiring, (3) heavy + telegraph,
(4) spawn-mix. Conventional prefixes (`feat:` / `fix:` / `refactor:`). Update the
status line in PROJECT.md / ROADMAP.md when done (Phase 4 complete, Phase 5 =
mini-waves next). Push so the human can share commit links for review.
