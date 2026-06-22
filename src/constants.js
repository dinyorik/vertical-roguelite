// All tunable constants + tiny pure math helpers. Leaf module: imports nothing.

// ---- Dimensions & timestep ----
export const VW = 360, VH = 640;       // virtual (logical) resolution, portrait
export const STEP = 1 / 60;            // fixed simulation step

// ---- Tile grid ----
export const TILE = 18;
export const COLS = Math.floor(VW / TILE);   // 20
export const ROWS = Math.floor(VH / TILE);   // 35
export const FLOOR = 0, WALL = 1;
export const HERO_R = 9;                      // agent collision radius (hero & enemies)
export const OBST_MARGIN = 2;                 // min floor gap kept around obstacles

// ---- Energy economy ----
export const ENERGY_REGEN_BASE = 8;    // energy/sec baseline regen
export const ENERGY_REGEN_RAMP = 14;   // extra energy/sec per second starved
export const ENERGY_REGEN_MAX  = 70;   // cap on regen rate
export const ORB_VALUE = 10;           // energy per pickup
export const ORB_MAGNET = 46;          // px: orbs within this drift to hero
export const ORB_PULL   = 170;         // px/sec orb drift speed

// ---- Environment hazards (barrels) ----
export const BARREL_HP = 1;            // hit-triggered
export const EXPLOSION_RADIUS = 64;    // px
export const EXPLOSION_DMG = 40;
export const BARREL_MIN = 2, BARREL_MAX = 4;
export const GAS_RADIUS = 46;          // poison cloud size (px)
export const GAS_DURATION = 4;         // cloud lifetime (s)
export const POISON_DURATION = 1.2;    // poison lingers this long after leaving the cloud
export const POISON_DPS = 12;          // poison damage per second

// ---- Round / waves ----
export const INTERMISSION_TIME = 10;
export const MINIWAVE_DELAY = 1.0;     // beat between mini-wave batches
export const MINIWAVE_MAX   = 5;       // cap on mini-waves per wave
export const HP_SCALE       = 0.15;    // enemy HP growth per wave: 1 + (wave-1)*HP_SCALE

// ---- Math helpers ----
export const ri = n => Math.floor(Math.random() * n);   // random int 0..n-1
// smallest absolute angle between two headings (handles wraparound)
export function angleDiff(a, b){ let d = Math.abs(a - b) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; return d; }
