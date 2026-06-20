# PROJECT BRIEF — Vertical Roguelite (working title TBD)

> Read this fully before writing any code. It tells you what we're building,
> why, what already exists, and — critically — what is deliberately OUT of scope
> right now. Respecting the scope boundaries matters as much as the code.

---

## 1. What this is

A **top-down roguelite shooter** in the spirit of Soul Knight: rooms, waves,
bosses, weapons, dodging bullets. Vertical (portrait) format, runs in the
browser so it works on iPhone Safari with no build step.

**This is not a commercial product.** Two real goals, in priority order:

1. **Learn how a game like this works from the inside** — by building each
   system (entities, waves, walls, attacks, bosses) and understanding it,
   not by using an engine that hides it. Hence: plain JS, canvas, no framework.
2. **Be a personal RL sandbox.** The long-term hook is an RL-trained enemy
   agent that genuinely outplays the developer (who is the only intended
   player). The dev has an RL background and wants an opponent that is honestly
   *better* than them — not a scripted bot.

There is no audience to please. Design decisions optimize for: the dev learning,
the dev having fun playing, and the environment being rich enough to train an
agent in later.

---

## 2. The RL vision (context — NOT to build yet)

This shapes architecture decisions now, even though we are NOT implementing RL
yet. Keep it in mind so today's code doesn't block tomorrow's RL work.

- Plan: train ~10 enemy agents **offline**, weak → strong, save weights, and
  swap the active agent for a stronger one as the player progresses through
  waves/floors. Not online learning — pre-trained weights swapped at runtime.
- The agent must beat the player through **prediction and positioning**, not
  through inhuman reaction speed. So when we get there, the agent will be given:
  human-like reaction delay, capped action frequency, and partial information.
  An opponent that wins by frame-perfect reflexes is *annoying*, not
  impressive. One that wins by reading the player is the goal.
- **Implication for today:** the game world must eventually be expressible as
  arrays for a neural net (this is WHY the map is a tile grid, not arbitrary
  rectangles), and enemy behavior must be a swappable module (so a scripted
  brain can later be replaced by a weights-inference brain without rewriting
  the game).

Do not implement any RL, observation/action interfaces, or brain-swapping yet.
Just don't make choices that would block them.

---

## 3. Architecture (established — keep it)

- **Single HTML file, plain JS, canvas.** No build, no framework. Opens in
  Safari directly. (TS + Vite migration is a *later* concern, not now.)
- **Portrait viewport:** virtual resolution 360×640, scaled to fit screen.
- **Everything on screen is an Entity** — a plain object with data fields
  (x, y, r, hp, etc). Hero, enemy, bullet are the SAME structure with different
  fields. NO class-per-type hierarchy.
- **Behavior lives in Systems**, not in entities. Each system runs once per
  frame over the entity list and handles only the entities it cares about
  (by `tag`). Adding a boss = a new enemy entity + a system, not a new class.
- **Fixed timestep game loop** at 1/60s, decoupled from screen refresh rate
  (iPhones run 60 or 120Hz — physics must not depend on that).

This component/system structure is the thing the dev most wants to understand
and the thing that makes everything else extensible. Preserve it.

---

## 4. What's DONE (current state of the code)

The existing single-file prototype already has:

- Game loop (fixed 1/60 timestep), portrait canvas, resize-to-fit.
- Input: drag-to-move + WASD; shoot on touch-hold / arrow keys.
- Entity system with factories: `makeHero`, `makeEnemy`, `makeBullet`.
- Hero: moves, auto-aims at nearest enemy, fires on cooldown.
- Enemy: dumb AI (walks straight at hero), contact damage.
- Bullets: travel, lifetime, collision (hero bullets damage enemies).
- HP + death + restart-on-tap.
- Endless waves placeholder: clear all enemies → a new wave spawns.

It is playable. It is an empty rectangular arena — no walls yet.

---

## 5. What's NEXT — THIS iteration (the task you're being given)

Turn the empty arena into a **wave loop on a tile map with cover walls and a
between-wave choice.** Full spec:

### 5.1 Map = tile grid (decision made, non-negotiable)
- A 2D grid of cells (~20×36 at 18px tiles — adjust to fit 360×640), each cell
  `floor` or `wall`. Store as a 2D array.
