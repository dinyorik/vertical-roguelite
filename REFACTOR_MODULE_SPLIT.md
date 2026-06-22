# REFACTOR — Module split (single file → ES modules)

> PURE REFACTOR. ZERO gameplay/behavior change. Read PROJECT.md + ROADMAP.md.
> Phases 1–7 are done and merged; Phase 8 (currency) comes after this. Do NOT add
> features here — if you find yourself changing behavior, stop; this is structure
> only.

## Why
`game.html` is one large file and has become hard to navigate. Phases 8–9 add a
lot (currency, shop, four new weapons). Split it into modules NOW so that new work
lands in a clean structure instead of a bigger monolith.

## Hard constraint — stays buildless AND runs on iPhone Safari
- Use **native ES modules**: `<script type="module">` + `import` / `export`. NO
  bundler, NO build step, NO npm.
- **Consequence: the game must be SERVED over http(s), not opened from `file://`.**
  Native modules are blocked under `file://` (CORS). So:
  - **Mobile testing:** enable **GitHub Pages** on the repo → the game is at a URL
    → open that in iPhone Safari. (This also replaces AirDropping a file each
    time; the URL is always the latest push.)
  - **Local desktop testing:** run a static server in the repo dir, e.g.
    `python3 -m http.server`, then open `http://localhost:8000`. Double-clicking
    `index.html` from disk will NOT work anymore — that is expected and fine.
- `index.html` becomes minimal: the canvas + `<script type="module"
  src="./src/main.js"></script>` (and the small CSS).

## What to do
Split `game.html` into `index.html` + an ES-module tree (suggest a `src/` dir).
Module boundaries follow the existing comment-delimited sections. A reasonable
split (you may adjust — keep it clean and along these lines):
- `constants.js` — all tunable constants (dimensions, `STEP`, gameplay numbers).
- `state.js` — shared mutable state (`entities`, `hero`, `round`) + the `add()`
  helper. (See "the crux" below.)
- `canvas.js` — canvas/`ctx`, `fit()`, DPR handling.
- `input.js` — keyboard + touch + joystick + buttons → the shared input signals.
- `grid.js` — tile map, generation, radius-aware connectivity, cell helpers.
- `entities.js` — entity factories (hero, enemy, bullet, barrel, orb…).
- `modifiers.js` — `addMod` / `modValue` / `sysMods`.
- `weapons.js` — weapon data + fire handlers.
- `abilities.js` — ability slot + dash.
- `enemies.js` — brains + `sysEnemies`.
- `hazards.js` — barrels, explosion, gas.
- `combat.js` — bullets, damage (`hurtEnemy`), collision.
- `waves.js` — round state machine, mini-waves, spawning.
- `render.js` — all drawing.
- `main.js` — the fixed-timestep loop + wiring + `resetWorld`.

## The crux — shared mutable state
The current code leans on module-level mutable globals (`entities`, `hero`,
`round`, `ctx`, input flags). On split, these need ONE home:
- Put shared mutable state in a small `state.js` (and `ctx` in `canvas.js`),
  exported and imported where used — not re-declared or scattered.
- Systems import the state/helpers they use; they do NOT each keep their own copy.
- **Watch for circular imports.** Many systems use shared helpers (`hurtEnemy`,
  `add`, `modValue`). Put low-level shared helpers in low-level modules that don't
  import back up, so the dependency graph stays acyclic. If a cycle appears, hoist
  the shared piece downward rather than cross-importing.

## Verify behavior is unchanged
- After the split the game must play EXACTLY as before — same controls, combat,
  energy, dash, waves, hazards, buffs. Any behavior difference is a regression.
- Sanity-check it loads and runs BOTH served locally (`http.server`) AND on GitHub
  Pages (iPhone Safari): multi-touch, dash, the between-wave pick, barrels, poison,
  mini-waves all still work.

## Out of scope
- Any gameplay/feature change. Currency, shop, new weapons — Phase 8+.
- A bundler / build tooling. Native modules only.

## Commits
Per GIT_WORKFLOW.md. Hard to slice into many tiny commits cleanly; a reasonable
approach: extract leaf modules first, then systems, then `main.js`, each commit
leaving the game runnable. Prefix `refactor:`. Enable GitHub Pages and put the
play URL in the README. Update PROJECT.md / ROADMAP status when done (module split
complete, Phase 8 = currency next). Push for review.
