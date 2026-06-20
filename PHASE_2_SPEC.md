# PHASE 2 — WORK ORDER: Mobile control layer (virtual joystick + action buttons)

> This is the current task. Build ONLY what's specified here.
> Read PROJECT.md and ROADMAP.md first for context, architecture, and what is
> out of scope. Phase 1 (combat core) is done and merged. Do NOT implement the
> dash effect (that's Phase 3) or anything from later phases.

## What exists now (after Phase 1)
`game.html` runs on iPhone Safari and desktop. It has: entity + systems, fixed
1/60 loop, portrait grid map with cover walls, COMBAT→INTERMISSION wave loop,
between-wave upgrade pick, one dumb enemy, a data-driven weapon system (ranged +
melee, swap), and the energy economy. **Mobile input is currently hidden
gestures only:** drag-to-move, hold-anywhere-to-shoot, quick-tap-to-swap. The
hero auto-aims at the nearest enemy (`hero.aimX/aimY`). Existing actions in code:
movement via `moveWithWalls`, firing via the `firing()`→`fireActive()` path,
weapon swap via `swapWeapon()`.

## Goal of this phase
Add an on-screen control layer for mobile: a left virtual joystick for movement
and a right cluster of 3 action buttons (attack, ability, swap), rendered as a
semi-transparent overlay. The controls feed the SAME existing game actions —
they must NOT create a parallel input system. Desktop keyboard controls stay.

## Reference & layout
Soul Knight's mobile layout is the reference: left thumb joystick (outer ring +
draggable inner stick), right-side action buttons. **BUT our screen is PORTRAIT
(360×640)** — so the layout is vertical and compact: joystick bottom-left,
buttons bottom-right, tight spacing so thumbs reach without covering the center
where combat happens. Do not copy a wide landscape fan of buttons.

## Spec

### 1. Virtual joystick (movement) — bottom-left
- Outer ring + draggable inner stick. Output a normalized movement vector — the
  SAME signal the current drag-move produces — and feed it into the existing
  hero movement (`moveWithWalls`). Do NOT write new movement code.
- Center dead zone; clamp stick travel to the ring radius.
- Floating (anchors where the left-zone touch lands) or fixed — pick one, note
  the choice. Floating is usually more ergonomic on phones.

### 2. Action buttons (right cluster) — bottom-right, 3 buttons
- **ATTACK** (largest): HOLD to fire continuously; release to stop. Maps to the
  existing firing path (hold = `firing()` true). Auto-aim is already in place;
  there is NO aim stick.
- **ABILITY** (skill): tap → call `useAbility()`. **The dash lands in Phase 3 —
  for now this hook is a NO-OP placeholder** (no ability equipped yet). Lay the
  button out now; include a cooldown-state hook (dim/lit) even though it does
  nothing yet. It becomes live when Phase 3 plugs in the dash.
- **SWAP:** tap → existing `swapWeapon()`. Indicate the active weapon (reuse or
  echo the existing weapon readout).
- Compact arc/column for a narrow portrait screen; main attack reachable by the
  right thumb, ability + swap around it.

### 3. Multi-touch (CRITICAL)
- The player MUST be able to use the joystick (left thumb) and an action button
  (right thumb) **simultaneously**. Track active touches by `identifier`; one
  touch must never cancel or steal another. A twin-stick game is unplayable if
  you can't move and attack at the same time. Test this explicitly.

### 4. Overlay rendering & input plumbing
- Render the controls as a semi-transparent layer on top of gameplay (opacity so
  the field stays visible): either the same canvas drawn last, or a DOM/HTML
  overlay — pick whichever is cleaner; note the choice.
- The controls TRANSLATE touches into the EXISTING actions: joystick → movement
  vector; attack hold → firing; ability tap → `useAbility()`; swap tap →
  `swapWeapon()`. One game logic, two input frontends.
- This REPLACES the hidden mobile gestures from Phase 1 (drag-move, hold-shoot,
  tap-swap). With explicit buttons the old tap=shoot-or-swap ambiguity is gone.
- Desktop keyboard controls (WASD, arrows/space, Q/Tab, 1–3) stay UNCHANGED. On
  desktop the on-screen controls may be hidden or shown — note the choice; do
  not break keyboard play.

### 5. Architecture constraints
- Keep entity + systems, fixed 1/60 loop, portrait viewport, grid/walls,
  weapons, energy, wave loop, HUD (HP + energy bars), restart.
- Do NOT duplicate game logic in the UI. The joystick/buttons only produce the
  same input signals the keyboard path already produces.
- Touch handling must support concurrent touches (joystick + button together).
- This phase touches input handling and overlay rendering ONLY. It does NOT
  change weapons, energy, enemies, waves, or add the dash effect.

## Out of scope for THIS phase (do not build)
- The dash effect / ability skeleton internals — Phase 3. (The ability BUTTON is
  laid out here; the dash it triggers comes next.)
- An on-screen aim stick — we use auto-aim.
- Enemy archetypes, buff/modifier changes, hazards/barrels, mini-waves, RL.

## Commits
Per GIT_WORKFLOW.md: one logical change per commit, Conventional Commits
prefixes, update the status line in PROJECT.md / ROADMAP.md when done (Phase 2
complete, Phase 3 = dash next). Push so the human can share commit links.