- ALL collision and geometry go through the grid. (Reason: later the grid feeds
  the RL agent as an array and supports grid pathfinding. Arbitrary rectangles
  would block that — do not use them.)

### 5.2 Walls block movement AND bullets (cover)
- Movement: hero and enemies cannot enter `wall` cells (check the target cell
  by coordinate — do NOT loop over all walls).
- Bullets: each step, if the bullet's position is in a `wall` cell, it dies.
  Per-step cell check is enough for MVP; no full raycast yet (bullets are fast
  but step is small; if tunneling shows up, add raycast then).
- Cover is essential: without it the only path to victory is aim/speed, which
  is exactly the "annoying not impressive" failure mode we're avoiding.

### 5.3 Round state machine
- Explicit state variable: `COMBAT` → (all enemies dead) → `INTERMISSION`
  (10s, combat paused, no new enemies) → `COMBAT` (next wave).
- Make it an explicit state, not ad-hoc flags — floors and bosses-every-N-waves
  will hang off this later.

### 5.4 New map each wave
- Entering each new COMBAT wave: regenerate wall layout on the grid.
- Generation is PRIMITIVE: scatter 4–8 rectangular / L-shaped obstacles as
  cover. NOT a maze, NOT dungeon algorithms.
- Hard rules: (a) player spawn and enemy spawns are always on `floor`;
  (b) map is connected — no sealed-off zones. Verify with a flood-fill from the
  player: every floor cell must be reachable; if not, regenerate.

### 5.5 Between-wave choice
- During INTERMISSION, show the player 2–3 options; pick one by tap/key.
- Minimum set: "+weapon" (changes hero fire params — damage / fire rate / bullet
  count) and "heal" (restore HP). Hardcode 3–4 options. NO currency, NO shop.

### Keep from current code
Entity-list + systems + fixed 1/60 step, portrait viewport, drag/WASD + shoot,
HP bar, restart.

---

## 6. OUT of scope this iteration (do NOT build)

Building these now is the main risk. Explicitly excluded:

- Enemy attack variety / archetypes — that's the NEXT iteration.
- Pathfinding — enemies still walk straight at the hero even with walls.
  Getting stuck on walls is ACCEPTABLE for now; grid pathfinding comes later
  when it actually hurts.
- Currency / economy / shops.
- Fancy / nice-looking procedural generation.
- Art / sprites — primitives (circles, rects) only.
- Any RL: observation/action interfaces, brain-swapping, weights inference.
- Rooms-with-doors / multi-room dungeons — one arena is the whole environment
  for now.

---

## 7. Roadmap after this (direction, not tasks)

> ⚠ Superseded by ROADMAP.md — see it for the detailed phases and live status.
> Done so far: this section's item 1, plus Phase 1 (combat core: weapons /
> melee / swap / energy) and Phase 2 (mobile control layer), Phase 3 (dash). Current: Phase 4 (enemy archetypes).

1. **DONE:** wave loop + tile map + cover walls + between-wave choice.
2. **Enemy attack archetypes** (3): melee charger, ranged kiter, telegraphed
   heavy hitter. This is what gives an agent a real *decision space* — without
   varied attacks, the optimal enemy policy is trivial and nothing to learn.
3. **Distance-as-mechanic + player vulnerability windows** (reload, dash
   cooldown, post-attack recovery) — so positioning matters and an agent has
   something to read and exploit.
4. **Swappable `brain` module on enemies** + an observation/action/reward
   interface — the seam where a scripted brain can be replaced by RL inference.
5. **Bosses** (an enemy with big HP + a state machine) every N waves; waves
   become floors going UP (the vertical hook).
6. **Offline RL training** against this environment; weight-swapping ladder.

The path to the cool RL boss runs THROUGH the boring MVP. The game is the
agent's training environment — there is no agent without a working game first.

---

## 8. Working style

- The human is acting as product/architect and is routing specs to you. Build
  what's specified; if a spec is ambiguous, ask rather than inventing scope.
- Respecting "out of scope" is part of the job. Adding unrequested systems —
  even good ones — sets the project back by spreading it thin before the core
  is solid.
- Code should stay readable: the human wants to understand each system, not
  receive a black box. Comment the non-obvious parts (why, not what).
