// One measured centerline supplies the paving, bridge, formations and headings.
export const BRIDGE = Object.freeze({ halfLength: 5.4, width: 4.3, angle: Math.PI / 4 });
const SQRT_HALF = Math.SQRT1_2;
const smooth = x => x * x * (3 - 2 * x);

export function createLane(height = () => 0) {
  const points = [];
  let length = 0;
  function add(x, z) {
    const previous = points.at(-1);
    if (previous) length += Math.hypot(x - previous.x, z - previous.z);
    points.push({ x, z, distance: length });
  }
  function curve(a, b, c, d, includeStart = true) {
    for (let i = includeStart ? 0 : 1; i <= 160; i++) {
      const t = i / 160, v = 1 - t;
      add(v ** 3 * a[0] + 3 * v * v * t * b[0] + 3 * v * t * t * c[0] + t ** 3 * d[0],
        v ** 3 * a[1] + 3 * v * v * t * b[1] + 3 * v * t * t * c[1] + t ** 3 * d[1]);
    }
  }
  // Courtyard exits avoid the solid chapel, gatehouse, Camera and its arcade.
  // Both approaches meet the bridge with its exact tangent.
  const join = BRIDGE.halfLength * SQRT_HALF;
  curve([-7.25, 8.6], [-6, 8.3], [-join - 1.65, join + 1.65], [-join, join]);
  const origin = length + BRIDGE.halfLength;
  for (let i = 1; i <= 216; i++) {
    const d = -BRIDGE.halfLength + i * .05;
    add(d * SQRT_HALF, -d * SQRT_HALF);
  }
  curve([join, -join], [join + 1.65, -join - 1.65], [7.1, -4], [8.5, -5], false);
  const min = -origin, max = length - origin;
  function sample(distance, lateral = 0) {
    const d = Math.max(0, Math.min(length, distance + origin));
    let lo = 0, hi = points.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].distance < d) lo = mid; else hi = mid; }
    const a = points[lo], b = points[hi], span = b.distance - a.distance;
    const u = (d - a.distance) / span, dx = (b.x - a.x) / span, dz = (b.z - a.z) / span;
    return { x: a.x + (b.x - a.x) * u - dz * lateral, z: a.z + (b.z - a.z) * u + dx * lateral, dx, dz };
  }
  const a = sample(-BRIDGE.halfLength), b = sample(BRIDGE.halfLength);
  function roadHeight(p) {
    return Math.max(...[-1.85, -.9, 0, .9, 1.85].map(offset => height(p.x - p.dz * offset, p.z + p.dx * offset))) + .12;
  }
  const startY = roadHeight(a), endY = roadHeight(b);
  function bridgeY(distance) {
    const u = Math.max(0, Math.min(1, (distance + BRIDGE.halfLength) / (BRIDGE.halfLength * 2)));
    return startY + (endY - startY) * u + Math.sin(u * Math.PI) * .58;
  }
  function surface(distance, lateral = 0) {
    if (Math.abs(distance) <= BRIDGE.halfLength) return bridgeY(distance);
    const p = sample(distance);
    const fromExit = Math.min(distance - min, max - distance);
    const ramp = 1 - smooth(Math.max(0, Math.min(1, fromExit / 2.4)));
    return roadHeight(p) + ramp * .36;
  }
  function formationLateral(distance, lateral) {
    const fromExit = Math.min(distance - min, max - distance);
    return lateral * (.23 + .77 * smooth(Math.max(0, Math.min(1, (fromExit - 1.3) / 3.4))));
  }
  function intersectsCorridor(x, z, radius = 0) {
    // Reserve the whole formation plus ears, swinging shovels and a small margin.
    const clearance = 2.15 + radius;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
      const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a.x - u * dx, z - a.z - u * dz) < clearance) return true;
    }
    return false;
  }
  return { min, max, length, sample, surface, bridgeY, formationLateral, intersectsCorridor };
}
