# ROADMAP — Vertical Roguelite

> Expands/supersedes section 7 of PROJECT.md. PROJECT.md holds the vision and
> rules — read it first. Systems are SKELETONS populated with 1–2 variants now;
> "add more later" is data. Cross-refs use phase NAMES, not numbers.

---

## Architecture we hold (every phase)

1. **Skeleton + data.** General system once; variants are data.
2. **Entity + systems.** Plain-object entities; behavior in systems by tag.
3. **Swappable enemy `brain`** — decides an action from an observation; a system
   applies it. RL policy drops into the same contract later. (Built; the RL seam.)
4. **One modifier machinery for buffs AND debuffs/status** — `entity.mods`,
   `modValue` at point of use, `sysMods` ticks durations + `onTick`. (Built;
   poison reuses it.)
5. **Reusable primitives** — projectile, cooldown, damaging zone, status-over-
   time, and input signals (one logic fed by keyboard OR on-screen controls).
6. **Tile grid** is the spatial substrate (hazards, positioning, radius-aware
   connectivity, future RL observation).

---

## Build order

### Phases 1–7 — DONE (merged)
1. **Combat core** — data-driven weapons (ranged + melee + swap), energy economy
   (ranged costs energy, melee free + blocks bullets, orbs, ramping regen). ✓
2. **Mobile control layer** — joystick + FIRE/SKILL/SWAP, multi-touch, overlay. ✓
3. **Hero dash** — ability skeleton + dash (i-frames, cooldown, wall-respecting). ✓
4. **Enemy archetypes + brain seam** — charger/kiter/heavy on the swappable brain. ✓
5. **Mini-waves + scaling** — sub-batches within a wave, depth scaling. ✓
6. **Buff/modifier system** — generic modifiers; big bullets, pierce. ✓
   - *Known constraint:* bullet collision is point-sampled; a raw projectile-SPEED
     buff past ~1000px/s would tunnel walls — if ever added, swept collision
     first. Radius ("big bullets") is unaffected.
7. **Environment hazards** — red barrel (AoE explosion, chains), green barrel
   (poison-gas zone via the modifier system, routes the death path). ✓

### Module split (refactor) — ✓ DONE
Break the single `game.html` into native ES modules — NO build step. Pure
refactor, ZERO behavior change. Constraint: native modules are blocked under
`file://`, so the game must be **served over http(s)** — GitHub Pages for mobile
testing (a URL instead of AirDropping a file), a local static server for desktop.
Shared mutable state (`entities`, `hero`, `round`, `ctx`) gets one home; watch for
circular imports. (Full detail in the split work order.)

### Phase 8 — Currency + shop — ✓ DONE (merged)
> Built: coins drop from every enemy via a generalized pickup (energy|coin) over
> the orb magnet/collect path + wallet + coin HUD; uncollected coins swept to the
> wallet at wave end. Intermission split into a free mini-pick (3 of 4 small
> upgrades, pick 1) + a paid shop (`shop.js`: data items w/ category, geometric
> price, apply; perks via addMod + instant potions) with a NEXT WAVE button.
> New perks: Swift (moveSpeed), Poison/Blast immunity (checked at damage sites).
> Tunables in constants.js (COIN_VALUE, SHOP_BASE, SHOP_RATIO, INTERMISSION_TIME=30).
> Verified headless in Node (59 checks). Shop pool is ready to stock weapons (P9).
- Coins drop from enemies (reuse the orb/magnet pattern); a wallet + coin HUD.
- Restructure the between-wave INTERMISSION into TWO tracks:
  - **Free mini-pick** (1 of 3, kept SMALL): heal, +small damage, +small max-HP,
    +small max-energy.
  - **Shop** (paid): 3 random items from any category. Initially stocks **perks**
    (permanent modifiers: big bullets, faster fire, +move speed, poison immunity,
    explosion immunity, pierce) and **potions** (full-heal, full-energy). Weapons
    join the stock in Phase 9.
- Pricing: per-category base × **geometric** factor by wave number. Tunable.
- Note: big bullets + fire-rate move OUT of the (now mini) free pick INTO paid
  perks; the free pick narrows to the four mini upgrades above.

### Phase 9 — New weapon types — NEXT
- Four buyable weapons (sold in the shop): **laser** (one long straight beam),
  **shotgun** (wide spread, short range), **bow** (charge-up: hold to charge
  through ~5 VISIBLE ticks, release to fire; longer hold = more damage + accuracy),
  **hammer** (melee, AoE circle on the ground in front, short wind-up).
- **Inventory: rolling 2 slots, FIFO.** Start with 1 weapon; buying a 2nd lets you
  swap 1↔2; buying a 3rd evicts the oldest (swap 2↔3). At most 2 held.
- **Design note (flagged):** because melee and ranged share the 2 slots, a player
  can end up with NO melee — losing the bullet-block/shield, not just the free
  fallback. Treated as intentional loadout depth (defensive melee vs glass-cannon
  two-ranged). Resolve starting-weapon choice + tuning when speccing this phase.

---

## Deferred entirely (NOT now)

- **RL agent** — trained offline, separately, once the game is nearly complete with
  the dumb scripted brains. Seam built (enemy-archetypes phase). *Perf note:* if
  training runs the JS sim headless in Node, per-step allocations (per-enemy `ctx`,
  `entities.filter()` each frame) become GC pressure over millions of steps; reuse
  `ctx` and swap-remove instead of filter when building the loop.
- **Bosses.**
- **Multi-room / dungeon generation / floors going up.**
- **Multiple selectable heroes** — skeleton ready (the ability phase), 1 now.
- **Traps, destructible terrain** — cut.

(Currency + new weapons were here as "cut"; now planned as Phases 8–9 above.)

---

## Keeping this coherent
PROJECT.md + this ROADMAP.md are the shared memory across chats. Any chat reads
both before acting; whoever changes scope/status updates them immediately. Stale
docs break the whole approach.
