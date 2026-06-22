# Vertical Roguelite (working title TBD)

Top-down roguelite shooter (Soul Knight-ish): waves, cover, enemy archetypes,
dash, upgrades, hazards. Plain JS + canvas as **native ES modules**, no build step.
Portrait; runs in the browser incl. iPhone Safari.

## Run it

Native ES modules must be served over **http(s)** — they do NOT load from `file://`.

- **Desktop (local):** from the repo root, run a static server, then open the URL:
  `python3 -m http.server`  ->  http://localhost:8000
- **Mobile (iPhone Safari):** open the GitHub Pages URL:
  https://dinyorik.github.io/vertical-roguelite/
  One-time setup: repo **Settings -> Pages -> Source: Deploy from branch `main` (/root)**.

Double-clicking `index.html` from disk will NOT work (file:// blocks modules) — expected.

## Controls
- **Desktop:** WASD/arrows move - space shoot - Q swap - Shift dash - 1-3 pick - R/click restart.
- **Mobile:** on-screen joystick + FIRE / SKILL (dash) / SWAP buttons; tap to pick/restart.

## Structure
`index.html` + `src/` ES modules: constants, state, canvas, grid, entities,
modifiers, weapons, abilities, enemies, hazards, combat, input, waves, render, main.
Shared mutable state lives in `src/state.js`.

## More
`PROJECT.md` = vision / architecture / scope. `ROADMAP.md` = phase plan + status.