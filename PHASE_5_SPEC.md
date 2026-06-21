# PHASE 5 — WORK ORDER: Wave structure (mini-waves) + scaling

> This is the current task. Build ONLY what's specified here.
> Read PROJECT.md and ROADMAP.md first for context, architecture, and what is
> out of scope. Phases 1–4 are done and merged. Do NOT build later phases
> (buffs, hazards, bosses, RL). Also do NOT add enemy-entity separation/pushback
> in this phase (it's a known deferred item — keep this phase focused on wave
> structure even though batches will stack enemies).

## Terminology (the word "wave" is overloaded — pin it down)
- **Wave** = the unit BETWEEN intermissions (upgrade picks). A wave now contains
  MULTIPLE mini-waves. The map regenerates once per wave.
- **Mini-wave** = a single spawn batch within a wave. When a mini-wave is
  cleared, the next mini-wave spawns (after a short beat). When the LAST
  mini-wave of the wave is cleared → intermission.
- **waveNumber** = how deep the player is; drives scaling.

## What exists now (after Phases 1–4)
COMBAT spawns one batch of enemies (a random mix of charger/kiter/heavy via the
brain seam); when all are dead → INTERMISSION (upgrade pick) → next wave.
`round.state` is an explicit COMBAT/INTERMISSION machine. The map regenerates per
wave.

## Goal
Inside COMBAT, spawn enemies in sequential mini-waves (sub-batches) instead of one
batch, and scale difficulty with depth: more mini-waves per wave, and higher
enemy HP, as `waveNumber` grows. This is the Soul-Knight "batches within a wave"
feel and gives the run a sense of progression.

## Spec

### 1. Mini-wave sequencing inside COMBAT (refines the state machine)
- Track explicit sub-state on the round (NOT ad-hoc flags), e.g.:
  - `round.waveNumber` (starts at 1, +1 per wave),
  - `round.miniWavesTotal` (how many mini-waves THIS wave has),
  - `round.miniWaveIndex` (0-based, which mini-wave is active).
- **Entering a new wave** (start of COMBAT after an intermission, and on first
  start): regenerate the map, compute `miniWavesTotal` from `waveNumber`, set
  `miniWaveIndex = 0`, spawn the first mini-wave batch (HP scaled — see §2).
- **Progression within the wave:** when all enemies are dead AND
  `miniWaveIndex < miniWavesTotal - 1` → after a short delay (§3),
  `miniWaveIndex++` and spawn the next batch.
- **End of wave:** when all enemies are dead AND
  `miniWaveIndex == miniWavesTotal - 1` (last mini-wave cleared) → transition to
  INTERMISSION (upgrade pick).
- **After INTERMISSION** → `waveNumber++` and start the next wave (back to top).
- The "no enemies alive" check MUST distinguish "batch cleared, spawn next" from
  "wave fully cleared → intermission" — the sub-state above handles it.

### 2. Scaling with depth (keyed to waveNumber)
- **Mini-wave count grows:** `miniWavesTotal` increases with `waveNumber` (e.g.
  wave 1 → 2 mini-waves, wave 2 → 3, … capped at a sane max). Tunable formula.
- **Enemy HP grows:** when spawning a batch, multiply each enemy's base archetype
  HP by an `hpMult` derived from `waveNumber` (e.g. `1 + (waveNumber-1)*0.15`).
  Apply to BOTH `hp` and `maxHp` so HP bars render correctly. Tunable.
- Keep batch SIZE roughly constant (~the current count) — the SK feel is "more
  batches + tougher enemies", not "one giant batch". Don't scale batch size much
  (a little is fine); the two levers above are the focus.
- All formulas/constants are tunable placeholders — pick a gentle curve; the
  human tunes by feel.

### 3. Pacing between mini-waves
- Don't instant-spawn the next batch the frame the last enemy dies — it's abrupt.
  Add a short `miniWaveDelay` (e.g. ~1s, tunable) between a batch being cleared
  and the next batch spawning. Combat stays active (this is NOT an intermission);
  it's just a beat. A small visual cue (a brief "incoming" flash) is a nice touch
  if cheap.

### 4. HUD
- Show wave progress so the player knows where they are: the wave number and the
  mini-wave progress within it — e.g. compact `Wave 2 · 1/3` or `2-1` (the Soul
  Knight style). Keep it minimal and consistent with the existing primitive HUD.

### 5. Map regeneration
- The map regenerates **per wave**, NOT per mini-wave — it stays stable across all
  mini-waves of a wave, and regenerates at the start of each new wave. Make sure
  regen fires on new-wave, not on each mini-wave batch.

### 6. Architecture constraints
- Keep entity + systems, fixed 1/60 loop, portrait viewport, grid/walls, weapons,
  energy, dash, mobile controls, HUD, restart, the brain seam.
- Keep the round state machine EXPLICIT — mini-wave sequencing is explicit
  sub-state inside COMBAT, not ad-hoc booleans scattered around.
- Reuse the existing spawn (it already picks a random archetype mix) — wrap it as
  a "spawn one mini-wave batch with `hpMult`" call. Do NOT rewrite enemy spawning
  or the archetypes.
- This phase touches: the round state machine (mini-wave sub-state + sequencing),
  spawn batching, HP scaling at spawn, map-regen timing, and the HUD. It does NOT
  change enemy behavior, weapons, energy, or add new systems.

## Out of scope for THIS phase (do not build)
- Bosses every N waves, floors-as-rooms — post-RL.
- Buff/modifier changes (Phase 6), hazards (Phase 7).
- Enemy-entity separation / pushback — known deferred item; do NOT add here even
  though batches stack enemies. This phase is about wave structure only.

## Commits
Per GIT_WORKFLOW.md: one logical change per commit — suggested split:
(1) mini-wave sub-state + sequencing within a wave (fixed count, no scaling yet),
(2) depth scaling (mini-wave count + enemy HP by waveNumber),
(3) pacing + HUD indicator. Conventional prefixes (`feat:` / `fix:` / `refactor:`).
Update the status line in PROJECT.md / ROADMAP.md when done (Phase 5 complete,
Phase 6 = buff/modifier system next). Push so the human can share commit links.
