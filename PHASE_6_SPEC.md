# PHASE 6 — WORK ORDER: Buff / modifier system

> This is the current task. Build ONLY what's specified here.
> Read PROJECT.md and ROADMAP.md first for context, architecture, and what is
> out of scope. Phases 1–5 are done and merged. Do NOT build later phases
> (hazards, bosses, RL).

## What exists now (after Phases 1–5)
The between-wave INTERMISSION already offers an upgrade pick (3 of a hardcoded
pool: damage / fire-rate / multishot / heal / max-HP). These currently **mutate
stats directly** (e.g. `rangedOf(hero).damage += 6`). Weapons are data objects
(ranged has `damage`, `cooldown`, `bulletCount`, `bulletRadius`, `bulletSpeed`,
`spread`; melee its own). Bullets are spawned from the active weapon's data and
die on the first enemy hit. The game has mini-waves + depth scaling.

## Goal
Replace the ad-hoc direct-mutation upgrades with a **general modifier system**,
and add richer buffs (notably **big bullets**). The point is NOT the buffs
themselves — those could stay direct mutations. The point is to build the
**generic modifier machinery now**, exercised by buffs, so that the hazards
phase's poison **debuff drops into the same system** with no new machinery. This
is the roadmap's "one modifier machinery for buffs AND debuffs/status" — do NOT
build a buff-only system.

## Spec

### 1. The generic modifier system (the skeleton — get this right)
- **Any entity** can carry a list of active modifiers: `entity.mods = []`.
- A **modifier** is data describing an ongoing effect:
  `{ stat, mul?, add?, duration?, onTick? }`
  - `stat` — the value it affects, e.g. `'bulletDamage'`, `'bulletRadius'`,
    `'bulletCount'`, `'pierce'`, `'fireCooldown'`, `'moveSpeed'`, `'hp'`.
  - `mul` / `add` — how it changes the value (multiplicative and/or additive;
    define a consistent fold order, e.g. apply all `add`s then all `mul`s).
  - `duration` — seconds remaining; **omit = permanent** (this is how run-long
    buffs work). Present = temporary (this is how poison/status will work).
  - `onTick(entity, dt)` — optional per-frame effect, for damage-over-time and
    the like (this is what poison will use).
- **`modValue(entity, stat, base)`** — folds the entity's matching modifiers over
  a `base` value and returns the result. Call it **at the point of use** (see §2),
  not by pre-mutating base stats.
- **`sysMods(dt)`** — one system over the entity list: tick each modifier's
  `duration` (decrement, remove when expired) and run its `onTick` if present.
  Add it to the COMBAT system order.

This system is the whole deliverable. Buffs and (future) debuffs are just data
fed into it.

### 2. Read modified values at the point of use
Stop pre-mutating weapon/hero stats. Instead, read through `modValue` where the
value is actually used:
- Ranged bullet spawn: `dmg = modValue(hero,'bulletDamage', w.damage)`,
  `radius = modValue(hero,'bulletRadius', w.bulletRadius)`,
  `count = modValue(hero,'bulletCount', w.bulletCount)`,
  `pierce = modValue(hero,'pierce', 0)`.
- Fire cadence: `cd = modValue(hero,'fireCooldown', w.cooldown)`.
- (Extend to other stats as buffs need them.)
The weapon data stays the BASE; modifiers adjust it at use. This is what lets
"big bullets" change a bullet that doesn't exist yet — the radius is computed at
spawn from the hero's current mods.

### 3. Migrate the existing upgrades to modifiers
Rewrite the current pool so each pick **adds a modifier** instead of mutating a
stat, preserving its current effect and balance (this is a mechanism change, not
a balance change):
- damage → permanent `{stat:'bulletDamage', ...}`
- fire-rate → permanent `{stat:'fireCooldown', mul:<1}`
- multishot → permanent `{stat:'bulletCount', add:+N}`
- max-HP → permanent maxHP increase (a `'maxHp'` mod, or keep direct — note the
  choice; maxHP touches HP-bar clamping).
- heal → **instant one-time effect** (NOT a modifier; it's a single event, apply
  immediately). Not everything is a modifier — only ongoing effects are.
Picks **stack** (each adds another mod) — expected for a roguelite run.

### 4. New buffs (populate now)
- **Big bullets** — `{stat:'bulletRadius', mul:>1}`. The motivating shape buff;
  bigger projectile hitbox. Stacks (compounds).
- **Pierce** — `{stat:'pierce', add:+1}`. The bullet passes through that many
  enemies before dying. Requires a small bullet-vs-enemy change: a bullet carries
  a `pierce` count (set at spawn from `modValue`); on hitting an enemy it
  decrements pierce and keeps going instead of dying, until pierce is exhausted.
- (Optionally one or two more in the same spirit.)

### 5. CONSTRAINT — no raw bullet-speed buff this phase (from code review)
Bullet collision is point-sampled per step. It's safe at current speeds, but a
**raw projectile-SPEED buff past ~1000px/s would tunnel through walls.** So:
- Do **NOT** add a bullet-speed buff in this phase.
- The "big bullets" radius buff is **unaffected** (radius doesn't cause tunneling)
  — it's fine.
- If a speed buff is ever wanted later, swept/segment bullet collision must be
  built first. Out of scope here; just don't introduce the hazard.

### 6. Architecture constraints
- Keep entity + systems, fixed 1/60 loop, portrait viewport, grid/walls, weapons,
  energy, dash, mobile controls, mini-waves, HUD, restart, the brain seam.
- The modifier system must be **generic** — an enemy carrying a `{stat:'hp',
  onTick, duration}` poison mod in the hazards phase must work through the SAME
  `entity.mods` + `sysMods` + (for instant) direct path, with no new system. Do
  not special-case it to the hero.
- New system as its own clearly-delimited section. (Heads-up: the file is getting
  large; a module split is likely right after the next phase — not now.)
- This phase touches: the modifier system (new), the upgrade pool (migrate to
  mods), ranged-fire read sites (via `modValue`), and the bullet-vs-enemy path
  (pierce). It does NOT change enemies, energy, waves, or add hazards.

## Out of scope for THIS phase (do not build)
- A raw bullet-speed buff (see §5), swept collision, hazards/barrels (Phase 7),
  bosses, RL.
- Enemy-side debuff CONTENT (poison etc.) — the machinery is built here; poison
  is applied in the hazards phase.

## Commits
Per GIT_WORKFLOW.md: one logical change per commit — suggested split:
(1) generic modifier system (`entity.mods`, `modValue`, `sysMods`) + migrate the
existing upgrades to it (no behavior change), (2) big bullets, (3) pierce
(incl. the bullet-vs-enemy change). Conventional prefixes. Update PROJECT.md /
ROADMAP status when done (Phase 6 complete, Phase 7 = hazards next). Push for
review.
