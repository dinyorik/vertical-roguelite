// Tile map: generation, radius-aware connectivity, cell helpers, and the
// wall-respecting movement primitive. Owns `grid` (reassigned in blankGrid, read
// live by the renderer). Imports only constants — a low module nothing cycles
// through.
import { TILE, COLS, ROWS, FLOOR, WALL, HERO_R, OBST_MARGIN, ri } from './constants.js';

export let grid = [];

// pixel -> cell helpers. Out-of-bounds counts as WALL so edges need no special-casing.
export const cellOf = px => Math.floor(px / TILE);
function isWallCell(c, r){
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  return grid[r][c] === WALL;
}
export const isWallPx = (x, y) => isWallCell(cellOf(x), cellOf(y));
// circle vs walls: centre + 4 cardinal edge points (5 O(1) lookups).
export function circleHitsWall(x, y, r){
  return isWallPx(x, y)
      || isWallPx(x - r, y) || isWallPx(x + r, y)
      || isWallPx(x, y - r) || isWallPx(x, y + r);
}
export const cellCenter = (c, r) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });

// ---------- Map generation ----------
function blankGrid(){
  grid = [];
  for (let r = 0; r < ROWS; r++){
    const row = [];
    for (let c = 0; c < COLS; c++){
      const border = (c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1);
      row.push(border ? WALL : FLOOR);
    }
    grid.push(row);
  }
}
function carveSafeZone(c, r, rad){
  for (let y = Math.max(1, r - rad); y <= Math.min(ROWS - 2, r + rad); y++)
    for (let x = Math.max(1, c - rad); x <= Math.min(COLS - 2, c + rad); x++)
      grid[y][x] = FLOOR;
}
function regionAllFloor(c0, r0, c1, r1){
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++){
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
      if (grid[r][c] !== FLOOR) return false;
    }
  return true;
}
// Stamp one rect/L obstacle only if a clear floor margin surrounds it (passages
// stay >= OBST_MARGIN wide). Returns whether it placed.
function tryPlaceObstacle(){
  const w = 2 + ri(3), h = 2 + ri(3);
  const c0 = 1 + ri(COLS - 2 - w);
  const r0 = 1 + ri(ROWS - 2 - h);
  const m = OBST_MARGIN;
  if (!regionAllFloor(c0 - m, r0 - m, c0 + w - 1 + m, r0 + h - 1 + m)) return false;
  for (let r = r0; r < r0 + h; r++)
    for (let c = c0; c < c0 + w; c++)
      grid[r][c] = WALL;
  if (Math.random() < 0.5){
    const cw = 1 + ri(w - 1), ch = 1 + ri(h - 1);
    const cornerC = Math.random() < 0.5 ? c0 : c0 + w - cw;
    const cornerR = Math.random() < 0.5 ? r0 : r0 + h - ch;
    for (let r = cornerR; r < cornerR + ch; r++)
      for (let c = cornerC; c < cornerC + cw; c++)
        grid[r][c] = FLOOR;
  }
  return true;
}
// A cell is "standable" if a hero-radius circle centred in it doesn't touch a
// wall — same circleHitsWall the movement code uses, so gen and physics agree.
export function cellStandable(c, r, rad){
  const p = cellCenter(c, r);
  return !circleHitsWall(p.x, p.y, rad);
}
// Flood over STANDABLE cells (4-dir): where the hero can really go.
export function floodStandable(sc, sr, rad){
  const seen = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const cells = [];
  if (grid[sr][sc] !== FLOOR || !cellStandable(sc, sr, rad)) return { seen, cells };
  const stack = [[sc, sr]]; seen[sr][sc] = true;
  while (stack.length){
    const [c, r] = stack.pop(); cells.push([c, r]);
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (seen[nr][nc] || grid[nr][nc] !== FLOOR || !cellStandable(nc, nr, rad)) continue;
      seen[nr][nc] = true; stack.push([nc, nr]);
    }
  }
  return { seen, cells };
}
export function countStandable(rad){
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] === FLOOR && cellStandable(c, r, rad)) n++;
  return n;
}
// The hero may sit on a floor cell whose CENTRE is wall-adjacent; find the
// nearest standable cell (BFS) to flood from.
function standableStart(c, r, rad){
  const seen = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const q = [[c, r]];
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) seen[r][c] = true;
  while (q.length){
    const [cc, rr] = q.shift();
    if (cc>=0 && rr>=0 && cc<COLS && rr<ROWS && grid[rr][cc] === FLOOR && cellStandable(cc, rr, rad)) return [cc, rr];
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nc = cc+dc, nr = rr+dr;
      if (nc<0 || nr<0 || nc>=COLS || nr>=ROWS || seen[nr][nc]) continue;
      seen[nr][nc] = true; q.push([nc, nr]);
    }
  }
  return null;
}
// Build a radius-aware traversable map; returns standable+reachable cells.
export function generateMap(heroC, heroR){
  const want = 4 + ri(5);
  for (let attempt = 0; attempt < 40; attempt++){
    blankGrid();
    let placed = 0, tries = 0;
    while (placed < want && tries < 60){ tries++; if (tryPlaceObstacle()) placed++; }
    carveSafeZone(heroC, heroR, 2);
    const start = standableStart(heroC, heroR, HERO_R);
    if (!start) continue;
    const { cells } = floodStandable(start[0], start[1], HERO_R);
    if (cells.length === countStandable(HERO_R)) return cells;
  }
  blankGrid();
  carveSafeZone(heroC, heroR, 2);
  const s = standableStart(heroC, heroR, HERO_R) || [heroC, heroR];
  return floodStandable(s[0], s[1], HERO_R).cells;
}

// Move an entity by a (mx,my) unit vector, resolving against walls one axis at a
// time (slides along cover). Optional `speed` override (dash passes a higher one).
export function moveWithWalls(e, mx, my, dt, speed){
  const s = (speed === undefined) ? e.speed : speed;
  const nx = e.x + mx * s * dt;
  if (!circleHitsWall(nx, e.y, e.r)) e.x = nx;
  const ny = e.y + my * s * dt;
  if (!circleHitsWall(e.x, ny, e.r)) e.y = ny;
}
