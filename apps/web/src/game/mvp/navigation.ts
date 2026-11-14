export type Point = { x: number; z: number };
export type Obstacle = { minX: number; maxX: number; minZ: number; maxZ: number };

export const BOUNDS = { minX: -5.82, maxX: 5.82, minZ: -10.9, maxZ: 8.75 };
export const MANICURE_Z = [6.1, 2.1, -1.9, -5.9] as const;

// Collision proxies follow the footprint of the V3 furniture, leaving the centre aisle open.
export const OBSTACLES: Obstacle[] = [
  { minX: -5.85, maxX: -3.15, minZ: 8.55, maxZ: 10.6 }, // reception
  ...MANICURE_Z.map((z) => ({ minX: -5.55, maxX: -3.05, minZ: z - 1.52, maxZ: z + 1.52 })),
  ...[6.125, 2.125, -1.875, -5.875].map((z) => ({ minX: 3.35, maxX: 5.85, minZ: z - 1.38, maxZ: z + 1.38 })),
  { minX: -4.3, maxX: .95, minZ: -10.9, maxZ: -8.6 }, // lounge
];

export function canStand(point: Point, radius = .3): boolean {
  if (point.x - radius < BOUNDS.minX || point.x + radius > BOUNDS.maxX || point.z - radius < BOUNDS.minZ || point.z + radius > BOUNDS.maxZ) return false;
  return OBSTACLES.every((o) => {
    const x = Math.max(o.minX, Math.min(point.x, o.maxX));
    const z = Math.max(o.minZ, Math.min(point.z, o.maxZ));
    return (point.x - x) ** 2 + (point.z - z) ** 2 >= radius ** 2;
  });
}

export function nearestStandable(point: Point): Point | null {
  if (canStand(point)) return point;
  for (let r = .4; r <= 2.8; r += .4) for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    const candidate = { x: point.x + Math.cos(a) * r, z: point.z + Math.sin(a) * r };
    if (canStand(candidate)) return candidate;
  }
  return null;
}

/** Check the entire swept route using the same clearance as player collision. */
export function canTravelDirectly(start: Point, end: Point): boolean {
  if (!canStand(start) || !canStand(end)) return false;
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const steps = Math.max(1, Math.ceil(distance / .1));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!canStand({ x: start.x + (end.x - start.x) * t, z: start.z + (end.z - start.z) * t })) return false;
  }
  return true;
}

/** Remove grid zigzags while keeping every segment clear of furniture. */
export function simplifyPath(start: Point, route: readonly Point[]): Point[] {
  const result: Point[] = [];
  let origin = start;
  for (let index = 0; index < route.length;) {
    let farthest = index;
    for (let candidate = route.length - 1; candidate > index; candidate--)
      if (canTravelDirectly(origin, route[candidate])) { farthest = candidate; break; }
    result.push(route[farthest]);
    origin = route[farthest];
    index = farthest + 1;
  }
  return result;
}

const CELL = .4;
const WIDTH = Math.ceil((BOUNDS.maxX - BOUNDS.minX) / CELL);
const HEIGHT = Math.ceil((BOUNDS.maxZ - BOUNDS.minZ) / CELL);
const toCell = (p: Point) => ({ x: Math.max(0, Math.min(WIDTH - 1, Math.round((p.x - BOUNDS.minX) / CELL))), z: Math.max(0, Math.min(HEIGHT - 1, Math.round((p.z - BOUNDS.minZ) / CELL))) });
const toPoint = (x: number, z: number): Point => ({ x: BOUNDS.minX + x * CELL, z: BOUNDS.minZ + z * CELL });
const key = (x: number, z: number) => z * WIDTH + x;

export function findPath(start: Point, requested: Point): Point[] {
  const goal = nearestStandable(requested);
  if (!goal) return [];
  if (canTravelDirectly(start, goal)) return [goal];
  const a = toCell(start), b = toCell(goal), startKey = key(a.x, a.z), goalKey = key(b.x, b.z);
  const open = new Set([startKey]), came = new Map<number, number>(), g = new Map([[startKey, 0]]), f = new Map([[startKey, Math.hypot(a.x - b.x, a.z - b.z)]]);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.size) {
    let current = -1, best = Infinity;
    for (const item of open) if ((f.get(item) ?? Infinity) < best) { current = item; best = f.get(item)!; }
    if (current === goalKey) {
      const result: Point[] = [goal];
      while (current !== startKey) { const x = current % WIDTH, z = Math.floor(current / WIDTH); result.push(toPoint(x, z)); current = came.get(current)!; }
      result.reverse(); return simplifyPath(start, result);
    }
    open.delete(current);
    const cx = current % WIDTH, cz = Math.floor(current / WIDTH);
    for (const [dx, dz] of directions) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= WIDTH || nz >= HEIGHT || !canStand(toPoint(nx, nz))) continue;
      if (dx && dz && (!canStand(toPoint(cx + dx, cz)) || !canStand(toPoint(cx, cz + dz)))) continue;
      const next = key(nx, nz), score = (g.get(current) ?? Infinity) + Math.hypot(dx, dz);
      if (score >= (g.get(next) ?? Infinity)) continue;
      came.set(next, current); g.set(next, score); f.set(next, score + Math.hypot(nx - b.x, nz - b.z)); open.add(next);
    }
  }
  return [];
}
