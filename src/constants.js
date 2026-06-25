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
export const ENERGY_PER_KILL   = 12;   // energy granted INSTANTLY on each kill (no orb pickup)
export const DRAIN_TIME = 0.35;        // sec: cosmetic energy-drain fx flight enemy -> hero

// ---- Coins (the only ground drop) ----
export const COIN_VALUE  = 2;          // coins dropped per enemy kill (wallet currency)
export const COIN_MAGNET = 110;        // px: coins within this drift to hero (strong pull)
export const COIN_PULL   = 320;        // px/sec coin drift speed
export const COIN_SPIN   = 3.2;        // rad/sec: coin spin (cosmetic)

// ---- Feedback ----
export const HURT_FLASH = 0.3;         // sec: hero blink duration when taking damage

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
export const INTERMISSION_TIME = 30;   // generous: shopping takes time; NEXT button advances early
export const MINIWAVE_DELAY = 1.0;     // beat between mini-wave batches
export const MINIWAVE_MAX   = 5;       // cap on mini-waves per wave
export const HP_SCALE       = 0.15;    // enemy HP growth per wave: 1 + (wave-1)*HP_SCALE

// ---- Shop / economy ----
// price = ceil( SHOP_BASE[category] * SHOP_RATIO^(wave-1) ). Tuned by feel.
export const SHOP_BASE  = { potion: 12, perk: 28 };   // weapons join (priciest) in Phase 9
export const SHOP_RATIO = 1.25;

// ---- Math helpers ----
export const ri = n => Math.floor(Math.random() * n);   // random int 0..n-1
// smallest absolute angle between two headings (handles wraparound)
export function angleDiff(a, b){ let d = Math.abs(a - b) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; return d; }
