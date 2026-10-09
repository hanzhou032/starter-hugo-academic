// One measured centerline supplies the paving, bridge, formations and headings.
export const BRIDGE = Object.freeze({ halfLength: 5.4, width: 4.3, angle: Math.PI / 4 });
const SQRT_HALF = Math.SQRT1_2;
const smooth = x => x * x * (3 - 2 * x);

export function createLane(height = () => 0) {
  const points = [];
  let length = 0;
  for (let i = 0; i <= 640; i++) {
    const s = -16 + i * .05;
    const blend = smooth(Math.max(0, (Math.abs(s) - 8) / 8));
    const end = s < 0 ? [-11.7, 10.5] : [11.6, -9.3];
    const sign = Math.sign(s);
    const x = s * SQRT_HALF + (end[0] - sign * 16 * SQRT_HALF) * blend;
    const z = -s * SQRT_HALF + (end[1] + sign * 16 * SQRT_HALF) * blend;
    if (i) length += Math.hypot(x - points[i - 1].x, z - points[i - 1].z);
    points.push({ x, z, distance: length });
  }
  const origin = points[320].distance;
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
  const startY = height(a.x, a.z) + .12, endY = height(b.x, b.z) + .12;
  function bridgeY(distance) {
    const u = Math.max(0, Math.min(1, (distance + BRIDGE.halfLength) / (BRIDGE.halfLength * 2)));
    return startY + (endY - startY) * u + Math.sin(u * Math.PI) * .58;
  }
  function surface(distance, lateral = 0) {
    if (Math.abs(distance) <= BRIDGE.halfLength) return bridgeY(distance);
    const p = sample(distance, lateral);
    return height(p.x, p.z) + .12;
  }
  return { min, max, length, sample, surface, bridgeY };
}
