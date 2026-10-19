// Glass-style shatter pattern: rays out of the impact point, crossed by
// jittered rings. Pure geometry (no DOM), so it's unit-testable and cheap.

export type Point = readonly [number, number];

export interface Shard {
  /** Polygon in the rect's local coordinates. May extend past the rect. */
  points: Point[];
  /** Centroid of the visible part (clamped to the rect). */
  cx: number;
  cy: number;
  /** Distance of the centroid from the impact point, 0–1 of the max. */
  near: number;
}

export interface ShatterOptions {
  rays?: number;
  rings?: number;
  rng?: () => number;
}

/** Shatter a w×h rect around (ox, oy). Shards that miss the rect entirely are dropped. */
export function shatter(w: number, h: number, ox: number, oy: number, opts: ShatterOptions = {}): Shard[] {
  const rng = opts.rng ?? Math.random;
  const rays = opts.rays ?? 8;
  const rings = opts.rings ?? 3;
  const x0 = Math.min(Math.max(ox, 0), w);
  const y0 = Math.min(Math.max(oy, 0), h);
  // Farthest corner: the last ring must clear it.
  const far = Math.max(Math.hypot(x0, y0), Math.hypot(w - x0, y0), Math.hypot(x0, h - y0), Math.hypot(w - x0, h - y0), 1);

  const start = rng() * Math.PI * 2;
  const angles: number[] = [];
  for (let k = 0; k < rays; k++) angles.push(start + ((k + 0.25 + rng() * 0.5) / rays) * Math.PI * 2);

  // Ring radii grow geometrically so pieces near the impact are small.
  const radii: number[] = [0];
  for (let j = 1; j <= rings; j++) radii.push(j === rings ? far * 1.6 : far * Math.pow(j / rings, 1.6) * (0.85 + rng() * 0.3));

  // Shared vertex grid so neighbors line up exactly (no gaps between shards).
  const grid: Point[][] = angles.map((a) =>
    radii.map((r, j) => {
      const rr = j === 0 || j === rings ? r : r * (0.82 + rng() * 0.36);
      return [x0 + Math.cos(a) * rr, y0 + Math.sin(a) * rr] as Point;
    }),
  );

  const shards: Shard[] = [];
  for (let k = 0; k < rays; k++) {
    const a = grid[k]!;
    const b = grid[(k + 1) % rays]!;
    for (let j = 0; j < rings; j++) {
      const points: Point[] = j === 0 ? [[x0, y0], a[1]!, b[1]!] : [a[j]!, b[j]!, b[j + 1]!, a[j + 1]!];
      const shard = visibleCentroid(points, w, h);
      if (!shard) continue;
      shards.push({ points, cx: shard[0], cy: shard[1], near: Math.min(1, Math.hypot(shard[0] - x0, shard[1] - y0) / far) });
    }
  }
  return shards;
}

/** Approximate centroid of a convex polygon clipped to [0,w]×[0,h]; null if it misses. */
function visibleCentroid(points: Point[], w: number, h: number): Point | null {
  const clipped = clipToRect(points, w, h);
  if (clipped.length < 3) return null;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < clipped.length; i++) {
    const [x1, y1] = clipped[i]!;
    const [x2, y2] = clipped[(i + 1) % clipped.length]!;
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(area) < 4) return null; // Slivers aren't worth a DOM clone.
  return [cx / (3 * area), cy / (3 * area)];
}

/** Sutherland–Hodgman against the rect. */
function clipToRect(points: Point[], w: number, h: number): Point[] {
  const edges: Array<[(p: Point) => boolean, (a: Point, b: Point) => Point]> = [
    [(p) => p[0] >= 0, (a, b) => lerpAt(a, b, (0 - a[0]) / (b[0] - a[0]))],
    [(p) => p[0] <= w, (a, b) => lerpAt(a, b, (w - a[0]) / (b[0] - a[0]))],
    [(p) => p[1] >= 0, (a, b) => lerpAt(a, b, (0 - a[1]) / (b[1] - a[1]))],
    [(p) => p[1] <= h, (a, b) => lerpAt(a, b, (h - a[1]) / (b[1] - a[1]))],
  ];
  let out = points;
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cut(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

function lerpAt(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
